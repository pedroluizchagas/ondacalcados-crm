import { NextResponse } from 'next/server'
export const runtime = 'nodejs'
import { createClient } from '@/lib/supabase/server'
import {
  parsePdfBuffer,
  matchEmployee,
  normalizeName,
  type ParsedPayslip,
} from '@/lib/pdf-parser'

// ---------------------------------------------------------------------------
// POST /api/payroll/import-analyze
// Analisa PDF e retorna preview dos dados extraidos (sem salvar no banco).
// ---------------------------------------------------------------------------

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

    // Aceita multipart/form-data com arquivo PDF
    const contentType = request.headers.get('content-type') || ''
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json({ error: 'Content-Type deve ser multipart/form-data' }, { status: 400 })
    }

    const formData = await request.formData()
    const file = formData.get('file')
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Arquivo ausente' }, { status: 400 })
    }
    if (!String(file.type || '').includes('pdf')) {
      return NextResponse.json({ error: 'Tipo de arquivo invalido. Envie um PDF.' }, { status: 400 })
    }

    const buf = Buffer.from(await file.arrayBuffer())
    const result = await parsePdfBuffer(buf)

    if (result.payslips.length === 0) {
      return NextResponse.json({
        error: result.rawText
          ? 'Nao foi possivel extrair dados do PDF (layout nao reconhecido).'
          : 'PDF sem texto legivel (possivelmente escaneado).',
      }, { status: 422 })
    }

    // Buscar funcionarios para vincular
    const { data: employeesData } = await supabase.from('employees').select('*')
    const employees = employeesData || []
    const cpfMap = new Map<string, any>()
    for (const e of employees) {
      if (e.cpf) cpfMap.set(String(e.cpf).replace(/[^\d]/g, ''), e)
    }

    // Montar analise
    const analysis: Array<{
      employeeId?: string
      employeeName?: string
      matched: boolean
      name?: string
      cpf?: string
      baseSalary: number
      commissions: number
      employeePurchases: number
      vouchers: number
      advances: number
      inss: number
      fgts: number
      grossSalary: number
      totalDeductions: number
      netSalary: number
      events?: Array<{ code?: string; description: string; type: 'provento' | 'desconto'; value: number }>
    }> = []

    for (const ps of result.payslips) {
      const employee = matchEmployee(ps, employees, cpfMap)

      analysis.push({
        employeeId: employee?.id,
        employeeName: employee?.name,
        matched: !!employee,
        name: ps.name,
        cpf: ps.cpf,
        baseSalary: ps.baseSalary,
        commissions: ps.commissions,
        employeePurchases: ps.employeePurchases,
        vouchers: ps.vouchers,
        advances: ps.advances,
        inss: ps.inss,
        fgts: ps.fgts,
        grossSalary: ps.totalGross,
        totalDeductions: ps.totalDeductions,
        netSalary: ps.netSalary,
        events: ps.events.map(e => ({
          code: e.code,
          description: e.description,
          type: e.type,
          value: e.value,
        })),
      })
    }

    const unmatched = analysis.filter(a => !a.matched).map(a => ({ name: a.name, cpf: a.cpf }))

    return NextResponse.json({
      totalRows: analysis.length,
      matchedCount: analysis.filter(a => a.matched).length,
      unmatchedCount: unmatched.length,
      month: result.competence.month,
      year: result.competence.year,
      totalPages: result.totalPages,
      employerPagesCount: result.employerPagesCount,
      unmatched: unmatched.slice(0, 50),
      items: analysis.slice(0, 500),
    }, { status: 200 })
  } catch (error) {
    return NextResponse.json({
      error: 'Falha ao analisar arquivo',
      details: error instanceof Error ? error.message : String(error),
    }, { status: 500 })
  }
}
