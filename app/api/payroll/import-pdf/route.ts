import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createPayrollItem, updatePayrollItem } from '@/lib/services/data-service'
import type { PayrollItem } from '@/types'

function normalizeText(s: string) {
  return s.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

function parseMoney(input: string): number {
  const s = input.replace(/\s/g, '').replace(/\./g, '').replace(',', '.').replace(/[^\d\.-]/g, '')
  const n = parseFloat(s)
  return isNaN(n) ? 0 : n
}

function detectCompetence(text: string): { month?: number; year?: number } {
  const months = [
    { rx: /janeiro/i, value: 1 },
    { rx: /fevereiro/i, value: 2 },
    { rx: /marco|mar\u00e7o/i, value: 3 },
    { rx: /abril/i, value: 4 },
    { rx: /maio/i, value: 5 },
    { rx: /junho/i, value: 6 },
    { rx: /julho/i, value: 7 },
    { rx: /agosto/i, value: 8 },
    { rx: /setembro/i, value: 9 },
    { rx: /outubro/i, value: 10 },
    { rx: /novembro/i, value: 11 },
    { rx: /dezembro/i, value: 12 },
  ]
  const m = text.match(/(\d{1,2})\s*[\/\-]\s*(\d{4})/)
  if (m) {
    const month = parseInt(m[1], 10)
    const year = parseInt(m[2], 10)
    if (month >= 1 && month <= 12) return { month, year }
  }
  for (const mm of months) {
    const found = text.match(mm.rx)
    if (found) {
      const y = text.match(/(20\d{2})/)
      return { month: mm.value, year: y ? parseInt(y[1], 10) : undefined }
    }
  }
  return {}
}

type ParsedRow = {
  name?: string
  cpf?: string
  commissions?: number
  employeePurchases?: number
  vouchers?: number
  inss?: number
  fgts?: number
}

function parseRows(text: string): ParsedRow[] {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  const normLines = lines.map(normalizeText)
  let headerIdx = -1
  for (let i = 0; i < normLines.length; i++) {
    const l = normLines[i]
    if (l.includes('nome') && (l.includes('comiss') || l.includes('compras') || l.includes('imposto') || l.includes('inss'))) {
      headerIdx = i
      break
    }
  }
  if (headerIdx >= 0) {
    const header = lines[headerIdx]
    const headerCols = header.split(/\s{2,}|\t/g).map(c => normalizeText(c))
    const idxNome = headerCols.findIndex(c => c.includes('nome'))
    const idxComiss = headerCols.findIndex(c => c.includes('comiss'))
    const idxCompras = headerCols.findIndex(c => c.includes('compra'))
    const idxImposto = headerCols.findIndex(c => c.includes('imposto') || c.includes('ir') || c.includes('renda') || c.includes('vale'))
    const idxInss = headerCols.findIndex(c => c.includes('inss'))
    const idxFgts = headerCols.findIndex(c => c.includes('fgts'))
    const out: ParsedRow[] = []
    for (let i = headerIdx + 1; i < lines.length; i++) {
      const row = lines[i]
      const cols = row.split(/\s{2,}|\t/g).map(c => c.trim()).filter(Boolean)
      if (cols.length < 2) continue
      const name = idxNome >= 0 && idxNome < cols.length ? cols[idxNome] : cols[0]
      const r: ParsedRow = { name }
      if (idxComiss >= 0 && idxComiss < cols.length) r.commissions = parseMoney(cols[idxComiss])
      if (idxCompras >= 0 && idxCompras < cols.length) r.employeePurchases = parseMoney(cols[idxCompras])
      if (idxImposto >= 0 && idxImposto < cols.length) r.vouchers = parseMoney(cols[idxImposto])
      if (idxInss >= 0 && idxInss < cols.length) r.inss = parseMoney(cols[idxInss])
      if (idxFgts >= 0 && idxFgts < cols.length) r.fgts = parseMoney(cols[idxFgts])
      const cpfMatch = row.match(/\b\d{3}\.\d{3}\.\d{3}\-\d{2}\b/)
      if (cpfMatch) r.cpf = cpfMatch[0]
      out.push(r)
    }
    if (out.length > 0) return out
  }
  const groups: string[][] = []
  let current: string[] = []
  for (const l of lines) {
    if (!l.trim()) {
      if (current.length > 0) {
        groups.push(current)
        current = []
      }
    } else {
      current.push(l)
    }
  }
  if (current.length > 0) groups.push(current)
  const result: ParsedRow[] = []
  for (const g of groups) {
    const joined = g.join(' ')
    const cpfMatch = joined.match(/\b\d{3}\.\d{3}\.\d{3}\-\d{2}\b/)
    const nameMatch = joined.match(/nome[:\s]*([A-Za-z\u00C0-\u017F\s]+)/i)
    const r: ParsedRow = {}
    if (nameMatch) r.name = nameMatch[1].trim()
    if (cpfMatch) r.cpf = cpfMatch[0]
    const comMatch = joined.match(/comiss(?:ao|oes)?[:\s]*([\d\.\,]+)/i)
    const compMatch = joined.match(/compras?[:\s]*([\d\.\,]+)/i)
    const irMatch = joined.match(/(imposto(?:\s+de)?\s+renda|ir|vale)[:\s]*([\d\.\,]+)/i)
    const inssMatch = joined.match(/inss[:\s]*([\d\.\,]+)/i)
    const fgtsMatch = joined.match(/fgts[:\s]*([\d\.\,]+)/i)
    if (comMatch) r.commissions = parseMoney(comMatch[1])
    if (compMatch) r.employeePurchases = parseMoney(compMatch[1])
    if (irMatch) r.vouchers = parseMoney(irMatch[2])
    if (inssMatch) r.inss = parseMoney(inssMatch[1])
    if (fgtsMatch) r.fgts = parseMoney(fgtsMatch[1])
    if (Object.keys(r).length > 0) result.push(r)
  }
  return result
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file')
    const monthParam = formData.get('month')
    const yearParam = formData.get('year')
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Arquivo PDF ausente' }, { status: 400 })
    }
    if (!file.type.includes('pdf')) {
      return NextResponse.json({ error: 'Tipo de arquivo invalido' }, { status: 400 })
    }
    const buf = Buffer.from(await file.arrayBuffer())
    const pdfModule = await import('pdf-parse')
    const pdfParse = (pdfModule as any).default || (pdfModule as any)
    const parsed = await pdfParse(buf)
    const text = parsed.text || ''
    const competence = detectCompetence(text)
    const month = monthParam ? parseInt(String(monthParam), 10) : (competence.month || new Date().getMonth() + 1)
    const year = yearParam ? parseInt(String(yearParam), 10) : (competence.year || new Date().getFullYear())
    const rows = parseRows(text)
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Nao foi possivel extrair dados do PDF' }, { status: 422 })
    }
    const supabase = await createClient()
    const { data: employeesData } = await supabase.from('employees').select('*')
    const employees = employeesData || []
    const cpfMap = new Map<string, any>()
    for (const e of employees) {
      if (e.cpf) {
        const k = String(e.cpf).replace(/[^\d]/g, '')
        cpfMap.set(k, e)
      }
    }
    const results: Array<{ employeeId: string; name: string; action: 'created' | 'updated'; netSalary: number }> = []
    for (const row of rows) {
      let employee: any = null
      if (row.cpf) {
        const key = row.cpf.replace(/[^\d]/g, '')
        employee = cpfMap.get(key) || null
      }
      if (!employee && row.name) {
        const n = normalizeText(row.name)
        employee = employees.find(e => normalizeText(e.name || '') === n) || null
      }
      if (!employee) continue
      const { data: existing } = await supabase
        .from('payroll_items')
        .select('*')
        .eq('employee_id', employee.id)
        .eq('month', month)
        .eq('year', year)
        .limit(1)
      const item = existing && existing.length > 0 ? existing[0] : null
      let baseSalary = 0
      if (item && typeof item.base_salary === 'number') {
        baseSalary = Number(item.base_salary)
      } else if (employee.position_id) {
        const { data: position } = await supabase
          .from('positions')
          .select('*')
          .eq('id', employee.position_id)
          .single()
        baseSalary = Number(position?.base_salary || 0)
      }
      const commissions = row.commissions || (item ? Number(item.commissions || 0) : 0)
      const employeePurchases = row.employeePurchases || (item ? Number(item.employee_purchases || 0) : 0)
      const vouchers = row.vouchers || (item ? Number(item.vouchers || 0) : 0)
      const advances = item ? Number(item.advances || 0) : 0
      const inss = row.inss || (item ? Number(item.inss || 0) : 0)
      const fgts = row.fgts || (item ? Number(item.fgts || 0) : 0)
      const grossSalary = baseSalary + commissions
      const totalDeductions = employeePurchases + vouchers + advances + inss
      const netSalary = grossSalary - totalDeductions
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
      }
      if (item) {
        const updated = await updatePayrollItem(String(item.id), payload)
        results.push({ employeeId: updated.employeeId || employee.id, name: updated.employeeName || employee.name, action: 'updated', netSalary: updated.netSalary || netSalary })
      } else {
        const created = await createPayrollItem(payload)
        results.push({ employeeId: created.employeeId || employee.id, name: created.employeeName || employee.name, action: 'created', netSalary: created.netSalary || netSalary })
      }
    }
    const summary = {
      total: results.length,
      created: results.filter(r => r.action === 'created').length,
      updated: results.filter(r => r.action === 'updated').length,
      items: results,
      month,
      year,
    }
    return NextResponse.json(summary, { status: 200 })
  } catch (error) {
    console.error('Error importing payroll from PDF:', error)
    return NextResponse.json({ error: 'Falha ao importar PDF' }, { status: 500 })
  }
}
