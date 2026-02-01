import { NextResponse } from 'next/server'
export const runtime = 'nodejs'
import { createClient } from '@/lib/supabase/server'
import { createRequire } from 'module'
import { createPayrollItemAdmin, updatePayrollItemAdmin } from '@/lib/services/data-service'
import type { PayrollItem } from '@/types'
import { loadRubricas, getRubricaTypeSync } from '@/lib/rubricas'

function normalizeText(s: string) {
  return s.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

function normalizeName(s: string | undefined) {
  return normalizeText(String(s || '')).replace(/\s+/g, ' ').trim()
}

function splitIntoReceipts(text: string): string[] {
  const blocks: string[] = []
  const patterns = [
    /Recibo\s+de\s+Pagamento\s+de\s+Sal(?:á|a)rio/gi,
    /Recibo\s+de\s+Pagamento\s+de\s+Folha\s+Mensal/gi,
    /Holerite/gi,
    /Onda\s+Cal(?:ç|c)ados/gi,
  ]
  for (const rx of patterns) {
    const matches = Array.from(text.matchAll(rx))
    if (matches.length > 1) {
      const indices = matches.map(m => (m.index ?? 0))
      for (let i = 0; i < indices.length; i++) {
        const start = indices[i]
        const end = i + 1 < indices.length ? indices[i + 1] : text.length
        blocks.push(text.slice(start, end).trim())
      }
      return blocks.filter(b => b.length > 0)
    }
  }
  const byPages = text.split(/\n{2,}/).map(b => b.trim()).filter(Boolean)
  return byPages.length > 0 ? byPages : [text]
}

function filterEmployerReceipts(receipts: string[]): string[] {
  const out: string[] = []
  for (const b of receipts) {
    const n = normalizeText(b)
    const hasEmpregador = /\bvia\b.*\bempregador\b/.test(n)
    const hasEmpregado = /\bvia\b.*\bempregado\b/.test(n)
    if (hasEmpregado && !hasEmpregador) continue
    if (hasEmpregador) out.push(b)
  }
  if (out.length > 0) return out
  return receipts
}

function extractNameAndNet(block: string): { name?: string; net?: number } {
  const n = normalizeText(block)
  let name: string | undefined
  const namePatterns = [
    /nome\s*(?:do\s*funcionari[oa])?\s*[:\-]\s*([a-z\u00c0-\u017f\s]+)/i,
    /funcionari[oa]\s*[:\-]\s*([a-z\u00c0-\u017f\s]+)/i,
    /colaborador\s*[:\-]\s*([a-z\u00c0-\u017f\s]+)/i,
    /empregad[oa]\s*[:\-]\s*([a-z\u00c0-\u017f\s]+)/i,
  ]
  for (const rx of namePatterns) {
    const m = block.match(rx)
    if (m) {
      name = m[1].trim()
      break
    }
  }
  const netPatterns = [
    /sal(?:á|a)rio\s+liquido\s*[:\-]\s*r?\$?\s*([\d\.\,]+)/i,
    /valor\s+liquido\s*[:\-]\s*r?\$?\s*([\d\.\,]+)/i,
    /liquido\s*[:\-]\s*r?\$?\s*([\d\.\,]+)/i,
  ]
  let net: number | undefined
  for (const rx of netPatterns) {
    const m = block.match(rx)
    if (m) {
      net = parseMoney(m[1])
      break
    }
  }
  return { name, net }
}

function parseReceiptsWithDedup(text: string): ParsedRow[] {
  const receipts = splitIntoReceipts(text)
  const employerReceipts = filterEmployerReceipts(receipts)
  const rows: ParsedRow[] = []
  const seen = new Set<string>()
  for (const b of employerReceipts) {
    const { name, net } = extractNameAndNet(b)
    const key = `${normalizeText(name || '')}|${Number.isFinite(net || NaN) ? net : 'x'}`
    if (seen.has(key)) continue
    const r = parseRows(b)
    if (name && net !== undefined && r.length > 0) seen.add(key)
    rows.push(...r)
  }
  if (rows.length > 0) return rows
  const all = parseRows(text)
  const dedup: ParsedRow[] = []
  const kset = new Set<string>()
  for (const r of all) {
    const k = `${normalizeText(r.name || '')}|${r.commissions || 0}|${r.employeePurchases || 0}|${r.vouchers || 0}|${r.inss || 0}|${r.fgts || 0}`
    if (kset.has(k)) continue
    kset.add(k)
    dedup.push(r)
  }
  return dedup
}

function parseReceiptsTextRows(text: string): ParsedRow[] {
  const receipts = filterEmployerReceipts(splitIntoReceipts(text))
  const out: ParsedRow[] = []
  for (const b of receipts) {
    const r = parseRows(b)
    if (r.length > 0) out.push(r[0])
  }
  return out
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
  const period = text.match(/(\d{1,2})\s*[\/\-]\s*(\d{1,2})\s*[\/\-]\s*(\d{4}).{0,40}?\b[aA]\b.{0,40}?(\d{1,2})\s*[\/\-]\s*(\d{1,2})\s*[\/\-]\s*(\d{4})/)
  if (period) {
    const m2 = parseInt(period[5], 10)
    const y2 = parseInt(period[6], 10)
    if (m2 >= 1 && m2 <= 12) return { month: m2, year: y2 }
  }
  const mmYYYY = Array.from(text.matchAll(/(\d{1,2})\s*[\/\-]\s*(\d{4})/g)).map(m => ({ month: parseInt(m[1], 10), year: parseInt(m[2], 10) }))
  for (const { month, year } of mmYYYY) {
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

function extractTextFromPdf2jsonData(data: any): string {
  try {
    const parts: string[] = []
    const pages = Array.isArray(data?.Pages) ? data.Pages : []
    for (const p of pages) {
      const texts = Array.isArray(p?.Texts) ? p.Texts : []
      for (const t of texts) {
        const runs = Array.isArray(t?.R) ? t.R : []
        for (const r of runs) {
          const s = r?.T ? decodeURIComponent(String(r.T).replace(/\+/g, '%20')) : ''
          if (s) parts.push(s)
        }
      }
      parts.push('\n')
    }
    return parts.join(' ')
  } catch {
    return ''
  }
}

function parseRowsStructuredFromPdfData(data: any): ParsedRow[] {
  try {
    const allPages = Array.isArray(data?.Pages) ? data.Pages : []
    const employerPages: any[] = []
    for (const p of allPages) {
      const parts: string[] = []
      const texts = Array.isArray(p?.Texts) ? p.Texts : []
      for (const t of texts) {
        const runs = Array.isArray(t?.R) ? t.R : []
        for (const r of runs) {
          const s = r?.T ? decodeURIComponent(String(r.T).replace(/\+/g, '%20')) : ''
          if (s) parts.push(s)
        }
      }
      const pageText = normalizeText(parts.join(' '))
      const isEmployer = /\bvia\b.*\bempregador\b/.test(pageText)
      const isEmployee = /\bvia\b.*\bempregado\b/.test(pageText)
      if (isEmployer && !isEmployee) employerPages.push(p)
    }
    const pages = employerPages.length > 0 ? employerPages : allPages
    const allRows: ParsedRow[] = []
    for (const p of pages) {
      const tokens: Array<{ x: number; y: number; s: string }> = []
      const texts = Array.isArray(p?.Texts) ? p.Texts : []
      for (const t of texts) {
        const runs = Array.isArray(t?.R) ? t.R : []
        for (const r of runs) {
          const s = r?.T ? decodeURIComponent(String(r.T).replace(/\+/g, '%20')) : ''
          if (!s) continue
          tokens.push({ x: Number(t?.x || 0), y: Number(t?.y || 0), s })
        }
      }
      // cluster lines by y (rounded)
      const lineMap = new Map<number, Array<{ x: number; s: string }>>()
      for (const tk of tokens) {
        const key = Math.round(tk.y)
        if (!lineMap.has(key)) lineMap.set(key, [])
        lineMap.get(key)!.push({ x: tk.x, s: tk.s })
      }
      const lines = Array.from(lineMap.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([y, arr]) => ({ y, parts: arr.sort((a, b) => a.x - b.x) }))
      let employeeName = ''
      let employeeCpf = ''
      for (const ln of lines.slice(0, 40)) {
        const text = ln.parts.map(p => p.s).join(' ')
        const n = normalizeText(text)
        if (/empregad[oa]\s*[:\-]/.test(n)) {
          const after = text.split(/empregad[oa]\s*[:\-]\s*/i)[1] || ''
          employeeName = after.trim()
        }
        if (/\bcpf\b/.test(n)) {
          const m = text.match(/\b\d{3}\.\d{3}\.\d{3}\-\d{2}\b|\b\d{11}\b/)
          if (m) employeeCpf = m[0]
        }
      }
      // find header with "Rendimentos" and "Descontos"
      let xRend = NaN
      let xDesc = NaN
      let headerY = NaN
      for (const ln of lines) {
        const text = ln.parts.map(p => p.s).join(' ')
        const n = normalizeText(text)
        if (/\bcodigo\b/.test(n) && /\bdescricao\b/.test(n) && /\breferencia\b/.test(n) && /\brendimentos\b/.test(n) && /\bdescontos?\b/.test(n)) {
          const rendTk = ln.parts.find(p => normalizeText(p.s).includes('rendimentos'))
          const descTk = ln.parts.find(p => normalizeText(p.s).includes('descontos'))
          if (rendTk && descTk) {
            xRend = rendTk.x
            xDesc = descTk.x
            headerY = ln.y
            break
          }
        }
      }
      if (!Number.isFinite(xRend) || !Number.isFinite(xDesc)) {
        continue
      }
      const descXMax = Math.min(xRend, (xRend + xDesc) / 2) - 1
      const moneyRx = /\d{1,3}(?:\.\d{3})*,\d{2}/
      let baseSalary = 0
      const events: Array<{ id: string; description: string; type: 'provento' | 'desconto'; value: number }> = []
      let fgts = 0
      let commissions = 0
      let purchases = 0
      let irrf = 0
      let advances = 0
      let inss = 0
      let pdfGross = 0
      let pdfDiscounts = 0
      let pdfNet = 0
      for (const ln of lines) {
        if (ln.y <= headerY) continue
        const lineText = ln.parts.map(p => p.s).join(' ')
        const nline = normalizeText(lineText)
        if (/total\s+(de\s+)?vencimentos/.test(nline)) {
          const lastTk = [...ln.parts].reverse().find(p => moneyRx.test(p.s))
          if (lastTk) pdfGross = parseMoney(lastTk.s)
          continue
        }
        if (/total\s+(de\s+)?descontos?/.test(nline)) {
          const lastTk = [...ln.parts].reverse().find(p => moneyRx.test(p.s))
          if (lastTk) pdfDiscounts = parseMoney(lastTk.s)
          continue
        }
        if (/liquido/.test(nline)) {
          const lastTk = [...ln.parts].reverse().find(p => moneyRx.test(p.s))
          if (lastTk) pdfNet = parseMoney(lastTk.s)
          continue
        }
        // build description from left side
        const desc = ln.parts.filter(p => p.x <= descXMax).map(p => p.s).join(' ').trim()
        if (!desc) continue
        const nd = normalizeText(desc)
        // skip non-event lines
        if (/^codigo\b|^descricao\b|^referencia\b/.test(nd)) continue
        // check for FGTS informative in the line
        if (/\bfgts\b|f\.?g\.?t\.?s/.test(nd)) {
          const valTk = [...ln.parts].reverse().find(p => moneyRx.test(p.s))
          if (valTk) fgts = parseMoney(valTk.s)
          continue
        }
        // find money on right; classify by nearness to columns
        const moneyTks = ln.parts.filter(p => moneyRx.test(p.s))
        if (moneyTks.length === 0) continue
        let rendVal = 0
        let descVal = 0
        for (const tk of moneyTks) {
          const distR = Math.abs(tk.x - xRend)
          const distD = Math.abs(tk.x - xDesc)
          if (distR <= distD) rendVal = parseMoney(tk.s)
          else descVal = parseMoney(tk.s)
        }
        const typeByRubrica = getRubricaTypeSync(desc)
        if (typeByRubrica === 'base') {
          baseSalary = rendVal || baseSalary || descVal
          continue
        }
        if (/comiss/.test(nd) && rendVal > 0) {
          commissions += rendVal
          continue
        }
        if (/\bimposto(?:\s+de)?\s+renda\b|\birrf\b/.test(nd) && descVal > 0) {
          irrf += descVal
          continue
        }
        if (/compras?\s+efetuadas?\s+na\s+empresa|vale\s+mercador|consumo/.test(nd) && descVal > 0) {
          purchases += descVal
          continue
        }
        if (/adiantamento/.test(nd) && descVal > 0) {
          advances += descVal
          continue
        }
        if (/\b(?:i\.?n\.?s\.?s\.?|inss)\b|\bprevid/.test(nd) && descVal > 0) {
          inss += descVal
          continue
        }
        if (rendVal > 0) {
          events.push({ id: `e-${events.length}`, description: desc, type: 'provento', value: rendVal })
        }
        if (descVal > 0) {
          events.push({ id: `e-${events.length}`, description: desc, type: 'desconto', value: descVal })
        }
      }
      let eventProventos = events.filter(e => e.type === 'provento').reduce((s, e) => s + e.value, 0)
      let eventDescontos = events.filter(e => e.type === 'desconto').reduce((s, e) => s + e.value, 0)
      let grossSalary = commissions + eventProventos
      let totalDeductions = purchases + irrf + advances + inss + eventDescontos
      let netSalary = grossSalary - totalDeductions
      if (pdfGross > 0 && pdfDiscounts > 0) {
        grossSalary = pdfGross
        totalDeductions = pdfDiscounts
        netSalary = pdfNet > 0 ? pdfNet : grossSalary - totalDeductions
        const otherProventos = Math.max(0, grossSalary - (commissions + eventProventos))
        if (otherProventos > 0.009) {
          events.push({ id: `e-${events.length}`, description: 'Outros Rendimentos', type: 'provento', value: otherProventos })
          eventProventos += otherProventos
        }
        const otherDescontos = Math.max(0, totalDeductions - (purchases + irrf + advances + inss + eventDescontos))
        if (otherDescontos > 0.009) {
          events.push({ id: `e-${events.length}`, description: 'Outros Descontos', type: 'desconto', value: otherDescontos })
          eventDescontos += otherDescontos
        }
      }
      const row: ParsedRow = {
        name: employeeName || undefined,
        cpf: employeeCpf || undefined,
        baseSalary: baseSalary || undefined,
        commissions: commissions || undefined,
        employeePurchases: purchases || undefined,
        vouchers: irrf || undefined,
        advances: advances || undefined,
        inss: inss || undefined,
        fgts: fgts || undefined,
        events: events.length ? events : undefined,
        pdfGross: pdfGross || undefined,
        pdfDiscounts: pdfDiscounts || undefined,
        pdfNet: pdfNet || undefined,
      }
      allRows.push(row)
    }
    return allRows.filter(r => (r.events && r.events.length) || r.baseSalary || r.pdfGross || r.pdfNet)
  } catch {
    return []
  }
}
function parseRows(text: string): ParsedRow[] {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  const joinedText = lines.join(' ')
  const norm = normalizeText(joinedText)
  const cpfMatch = joinedText.match(/\b\d{3}\.\d{3}\.\d{3}\-\d{2}\b|\b\d{11}\b/)
  const nameMatch = joinedText.match(/(?:nome|funcionari[oa]|colaborador|empregad[oa])[:\s]*([A-Za-z\u00C0-\u017F\s]+)/i)
  let base = 0
  const baseMatch = joinedText.match(/sal(?:á|a)rio\s*base[^\d]*([\d\.\,]+)/i) || joinedText.match(/dias\s*normais[^\d]*([\d\.\,]+)/i)
  if (baseMatch) base = parseMoney(baseMatch[1])
  const fgtsMatch = joinedText.match(/f\.?g\.?t\.?s(?:\s+do\s+periodo)?[^\d]*([\d\.\,]+)/i)
  const fgts = fgtsMatch ? parseMoney(fgtsMatch[1]) : 0
  const totalGrossMatch = joinedText.match(/total\s+(?:de\s+)?(?:vencimentos|proventos)[^\d]*([\d\.\,]+)/i)
  const totalDiscountsMatch = joinedText.match(/total\s+(?:de\s+)?descontos?[^\d]*([\d\.\,]+)/i)
  const netMatch = joinedText.match(/liquido[^\d]*r?\$?\s*([\d\.\,]+)/i)
  let totalGrossFromPdf = totalGrossMatch ? parseMoney(totalGrossMatch[1]) : 0
  let totalDiscountsFromPdf = totalDiscountsMatch ? parseMoney(totalDiscountsMatch[1]) : 0
  let netFromPdf = netMatch ? parseMoney(netMatch[1]) : 0
  const moneyRx = /([A-Za-z\u00C0-\u017F][A-Za-z\u00C0-\u017F\s\-\%\/\.]+?)\s+(\d{1,3}(?:\.\d{3})*,\d{2})(?!\S)/g
  const events: Array<{ id: string; description: string; type: 'provento' | 'desconto'; value: number }> = []
  let commissions = 0
  let purchases = 0
  let irrf = 0
  let advances = 0
  let inss = 0
  for (;;) {
    const m = moneyRx.exec(joinedText)
    if (!m) break
    const desc = m[1].trim()
    const val = parseMoney(m[2])
    const nd = normalizeText(desc)
    if (/total|liquido/.test(nd)) continue
    if (/recibo\s+de\s+pagamento|via\s+do\s+empregad|via\s+do\s+empregador|x[-\s]?nello|comercio|calcados|gerente|cargo|pagina|data\s+admissao|cnpj|cpf|ctps|serie|referencia|codigo|descricao/.test(nd)) continue
    const typeByRubrica = getRubricaTypeSync(desc)
    if (typeByRubrica === 'base') {
      base = base > 0 ? base : val
      continue
    }
    if (typeByRubrica === 'fgts') {
      continue
    }
    if (/comiss/.test(nd)) {
      commissions += val
      continue
    }
    if (typeByRubrica === 'provento' || /gratific|hora\s+extra|reflexo\s+extras?\s+dsr|abono\s+domingo|horas?\s+domingo|adicional|premio|diferenca\s+media|diferenca\s+13o/.test(nd)) {
      events.push({ id: `e-${events.length}`, description: desc, type: 'provento', value: val })
      continue
    }
    if (typeByRubrica === 'desconto' || /imposto(?:\s+de)?\s+renda|\birrf\b/.test(nd)) {
      irrf += val
      continue
    }
    if (/compras?\s+efetuadas?\s+na\s+empresa|vale\s+mercador|consumo/.test(nd)) {
      purchases += val
      continue
    }
    if (/vale\s+transporte|vale\s+avulso/.test(nd)) {
      events.push({ id: `e-${events.length}`, description: desc, type: 'desconto', value: val })
      continue
    }
    if (/adiantamento/.test(nd)) {
      advances += val
      continue
    }
    if (/\b(?:i\.?n\.?s\.?s\.?|inss)\b|\bprevid/.test(nd)) {
      inss += val
      continue
    }
    const isDesconto = /descont|contribui|negocial|vale/.test(nd)
    events.push({ id: `e-${events.length}`, description: desc, type: isDesconto ? 'desconto' : 'provento', value: val })
  }
  let eventProventos = events.filter(e => e.type === 'provento').reduce((s, e) => s + e.value, 0)
  let eventDescontos = events.filter(e => e.type === 'desconto').reduce((s, e) => s + e.value, 0)
  let grossSalary = commissions + eventProventos
  let totalDeductions = purchases + irrf + advances + inss + eventDescontos
  let netSalary = grossSalary - totalDeductions
  if (totalGrossFromPdf > 0 && totalDiscountsFromPdf > 0) {
    grossSalary = totalGrossFromPdf
    totalDeductions = totalDiscountsFromPdf
    netSalary = netFromPdf > 0 ? netFromPdf : grossSalary - totalDeductions
    const otherProventos = Math.max(0, grossSalary - (commissions + eventProventos))
    if (otherProventos > 0.009) {
      events.push({ id: `e-${events.length}`, description: 'Outros Rendimentos', type: 'provento', value: otherProventos })
      eventProventos += otherProventos
    }
    const otherDescontos = Math.max(0, totalDeductions - (purchases + irrf + advances + inss + eventDescontos))
    if (otherDescontos > 0.009) {
      events.push({ id: `e-${events.length}`, description: 'Outros Descontos', type: 'desconto', value: otherDescontos })
      eventDescontos += otherDescontos
    }
  }
  const r: ParsedRow = {
    name: nameMatch ? nameMatch[1].trim() : undefined,
    cpf: cpfMatch ? cpfMatch[0] : undefined,
    baseSalary: base || undefined,
    commissions: commissions || undefined,
    employeePurchases: purchases || undefined,
    vouchers: irrf || undefined,
    advances: advances || undefined,
    inss: inss || undefined,
    fgts: fgts || undefined,
    events: events.length > 0 ? events : undefined,
    pdfGross: totalGrossFromPdf || undefined,
    pdfDiscounts: totalDiscountsFromPdf || undefined,
    pdfNet: netFromPdf || undefined,
  }
  return [r]
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
      return NextResponse.json({ error: 'Arquivo PDF ausente' }, { status: 400 })
    }
    if (!file.type.includes('pdf')) {
      return NextResponse.json({ error: 'Tipo de arquivo invalido' }, { status: 400 })
    }
    const buf = Buffer.from(await file.arrayBuffer())
    const require = createRequire(import.meta.url)
    let text = ''
    let structuredRows: ParsedRow[] = []
    try {
      const pdfParseMod = require('pdf-parse')
      const pdfParse = pdfParseMod?.default || pdfParseMod
      const parsed = await pdfParse(buf)
      text = String(parsed?.text || '').trim()
    } catch {}
    try {
      const mod = require('pdf2json')
      const PDFCtor = mod?.PDFParser || mod?.default || mod
      if (PDFCtor) {
        const result = await new Promise<{ text?: string; rows?: ParsedRow[] }>((resolve, reject) => {
          try {
            const parser = new PDFCtor()
            parser.on('pdfParser_dataError', (err: any) => reject(err?.parserError || err))
            parser.on('pdfParser_dataReady', (data: any) => {
              try {
                const out = typeof (parser as any).getRawTextContent === 'function' ? (parser as any).getRawTextContent() : extractTextFromPdf2jsonData(data)
                const rows = parseRowsStructuredFromPdfData(data)
                resolve({ text: String(out || ''), rows })
              } catch {
                resolve({ rows: [] })
              }
            })
            parser.parseBuffer(buf)
          } catch (e) {
            reject(e)
          }
        })
        if (!text && result.text) text = result.text
        structuredRows = Array.isArray(result.rows) ? result.rows! : []
      }
    } catch {}
    if (!text.trim()) {
      return NextResponse.json({ error: 'PDF sem texto legivel (possivelmente escaneado).' }, { status: 422 })
    }
    await loadRubricas()
    const competence = detectCompetence(text)
    const month = monthParam ? parseInt(String(monthParam), 10) : (competence.month || new Date().getMonth() + 1)
    const year = yearParam ? parseInt(String(yearParam), 10) : (competence.year || new Date().getFullYear())
    function mergeIdentity(structured: ParsedRow[], textRows: ParsedRow[]): ParsedRow[] {
      if (structured.length === 0) return textRows
      if (textRows.length === 0) return structured
      if (structured.length === textRows.length) {
        return structured.map((sr, i) => {
          const tr = textRows[i]
          if (!sr.name && tr?.name) sr.name = tr.name
          if (!sr.cpf && tr?.cpf) sr.cpf = tr.cpf
          return sr
        })
      }
      return structured.map(sr => {
        const tr = textRows.find(t => {
          const netMatch = typeof sr.pdfNet === 'number' && typeof t.pdfNet === 'number' && Math.abs((sr.pdfNet || 0) - (t.pdfNet || 0)) < 0.01
          const grossMatch = typeof sr.pdfGross === 'number' && typeof t.pdfGross === 'number' && Math.abs((sr.pdfGross || 0) - (t.pdfGross || 0)) < 0.01
          const baseMatch = typeof sr.baseSalary === 'number' && typeof t.baseSalary === 'number' && Math.abs((sr.baseSalary || 0) - (t.baseSalary || 0)) < 0.01
          return netMatch || grossMatch || baseMatch
        })
        if (tr) {
          if (!sr.name && tr.name) sr.name = tr.name
          if (!sr.cpf && tr.cpf) sr.cpf = tr.cpf
        }
        return sr
      })
    }
    const textRowsPerReceipt = parseReceiptsTextRows(text)
    let rows = structuredRows.length > 0 ? mergeIdentity(structuredRows, textRowsPerReceipt) : parseReceiptsWithDedup(text)
    // Attempt structured parse again using pdf2json if available in memory is not accessible; keep text-only for now.
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Nao foi possivel extrair dados do PDF (layout nao reconhecido).' }, { status: 422 })
    }
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
    const unmatched: Array<{ name?: string; cpf?: string }> = []
    const divergences: Array<{ employeeId?: string; name?: string; calcNet: number; pdfNet: number; diff: number }> = []
    for (const row of rows) {
      let employee: any = null
      if (row.cpf) {
        const key = row.cpf.replace(/[^\d]/g, '')
        employee = cpfMap.get(key) || null
      }
      if (!employee && row.name) {
        const n = normalizeName(row.name)
        employee =
          employees.find(e => normalizeName(e.name || '') === n) ||
          employees.find(e => {
            const en = normalizeName(e.name || '')
            return en.includes(n) || n.includes(en)
          }) ||
          null
      }
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
      const grossSalary = commissions + eventProventos
      const totalDeductions = employeePurchases + vouchers + advances + inss + eventDescontos
      const netSalary = grossSalary - totalDeductions
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
    const summary = {
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
    }
    return NextResponse.json(summary, { status: 200 })
  } catch (error) {
    console.error('Error importing payroll from PDF:', error)
    return NextResponse.json(
      { 
        error: 'Falha ao importar PDF',
        details: error instanceof Error ? error.message : String(error)
      }, 
      { status: 500 }
    )
  }
}
