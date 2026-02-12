import { NextResponse } from 'next/server'
export const runtime = 'nodejs'
import { createClient } from '@/lib/supabase/server'
import { createRequire } from 'module'
import { createPayrollItemAdmin, updatePayrollItemAdmin } from '@/lib/services/data-service'
import type { PayrollItem } from '@/types'
import { loadRubricas, getRubricaTypeSync } from '@/lib/rubricas'
import { normalizeText, normalizeName, parseMoney, matchEmployee } from '@/lib/pdf-parser'

// ---------------------------------------------------------------------------
// POST /api/payroll/import-sheet
// Importa planilha XLSX/XLS/CSV com dados de folha de pagamento.
// ---------------------------------------------------------------------------

type ParsedRow = {
  name?: string
  cpf?: string
  baseSalary?: number
  commissions?: number
  employeePurchases?: number
  vouchers?: number
  advances?: number
  inss?: number
  fgts?: number
  events?: Array<{ id: string; description: string; type: 'provento' | 'desconto'; value: number }>
  pdfGross?: number
  pdfDiscounts?: number
  pdfNet?: number
}

function keyForHeader(h: string): string {
  const n = normalizeText(h)
  if (/\bcpf\b/.test(n)) return 'cpf'
  if (/\bnome\b|\bfuncionari[oa]\b|\bcolaborador\b|\bempregad[oa]\b/.test(n)) return 'name'
  if (/\bsal(?:a|\u00e1)rio\s*base\b|\bbase\b/.test(n)) return 'baseSalary'
  if (/\bcomiss|vendas|premio|bonifica|produtivid|premia/.test(n)) return 'commissions'
  if (/\bcompras?\b|mercador|consumo|convenio/.test(n)) return 'employeePurchases'
  if (/\birrf\b|imposto\s+de\s+renda|imp\s*ren/.test(n)) return 'vouchers'
  if (/\badiantamento\b/.test(n)) return 'advances'
  if (/\binss\b|previd|contribuicao\s+previdenc/.test(n)) return 'inss'
  if (/\bfgts\b|f\.?g\.?t\.?s\b|fundo\s+de\s+garantia/.test(n)) return 'fgts'
  if (/\btotal\s+(de\s+)?(vencimentos|proventos)|\bbruto\b/.test(n)) return 'pdfGross'
  if (/\btotal\s+(de\s+)?descontos?/.test(n)) return 'pdfDiscounts'
  if (/\bliquido\b|valor\s+liquido/.test(n)) return 'pdfNet'
  if (/\bmes\b|m[e\u00ea]s|compet[e\u00ea]ncia/.test(n)) return 'month'
  if (/\bano\b/.test(n)) return 'year'
  return ''
}

function parseSheetRows(XLSX: any, wb: any): { rows: ParsedRow[]; month?: number; year?: number } {
  const rows: ParsedRow[] = []
  let monthGlobal: number | undefined
  let yearGlobal: number | undefined
  for (const sheetName of wb.SheetNames) {
    const sheet = wb.Sheets[sheetName]
    const json: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' })
    for (const row of json) {
      const keys = Object.keys(row)
      const values: Record<string, any> = {}
      const events: Array<{ id: string; description: string; type: 'provento' | 'desconto'; value: number }> = []
      for (const k of keys) {
        const kk = keyForHeader(k)
        const val = row[k]
        if (kk) {
          values[kk] = val
          continue
        }
        const num = parseMoney(val)
        if (!num || num <= 0) continue
        const typeByRubrica = getRubricaTypeSync(k)
        if (typeByRubrica === 'base') {
          values.baseSalary = (parseMoney(values.baseSalary) || 0) > 0 ? values.baseSalary : num
          continue
        }
        if (typeByRubrica === 'fgts' || typeByRubrica === 'informativa') {
          values.fgts = (parseMoney(values.fgts) || 0) + num
          continue
        }
        if (typeByRubrica === 'provento') {
          events.push({ id: `e-${events.length}`, description: k, type: 'provento', value: num })
          continue
        }
        if (typeByRubrica === 'desconto') {
          events.push({ id: `e-${events.length}`, description: k, type: 'desconto', value: num })
          continue
        }
        events.push({ id: `e-${events.length}`, description: k, type: 'provento', value: num })
      }
      const r: ParsedRow = {
        name: values.name ? String(values.name).trim() : undefined,
        cpf: values.cpf ? String(values.cpf).trim() : undefined,
        baseSalary: parseMoney(values.baseSalary) || undefined,
        commissions: parseMoney(values.commissions) || undefined,
        employeePurchases: parseMoney(values.employeePurchases) || undefined,
        vouchers: parseMoney(values.vouchers) || undefined,
        advances: parseMoney(values.advances) || undefined,
        inss: parseMoney(values.inss) || undefined,
        fgts: parseMoney(values.fgts) || undefined,
        events: events.length ? events : undefined,
        pdfGross: parseMoney(values.pdfGross) || undefined,
        pdfDiscounts: parseMoney(values.pdfDiscounts) || undefined,
        pdfNet: parseMoney(values.pdfNet) || undefined,
      }
      const m = parseInt(String(values.month || ''), 10)
      const y = parseInt(String(values.year || ''), 10)
      if (!isNaN(m) && m >= 1 && m <= 12) monthGlobal = monthGlobal || m
      if (!isNaN(y)) yearGlobal = yearGlobal || y
      rows.push(r)
    }
  }
  return { rows, month: monthGlobal, year: yearGlobal }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: authData } = await supabase.auth.getUser()
    const uid = authData?.user?.id
    let role = authData?.user?.user_metadata?.role as string | undefined
    if (!role && uid) {
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', uid).single()
      role = profile?.role as string | undefined
    }
    const allowed = new Set(['admin', 'hr', 'finance', 'manager'])
    if (!role || !allowed.has(String(role))) {
      return NextResponse.json({ error: 'Unauthorized: role required (admin/hr/finance)' }, { status: 403 })
    }
    const formData = await request.formData()
    const file = formData.get('file')
    const monthParam = formData.get('month')
    const yearParam = formData.get('year')
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Arquivo de planilha ausente' }, { status: 400 })
    }
    const buf = Buffer.from(await file.arrayBuffer())
    const require = createRequire(import.meta.url)
    const XLSXMod = require('xlsx')
    if (!XLSXMod) {
      return NextResponse.json({ error: 'Dependencia XLSX ausente' }, { status: 500 })
    }
    await loadRubricas()
    const wb = XLSXMod.read(buf, { type: 'buffer' })
    const parsed = parseSheetRows(XLSXMod, wb)
    const inferredMonth = parsed.month
    const inferredYear = parsed.year
    const month = monthParam ? parseInt(String(monthParam), 10) : (inferredMonth || new Date().getMonth() + 1)
    const year = yearParam ? parseInt(String(yearParam), 10) : (inferredYear || new Date().getFullYear())
    const rows = parsed.rows.filter(r => {
      const nums = [
        r.baseSalary, r.commissions, r.employeePurchases, r.vouchers, r.advances,
        r.inss, r.fgts, r.pdfGross, r.pdfDiscounts, r.pdfNet
      ]
      const hasNumeric = nums.some(v => typeof v === 'number' && v > 0)
      const hasEvents = Array.isArray(r.events) && r.events.some(e => typeof e.value === 'number' && e.value > 0)
      return Boolean(r.name) || Boolean(r.cpf) || hasNumeric || hasEvents
    })
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Planilha sem dados reconhecidos' }, { status: 422 })
    }

    // Buscar funcionarios
    const { data: employeesData } = await supabase.from('employees').select('*')
    const employees = employeesData || []
    const cpfMap = new Map<string, any>()
    for (const e of employees) {
      if ((e as any).cpf) cpfMap.set(String((e as any).cpf).replace(/[^\d]/g, ''), e)
    }

    const results: Array<{ employeeId: string; name: string; action: 'created' | 'updated'; netSalary: number }> = []
    const unmatched: Array<{ name?: string; cpf?: string }> = []
    const divergences: Array<{ employeeId?: string; name?: string; calcNet: number; pdfNet: number; diff: number }> = []

    for (const row of rows) {
      const employee = matchEmployee(
        { name: row.name, cpf: row.cpf },
        employees,
        cpfMap,
      )

      if (!employee) {
        unmatched.push({ name: row.name, cpf: row.cpf })
        continue
      }

      const { data: existing } = await supabase
        .from('payroll_items')
        .select('*')
        .eq('employee_id', employee.id)
        .eq('month', month)
        .eq('year', year)
        .limit(1)
      const item = existing && existing.length > 0 ? existing[0] : null
      const baseSalary = row.baseSalary && row.baseSalary > 0 ? row.baseSalary : 0
      const commissions = row.commissions || (item ? Number(item.commissions || 0) : 0)
      const employeePurchases = row.employeePurchases || (item ? Number(item.employee_purchases || 0) : 0)
      const vouchers = row.vouchers || (item ? Number(item.vouchers || 0) : 0)
      const advances = row.advances || (item ? Number(item.advances || 0) : 0)
      const inss = row.inss || (item ? Number(item.inss || 0) : 0)
      const fgts = row.fgts || (item ? Number(item.fgts || 0) : 0)
      const eventProventos = (row.events || []).filter(e => e.type === 'provento').reduce((s, e) => s + e.value, 0)
      const eventDescontos = (row.events || []).filter(e => e.type === 'desconto').reduce((s, e) => s + e.value, 0)
      let grossSalary = commissions + eventProventos
      let totalDeductions = employeePurchases + vouchers + advances + inss + eventDescontos
      let netSalary = grossSalary - totalDeductions
      if (typeof row.pdfGross === 'number' && typeof row.pdfDiscounts === 'number' && row.pdfGross > 0 && row.pdfDiscounts > 0) {
        grossSalary = row.pdfGross
        totalDeductions = row.pdfDiscounts
        netSalary = typeof row.pdfNet === 'number' && row.pdfNet > 0 ? row.pdfNet : grossSalary - totalDeductions
      }
      if (typeof row.pdfNet === 'number' && Math.abs(netSalary - row.pdfNet) > 1) {
        divergences.push({ employeeId: employee.id, name: employee.name, calcNet: netSalary, pdfNet: row.pdfNet, diff: Number((netSalary - row.pdfNet).toFixed(2)) })
      }
      const payload: Omit<PayrollItem, 'id'> = {
        employeeId: employee.id,
        employeeName: employee.name,
        month,
        year,
        storeId: employee.store_id,
        positionId: employee.position_id,
        baseSalary,
        commissions,
        employeePurchases,
        vouchers,
        advances,
        inss,
        fgts,
        grossSalary,
        totalDeductions,
        netSalary,
        paymentType: item?.payment_type || 'contabil',
        status: item?.status || 'pending',
        customEvents: row.events && row.events.length > 0 ? row.events.map(e => ({ id: e.id, description: e.description, type: e.type, value: e.value })) : undefined,
      }
      if (item) {
        const updated = await updatePayrollItemAdmin(String(item.id), payload)
        results.push({ employeeId: updated.employeeId || employee.id, name: updated.employeeName || employee.name, action: 'updated', netSalary: updated.netSalary || netSalary })
      } else {
        const created = await createPayrollItemAdmin(payload)
        results.push({ employeeId: created.employeeId || employee.id, name: created.employeeName || employee.name, action: 'created', netSalary: created.netSalary || netSalary })
      }
    }
    return NextResponse.json({
      total: results.length,
      created: results.filter(r => r.action === 'created').length,
      updated: results.filter(r => r.action === 'updated').length,
      items: results,
      rowsParsed: rows.length,
      unmatchedCount: unmatched.length,
      unmatched: unmatched.slice(0, 10),
      divergencesCount: divergences.length,
      divergences: divergences.slice(0, 10),
      month,
      year,
    }, { status: 200 })
  } catch (error) {
    return NextResponse.json({
      error: 'Falha ao importar planilha',
      details: error instanceof Error ? error.message : String(error),
    }, { status: 500 })
  }
}
