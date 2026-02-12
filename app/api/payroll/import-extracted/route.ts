import { NextResponse } from 'next/server'
export const runtime = 'nodejs'
import { createClient } from '@/lib/supabase/server'
import { createPayrollItemAdmin, updatePayrollItemAdmin } from '@/lib/services/data-service'
import type { PayrollItem } from '@/types'
import {
  parseTextPayslips,
  matchEmployee,
  type ParsedPayslip,
} from '@/lib/pdf-parser'

// ---------------------------------------------------------------------------
// POST /api/payroll/import-extracted
// Importa dados previamente extraidos (JSON com pages[]).
// Util quando o texto ja foi extraido externamente.
// ---------------------------------------------------------------------------

function buildPayload(
  ps: ParsedPayslip,
  employee: any,
  existingItem: any | null,
  month: number,
  year: number,
): Omit<PayrollItem, 'id'> {
  const grossSalary = ps.totalGross || 0
  const totalDeductions = ps.totalDeductions || 0
  const netSalary = ps.netSalary || (grossSalary - totalDeductions)

  const customEvents = ps.events.length > 0
    ? ps.events.map(e => ({
        id: e.id,
        description: e.code ? `[${e.code}] ${e.description}` : e.description,
        type: e.type as 'provento' | 'desconto',
        value: e.value,
      }))
    : undefined

  return {
    employeeId: employee.id,
    employeeName: employee.name,
    month,
    year,
    storeId: employee.store_id,
    positionId: employee.position_id,
    baseSalary: ps.baseSalary || 0,
    commissions: ps.commissions || 0,
    employeePurchases: ps.employeePurchases || 0,
    vouchers: ps.vouchers || 0,
    advances: ps.advances || 0,
    inss: ps.inss || 0,
    fgts: ps.fgts || 0,
    grossSalary,
    totalDeductions,
    netSalary,
    paymentType: existingItem?.payment_type || 'contabil',
    status: existingItem?.status || 'pending',
    customEvents,
  }
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

    const body = await request.json()
    const pages: string[] = Array.isArray(body?.pages) ? body.pages : []
    const monthParam = body?.month
    const yearParam = body?.year

    if (!pages || pages.length === 0) {
      return NextResponse.json({ error: 'JSON com pages[] ausente' }, { status: 400 })
    }

    const text = pages.join('\n\n')
    const result = await parseTextPayslips(text)

    if (result.payslips.length === 0) {
      return NextResponse.json({ error: 'Nao foi possivel extrair dados do JSON (layout nao reconhecido).' }, { status: 422 })
    }

    const month = monthParam
      ? parseInt(String(monthParam), 10)
      : (result.competence.month || new Date().getMonth() + 1)
    const year = yearParam
      ? parseInt(String(yearParam), 10)
      : (result.competence.year || new Date().getFullYear())

    // Buscar funcionarios
    const { data: employeesData } = await supabase.from('employees').select('*')
    const employees = employeesData || []
    const cpfMap = new Map<string, any>()
    for (const e of employees) {
      if (e.cpf) cpfMap.set(String(e.cpf).replace(/[^\d]/g, ''), e)
    }

    const results: Array<{ employeeId: string; name: string; action: 'created' | 'updated'; netSalary: number }> = []
    const unmatched: Array<{ name?: string; cpf?: string }> = []

    for (const ps of result.payslips) {
      const employee = matchEmployee(ps, employees, cpfMap)

      if (!employee) {
        unmatched.push({ name: ps.name, cpf: ps.cpf })
        continue
      }

      const { data: existing } = await supabase
        .from('payroll_items')
        .select('*')
        .eq('employee_id', employee.id)
        .eq('month', month)
        .eq('year', year)
        .limit(1)
      const existingItem = existing && existing.length > 0 ? existing[0] : null

      const payload = buildPayload(ps, employee, existingItem, month, year)

      if (existingItem) {
        const updated = await updatePayrollItemAdmin(String(existingItem.id), payload)
        results.push({
          employeeId: updated.employeeId || employee.id,
          name: updated.employeeName || employee.name,
          action: 'updated',
          netSalary: updated.netSalary || ps.netSalary,
        })
      } else {
        const created = await createPayrollItemAdmin(payload)
        results.push({
          employeeId: created.employeeId || employee.id,
          name: created.employeeName || employee.name,
          action: 'created',
          netSalary: created.netSalary || ps.netSalary,
        })
      }
    }

    return NextResponse.json({
      total: results.length,
      created: results.filter(r => r.action === 'created').length,
      updated: results.filter(r => r.action === 'updated').length,
      items: results,
      rowsParsed: result.payslips.length,
      unmatchedCount: unmatched.length,
      unmatched: unmatched.slice(0, 10),
      month,
      year,
    }, { status: 200 })
  } catch (error) {
    return NextResponse.json({
      error: 'Falha ao importar JSON extraido',
      details: error instanceof Error ? error.message : String(error),
    }, { status: 500 })
  }
}
