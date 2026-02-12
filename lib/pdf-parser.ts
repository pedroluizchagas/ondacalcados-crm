// ---------------------------------------------------------------------------
// lib/pdf-parser.ts  --  Parser centralizado de PDF de folha de pagamento
// ---------------------------------------------------------------------------
// Modulo compartilhado usado por todas as rotas de importacao.
//
// Layout esperado do PDF (cada pagina fisica contendo 2 vias):
//   [dados da folha]
//   X-NELLO COMERCIO DE CALCADOS LTDA  42.459.228/0001-94
//   NOME DO FUNCIONARIO
//   Empregado:
//   CNPJ/CEI/CPF:
//   ...
//   1a Via / Empregador   (ou 2a Via / Empregado)
//   RECIBO DE PAGAMENTO DE FOLHA MENSAL
//
// Cada pagina PDF contem via empregador + via empregado sequencialmente.
// Filtramos apenas a via do empregador e extraimos dados do funcionario.
// ---------------------------------------------------------------------------

import {
  norm,
  loadRubricas,
  getRubricaByCode,
  getRubricaTypeSync,
  type RubricaType,
} from '@/lib/rubricas'

// == Tipos de saida =========================================================

export interface ParsedPayslipEvent {
  id: string
  code?: string
  description: string
  type: 'provento' | 'desconto'
  reference?: string
  value: number
}

export interface ParsedPayslip {
  name?: string
  cpf?: string
  baseSalary: number
  commissions: number
  employeePurchases: number
  vouchers: number
  advances: number
  inss: number
  fgts: number
  events: ParsedPayslipEvent[]
  totalGross: number
  totalDeductions: number
  netSalary: number
}

export interface PdfParseResult {
  payslips: ParsedPayslip[]
  competence: { month?: number; year?: number }
  rawText: string
  totalPages: number
  employerPagesCount: number
}

// == Utilidades de texto ====================================================

export function normalizeText(s: string): string {
  return s.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

/** Normaliza texto removendo tambem quebras de linha (para comparacao) */
function normFlat(s: string): string {
  return normalizeText(s).replace(/[\n\r]+/g, ' ').replace(/\s+/g, ' ').trim()
}

export function normalizeName(s: string | undefined): string {
  return normalizeText(String(s || '')).replace(/\s+/g, ' ').trim()
}

export function parseMoney(input: string | number): number {
  if (typeof input === 'number') return input
  const s = String(input || '')
    .replace(/\s/g, '')
    .replace(/\./g, '')
    .replace(',', '.')
    .replace(/[^\d.\-]/g, '')
  const n = parseFloat(s)
  return isNaN(n) ? 0 : n
}

// == Deteccao de competencia (mes/ano) ======================================

export function detectCompetence(text: string): { month?: number; year?: number } {
  const monthNames = [
    { rx: /janeiro/i, v: 1 }, { rx: /fevereiro/i, v: 2 },
    { rx: /marco|mar\u00e7o/i, v: 3 }, { rx: /abril/i, v: 4 },
    { rx: /maio/i, v: 5 }, { rx: /junho/i, v: 6 },
    { rx: /julho/i, v: 7 }, { rx: /agosto/i, v: 8 },
    { rx: /setembro/i, v: 9 }, { rx: /outubro/i, v: 10 },
    { rx: /novembro/i, v: 11 }, { rx: /dezembro/i, v: 12 },
  ]
  const period = text.match(
    /(\d{1,2})\s*[\/\-]\s*(\d{1,2})\s*[\/\-]\s*(\d{4}).{0,40}?\b[aA]\b.{0,40}?(\d{1,2})\s*[\/\-]\s*(\d{1,2})\s*[\/\-]\s*(\d{4})/
  )
  if (period) {
    const m2 = parseInt(period[5], 10)
    const y2 = parseInt(period[6], 10)
    if (m2 >= 1 && m2 <= 12) return { month: m2, year: y2 }
  }
  const mmYYYY = Array.from(text.matchAll(/(\d{1,2})\s*[\/\-]\s*(\d{4})/g))
    .map(m => ({ month: parseInt(m[1], 10), year: parseInt(m[2], 10) }))
  for (const { month, year } of mmYYYY) {
    if (month >= 1 && month <= 12) return { month, year }
  }
  for (const mm of monthNames) {
    if (mm.rx.test(text)) {
      const y = text.match(/(20\d{2})/)
      return { month: mm.v, year: y ? parseInt(y[1], 10) : undefined }
    }
  }
  return {}
}

// == Separacao de recibos e filtragem =======================================

function splitIntoReceipts(text: string): string[] {
  // Cada recibo termina com "RECIBO DE PAGAMENTO DE FOLHA MENSAL"
  // Tambem tentar dividir por esse padrao
  const patterns = [
    /RECIBO\s+DE\s+PAGAMENTO\s+DE\s+(?:FOLHA\s+MENSAL|SAL(?:A|\u00e1)RIO)/gi,
    /Onda\s+Cal(?:c|\u00e7)ados/gi,
  ]
  for (const rx of patterns) {
    const matches = Array.from(text.matchAll(rx))
    if (matches.length > 1) {
      const blocks: string[] = []
      let prevEnd = 0
      for (const m of matches) {
        const end = (m.index ?? 0) + m[0].length
        const block = text.slice(prevEnd, end).trim()
        if (block.length > 50) blocks.push(block)
        prevEnd = end
      }
      // Capturar texto restante
      const remaining = text.slice(prevEnd).trim()
      if (remaining.length > 50) blocks.push(remaining)
      if (blocks.length > 1) return blocks
    }
  }
  // Fallback: dividir por paginas
  const byPages = text.split(/\n{2,}/).map(b => b.trim()).filter(Boolean)
  return byPages.length > 0 ? byPages : [text]
}

/** Verifica se um bloco de texto e via do empregador (nao do empregado) */
function isEmployerBlock(text: string): boolean {
  // IMPORTANTE: usar normFlat que remove \n, pois "1a Via" e "Empregador"
  // podem estar em linhas separadas no PDF
  const n = normFlat(text)
  const hasEmpregador = /\bvia\b[^.]{0,10}\bempregador\b/.test(n) || /1\s*a?\s*via\b/.test(n) && /\bempregador\b/.test(n)
  const hasEmpregado = /2\s*a?\s*via\b/.test(n) && /\bempregado\b/.test(n)
  // Se so tem "2a Via Empregado", e a via do empregado -> descartar
  if (hasEmpregado && !hasEmpregador) return false
  // Se tem "1a Via Empregador", manter
  if (hasEmpregador) return true
  // Se nao tem indicacao de via, manter por padrao
  return true
}

function filterEmployerReceipts(receipts: string[]): string[] {
  const out: string[] = []
  for (const b of receipts) {
    if (isEmployerBlock(b)) out.push(b)
  }
  return out.length > 0 ? out : receipts
}

// == Classificacao de rubrica ===============================================

type FieldMapping = 'base' | 'commissions' | 'irrf' | 'purchases' | 'advances' | 'inss' | 'fgts' | 'event'

function classifyForField(code: string, description: string, isDescontoColumn: boolean): FieldMapping {
  const nd = norm(description)

  // Por codigo conhecido
  if (code) {
    const rubrica = getRubricaByCode(code)
    if (rubrica) {
      if (rubrica.type === 'base') return 'base'
      if (rubrica.type === 'fgts' || rubrica.type === 'informativa') return 'fgts'
    }
  }

  // FGTS
  if (/\bfgts\b|f\.?g\.?t\.?s/.test(nd)) return 'fgts'
  // Base
  if (/\bsalario\s*base\b|\bdias?\s*normais\b|\bhoras?\s*normais\b/.test(nd) && !isDescontoColumn) return 'base'
  // Comissao
  if (/comiss/.test(nd) && !isDescontoColumn) return 'commissions'
  // IRRF
  if (/\bimposto\s*(de)?\s*renda\b|\birrf\b/.test(nd) || code === '999') return 'irrf'
  // Compras na empresa
  if (/compras?\s+efetuadas?\s+na\s+empresa/.test(nd) || /vale\s+mercador/.test(nd) || code === '244') return 'purchases'
  // Adiantamento
  if (/\badiantamento\s+salarial\b|\bdesconto\s+adiantamento\b/.test(nd)) return 'advances'
  // INSS
  if (/\binss\b|\bi\.?n\.?s\.?s\.?\b/.test(nd) || code === '998') return 'inss'
  // INSS empregador (informativo)
  if (/inss\s+empregador/.test(nd) || code === '843') return 'fgts'

  return 'event'
}

// == Extracao de nome do funcionario ========================================

/**
 * Extrai o nome do funcionario do texto do recibo.
 * No layout tipico, o nome aparece ANTES da label "Empregado:",
 * e logo apos a linha do CNPJ da empresa:
 *
 *   X-NELLO COMERCIO DE CALCADOS LTDA 42.459.228/0001-94
 *   ADRIANA ARAUJO DE MENESES
 *   Empregado:
 */
function extractEmployeeName(text: string): string {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)

  // Metodo 1: encontrar "Empregado:" e pegar a linha anterior
  for (let i = 1; i < lines.length; i++) {
    if (/^empregad[oa]\s*:/i.test(lines[i])) {
      // A linha anterior ao "Empregado:" deve ser o nome
      const nameLine = lines[i - 1].trim()
      // Validar: nao deve ser CNPJ, numero, ou label
      if (
        nameLine.length > 2 &&
        !/\d{2}\.\d{3}\.\d{3}/.test(nameLine) &&  // CNPJ
        !/^\d+[\.,]?\d*$/.test(nameLine) &&         // numero puro
        !/cnpj|cei|cpf|pagina|codigo|via|recibo/i.test(nameLine)
      ) {
        return nameLine
      }
      // Tentar linha i-2 (caso haja linha vazia entre CNPJ e nome)
      if (i > 1) {
        const nameLine2 = lines[i - 2].trim()
        if (
          nameLine2.length > 2 &&
          !/\d{2}\.\d{3}\.\d{3}/.test(nameLine2) &&
          !/^\d+[\.,]?\d*$/.test(nameLine2) &&
          !/cnpj|cei|cpf|pagina|via|recibo/i.test(nameLine2)
        ) {
          return nameLine2
        }
      }
      break
    }
  }

  // Metodo 2: regex no texto unido - CNPJ seguido de nome seguido de "Empregado:"
  const joined = lines.join(' ')
  const cnpjNameRx = /\d{2}\.\d{3}\.\d{3}\/\d{4}\-?\d{2}\s+([A-Z\u00C0-\u017F][A-Z\u00C0-\u017F\s\.]{2,60}?)\s+[Ee]mpregad[oa]\s*:/
  const m = joined.match(cnpjNameRx)
  if (m) return m[1].trim()

  // Metodo 3: fallback com regex original
  const nameRx = /(?:nome|funcionari[oa]|colaborador)\s*[:\-]\s*([A-Za-z\u00C0-\u017F\s]+)/i
  const m3 = joined.match(nameRx)
  if (m3) return m3[1].trim()

  return ''
}

/** Extrai CPF do texto */
function extractCPF(text: string): string {
  const m = text.match(/\b\d{3}\.\d{3}\.\d{3}\-\d{2}\b/)
  return m ? m[0] : ''
}

// == Parser de texto (principal) ============================================
//
// Layout real do PDF (texto extraido por pdf-parse):
//
//   [valor_topo]               <- valor avulso (pode ser Sal. Contr. INSS)
//   Pagina  X/X
//   [data_admissao]
//   [CARGO]
//   [salario_base]             <- Salario Base como numero isolado
//   [tab_row_calculos]         <- "27,50\t937,13\t11.714,22\t8.738,38\t3.500,00"
//   01/12/2025 a 31/12/2025   <- periodo
//   [val\tref\tDESCRICAO]     <- linhas de desconto (tab-separadas)
//   ...
//   [codigo]                   <- ultimo codigo de rubrica
//   [total_descontos]          <- valor monetario isolado
//   [liquido]                  <- valor monetario isolado
//   Codigo Descricao Referencia Rendimentos Descontos  <- cabecalho tabela
//   [codigos de rubricas]      <- coluna sequencial (vencimentos + descontos)
//   [descricoes]               <- coluna sequencial (apenas vencimentos)
//   [referencias]              <- coluna sequencial (apenas vencimentos)
//   [valores]                  <- coluna sequencial (apenas vencimentos)
//   [linha inline mista?]      <- ex: "DIFERENCA MEDIA VALOR 13o . 0,00 578,32"
//   EMPRESA LTDA  XX.XXX.XXX/XXXX-XX
//   NOME DO FUNCIONARIO
//   Empregado:
//   CNPJ/CEI/CPF:
//   Sal. Contr. INSS\tSalario Base    <- labels (sem valores ao lado!)
//   Total de Vencimentos               <- label
//   LIQUIDO........R$                  <- label
//   Total de Descontos                 <- label
//   Base Calc. FGTS ...                <- label
//   [total_vencimentos]                <- valor monetario isolado
//   [codigos_extras]
//   1a Via
//   Empregador
//   ...
//   RECIBO DE PAGAMENTO DE FOLHA MENSAL
//

const MONEY_RX = /^\d{1,3}(?:\.\d{3})*,\d{2}$/
// Regex para extrair UM valor monetario dentro de texto concatenado
const MONEY_INLINE = /\d{1,3}(?:\.\d{3})*,\d{2}/g
// Regex para linhas de desconto concatenadas: "VALOR REF DESCRICAO" sem separador
// Ex: "210,006,00VALE TRANSPORTE - 6%"  ou  "1.891,2227,50IMPOSTO DE RENDA ."
const CONCAT_DESCONTO_RX = /^(\d{1,3}(?:\.\d{3})*,\d{2})(\d{1,3}(?:\.\d{3})*,\d{2})(.+)$/

function parseTextReceipt(text: string): ParsedPayslip | null {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)

  // -- Nome e CPF --
  const employeeName = extractEmployeeName(text)
  const employeeCpf = extractCPF(text)

  // -- Localizar marcadores posicionais --
  let headerLineIdx = -1    // "Codigo Descricao Referencia Rendimentos Descontos"
  let baseFgtsLineIdx = -1  // "Base Calc. FGTS F.G.T.S do Periodo..."
  let empregadoLineIdx = -1 // "Empregado:"

  for (let i = 0; i < lines.length; i++) {
    const n = normalizeText(lines[i])
    // Header: aceitar tanto forma separada ("codigo descricao ... rendimentos descontos")
    // quanto concatenada ("codigodescricaoreferenciarendimentosdescontos")
    if (headerLineIdx < 0) {
      const hasSeparated = /\bcodigo\b/.test(n) && /\bdescri/.test(n) && /\brendimento|vencimento|desconto/.test(n)
      const hasConcatenated = /codigo/.test(n) && /descri/.test(n) && /rendimento|desconto/.test(n) && n.length < 80
      if (hasSeparated || hasConcatenated) {
        headerLineIdx = i
      }
    }
    // "Base Calc. FGTS" - tambem aceitar "base calc" concatenado ou "to tal" (split)
    if (baseFgtsLineIdx < 0 && /base\s*calc.*fgts/.test(n)) {
      baseFgtsLineIdx = i
    }
    if (empregadoLineIdx < 0 && /^empregad[oa]\s*:/i.test(lines[i])) {
      empregadoLineIdx = i
    }
  }

  // Encontrar CNPJ apos header (marca fim da area da tabela de rubricas)
  let tableEndIdx = lines.length
  if (headerLineIdx >= 0) {
    for (let i = headerLineIdx + 1; i < lines.length; i++) {
      if (/\d{2}\.\d{3}\.\d{3}\/\d{4}/.test(lines[i])) {
        tableEndIdx = i
        break
      }
    }
    if (tableEndIdx === lines.length && empregadoLineIdx > headerLineIdx) {
      tableEndIdx = Math.max(headerLineIdx + 1, empregadoLineIdx - 2)
    }
  }

  // -- Total de Vencimentos: primeiro valor monetario APOS "Base Calc. FGTS" --
  let totalGross = 0
  if (baseFgtsLineIdx >= 0) {
    for (let i = baseFgtsLineIdx + 1; i < Math.min(baseFgtsLineIdx + 6, lines.length); i++) {
      if (MONEY_RX.test(lines[i])) {
        totalGross = parseMoney(lines[i])
        break
      }
    }
  }

  // -- Total de Descontos e Liquido --
  // Estrategia A: dois valores monetarios imediatamente antes do header,
  // pulando codigos de rubrica (numeros puros de 1-5 digitos)
  let totalDeductions = 0
  let netSalary = 0
  if (headerLineIdx >= 0) {
    const moneyBefore: number[] = []
    for (let i = headerLineIdx - 1; i >= Math.max(0, headerLineIdx - 10); i--) {
      if (MONEY_RX.test(lines[i])) {
        moneyBefore.unshift(parseMoney(lines[i]))
      } else if (/^\d{1,5}$/.test(lines[i])) {
        continue // codigo de rubrica, pular
      } else {
        break // linha de texto, parar
      }
    }
    if (moneyBefore.length >= 2) {
      totalDeductions = moneyBefore[moneyBefore.length - 2]
      netSalary = moneyBefore[moneyBefore.length - 1]
    } else if (moneyBefore.length === 1) {
      netSalary = moneyBefore[0]
    }
  }

  // Estrategia B: se A falhou, buscar todos valores monetarios standalone antes do header.
  // Os ultimos 2 sao total_descontos e liquido (salario base esta mais acima).
  if (headerLineIdx >= 0 && (!totalDeductions || !netSalary)) {
    const allStandalone: number[] = []
    for (let i = 0; i < headerLineIdx; i++) {
      if (MONEY_RX.test(lines[i]) && !lines[i].includes('\t')) {
        allStandalone.push(parseMoney(lines[i]))
      }
    }
    if (allStandalone.length >= 3) {
      if (!totalDeductions) totalDeductions = allStandalone[allStandalone.length - 2]
      if (!netSalary) netSalary = allStandalone[allStandalone.length - 1]
    }
  }

  // -- Salario Base: valor monetario isolado no inicio do recibo (apos Pagina e cargo) --
  let baseSalary = 0
  for (let i = 0; i < Math.min(lines.length, 10); i++) {
    if (MONEY_RX.test(lines[i])) {
      const val = parseMoney(lines[i])
      const prevLines = lines.slice(Math.max(0, i - 4), i).map(l => normalizeText(l))
      const hasPagina = prevLines.some(l => /pagina/.test(l))
      if (hasPagina && val > 100 && val < 100000) {
        baseSalary = val
        break
      }
    }
  }

  // -- FGTS (informativo): 2o valor na linha de calculos --
  // Formato tab-separado: "27,50\t937,13\t11.714,22\t8.738,38\t3.500,00"
  // Formato concatenado:  "27,50937,1311.714,228.738,383.500,00"
  let fgts = 0
  for (const line of lines) {
    // Metodo 1: tab-separado
    const tabParts = line.split('\t')
    if (tabParts.length >= 4 && tabParts.every(p => /^\d/.test(p.trim()) || p.trim() === '0,00' || p.trim() === '0')) {
      const vals = tabParts.map(p => parseMoney(p))
      if (vals.length >= 2 && vals[1] > 0) {
        fgts = vals[1]
      }
      break
    }
    // Metodo 2: concatenado - linha SEM letras com 4+ valores monetarios
    if (/^[\d.,]+$/.test(line) && line.length > 15) {
      const moneyMatches = Array.from(line.matchAll(MONEY_INLINE))
      if (moneyMatches.length >= 4) {
        const vals = moneyMatches.map(m => parseMoney(m[0]))
        if (vals[1] > 0) {
          fgts = vals[1]
        }
        break
      }
    }
  }

  // -- Eventos individuais (rubricas) --
  const events: ParsedPayslipEvent[] = []
  let commissions = 0
  let purchases = 0
  let irrf = 0
  let advances = 0
  let inss = 0
  let eventIdx = 0

  // Rastrear descricoes ja adicionadas para evitar duplicatas
  const addedDescKeys = new Set<string>()

  function addEvent(field: FieldMapping, desc: string, val: number, code?: string) {
    const cleanDesc = desc.replace(/\.\s*$/, '').trim()
    const nd = normalizeText(cleanDesc)
    switch (field) {
      case 'irrf':
        irrf += val
        events.push({ id: `e-${eventIdx++}`, code, description: cleanDesc, type: 'desconto', value: val })
        break
      case 'purchases':
        purchases += val
        events.push({ id: `e-${eventIdx++}`, code, description: cleanDesc, type: 'desconto', value: val })
        break
      case 'advances':
        advances += val
        events.push({ id: `e-${eventIdx++}`, code, description: cleanDesc, type: 'desconto', value: val })
        break
      case 'inss':
        inss += val
        events.push({ id: `e-${eventIdx++}`, code, description: cleanDesc, type: 'desconto', value: val })
        break
      case 'fgts':
        fgts += val
        break
      case 'commissions':
        commissions += val
        events.push({ id: `e-${eventIdx++}`, code, description: cleanDesc, type: 'provento', value: val })
        break
      case 'base':
        events.push({ id: `e-${eventIdx++}`, code, description: cleanDesc, type: 'provento', value: val })
        break
      default: {
        const rubType = code ? (getRubricaByCode(code)?.type || null) : null
        const descType = rubType || getRubricaTypeSync(desc)
        const isDesc = descType === 'desconto' || /descont|contribui|negocial|vale\s+transporte/.test(nd)
        events.push({ id: `e-${eventIdx++}`, code, description: cleanDesc, type: isDesc ? 'desconto' : 'provento', value: val })
        break
      }
    }
  }

  // =====================================================================
  // DESCONTOS INDIVIDUAIS: linhas antes do header da tabela.
  //
  // Formato com tabs: "210,00\t6,00\tVALE TRANSPORTE - 6%"
  // Formato concatenado (sem tabs): "210,006,00VALE TRANSPORTE - 6%"
  //
  // Inclui INSS, IRRF, Compras, Vale Transporte, Contribuicao Negocial,
  // INSS Diferenca 13o, Vale Avulso, etc.
  // =====================================================================
  const descontoEnd = headerLineIdx >= 0 ? headerLineIdx : lines.length
  for (let lineIdx = 0; lineIdx < descontoEnd; lineIdx++) {
    const line = lines[lineIdx]
    let firstVal = 0
    let descPart = ''

    // Metodo 1: tab-separado
    const tabParts = line.split('\t')
    if (tabParts.length >= 3) {
      firstVal = parseMoney(tabParts[0])
      descPart = tabParts[tabParts.length - 1].trim()
      // Pular linha de calculos (5 valores numericos tab-separados)
      if (tabParts.length >= 4 && tabParts.every(p => /^\d/.test(p.trim()) || p.trim() === '0,00' || p.trim() === '0')) continue
    }

    // Metodo 2: concatenado - "VALOR REF DESCRICAO" sem separador
    // Ex: "210,006,00VALE TRANSPORTE - 6%", "1.891,2227,50IMPOSTO DE RENDA ."
    if (!descPart || firstVal <= 0) {
      const concatMatch = line.match(CONCAT_DESCONTO_RX)
      if (concatMatch) {
        firstVal = parseMoney(concatMatch[1])
        descPart = concatMatch[3].trim()
      }
    }

    if (firstVal <= 0 || !descPart || !/[a-zA-Z\u00C0-\u017F]{2,}/.test(descPart)) continue

    const nd = normalizeText(descPart)
    // Pular metadados e labels
    if (/total|liquido|recibo|pagina|empregad|via\s+do|cargo|data\s+admiss|cnpj|cpf|sal\.\s*contr|salario\s*base|base\s*calc|faixa\s*irrf/.test(nd)) continue

    const descKey = `${nd}|${firstVal.toFixed(2)}`
    if (addedDescKeys.has(descKey)) continue
    addedDescKeys.add(descKey)

    const field = classifyForField('', descPart, true)
    addEvent(field, descPart, firstVal)
  }

  // =====================================================================
  // VENCIMENTOS INDIVIDUAIS: tabela pos-header
  //
  // Apos "Codigo Descricao Referencia Rendimentos Descontos" o pdf-parse
  // extrai as colunas como blocos sequenciais:
  //   Fase 1 - Codigos: numeros puros (1-5 digitos), incluem TANTO
  //            vencimentos QUANTO descontos.
  //   Fase 2 - Descricoes: linhas de texto, APENAS para vencimentos
  //            (descontos ja foram extraidos acima nas linhas tab).
  //   Fase 3 - Numeros: primeiro bloco = referencias (dias, horas, %),
  //            segundo bloco = valores em reais.
  //
  // Os primeiros N codigos (N = qtd de descricoes) correspondem aos
  // vencimentos. Os codigos restantes sao descontos ja tratados.
  // =====================================================================
  if (headerLineIdx >= 0) {
    let i = headerLineIdx + 1

    // Fase 1: Codigos de rubrica (numeros puros de 1-5 digitos, consecutivos)
    const tableCodes: string[] = []
    while (i < tableEndIdx && /^\d{1,5}$/.test(lines[i])) {
      tableCodes.push(lines[i])
      i++
    }

    // Fase 2: Descricoes de vencimentos (linhas com texto)
    const tableDescs: string[] = []
    const inlineItems: { desc: string; ref: string; val: number }[] = []

    while (i < tableEndIdx) {
      const line = lines[i]

      // Checar linha inline mista: "DESC REF VALOR"
      // Formato com espacos: "DIFERENCA MEDIA VALOR 13o . 0,00 578,32"
      // Formato concatenado: "DIFERENCA MEDIA VALOR 13o .0,00578,32"
      let inlineDetected = false

      // Tentar formato com espacos primeiro
      const inlineMx = line.match(
        /^([A-Z\u00C0-\u017F][\w\u00C0-\u017F\s\-\%\/\.]+?)\s+(\d[\d.,]*)\s+(\d{1,3}(?:\.\d{3})*,\d{2})\s*$/
      )
      if (inlineMx && /[a-zA-Z\u00C0-\u017F]{3,}/.test(inlineMx[1])) {
        inlineItems.push({ desc: inlineMx[1].trim(), ref: inlineMx[2], val: parseMoney(inlineMx[3]) })
        inlineDetected = true
      }

      // Tentar formato concatenado: texto seguido de 2+ valores monetarios grudados
      if (!inlineDetected && /[a-zA-Z\u00C0-\u017F]{3,}/.test(line)) {
        const moneyInLine = Array.from(line.matchAll(MONEY_INLINE))
        if (moneyInLine.length >= 2) {
          const secondLast = moneyInLine[moneyInLine.length - 2]
          const last = moneyInLine[moneyInLine.length - 1]
          const dPart = line.slice(0, secondLast.index!).trim()
          if (dPart.length >= 3 && /[a-zA-Z\u00C0-\u017F]{3,}/.test(dPart)) {
            inlineItems.push({ desc: dPart, ref: secondLast[0], val: parseMoney(last[0]) })
            inlineDetected = true
          }
        }
      }

      if (inlineDetected) {
        i++
        continue
      }

      // Descricao regular (contem letras, nao e valor monetario nem codigo)
      if (/[a-zA-Z\u00C0-\u017F]{2,}/.test(line) && !MONEY_RX.test(line) && !/^\d{1,5}$/.test(line)) {
        const nl = normalizeText(line)
        // Detectar rodape (labels sem valor ao lado) - tambem "to tal" (split no PDF)
        if (/\b(to\s*tal\s+de|liquido|empregad[oa]|cnpj|cpf|sal\.?\s*contr|base\s*calc|faixa|recibo\s+de)\b/.test(nl)) break
        tableDescs.push(line)
        i++
      } else {
        break
      }
    }

    // Fase 3: Numeros (referencias + valores de rendimentos)
    const tableNumRaws: string[] = []
    while (i < tableEndIdx) {
      const line = lines[i]
      if (MONEY_RX.test(line) || /^\d{1,3},\d{2}$/.test(line) || line === '0' || line === '0,00') {
        tableNumRaws.push(line)
        i++
      } else if (/^\d{1,5}$/.test(line)) {
        i++ // codigo avulso entre numeros, pular
      } else {
        // Checar inline mista apos os numeros (com espacos ou concatenada)
        let foundInline = false
        const inlineMx2 = line.match(
          /^([A-Z\u00C0-\u017F][\w\u00C0-\u017F\s\-\%\/\.]+?)\s+(\d[\d.,]*)\s+(\d{1,3}(?:\.\d{3})*,\d{2})\s*$/
        )
        if (inlineMx2 && /[a-zA-Z\u00C0-\u017F]{3,}/.test(inlineMx2[1])) {
          inlineItems.push({ desc: inlineMx2[1].trim(), ref: inlineMx2[2], val: parseMoney(inlineMx2[3]) })
          foundInline = true
        }
        if (!foundInline && /[a-zA-Z\u00C0-\u017F]{3,}/.test(line)) {
          const moneyInLine2 = Array.from(line.matchAll(MONEY_INLINE))
          if (moneyInLine2.length >= 2) {
            const sl = moneyInLine2[moneyInLine2.length - 2]
            const la = moneyInLine2[moneyInLine2.length - 1]
            const dp = line.slice(0, sl.index!).trim()
            if (dp.length >= 3 && /[a-zA-Z\u00C0-\u017F]{3,}/.test(dp)) {
              inlineItems.push({ desc: dp, ref: sl[0], val: parseMoney(la[0]) })
              foundInline = true
            }
          }
        }
        if (foundInline) { i++; continue }
        break
      }
    }

    const tableNums = tableNumRaws.map(r => parseMoney(r))
    const numDescs = tableDescs.length

    // Separar referencias e valores.
    // Estrategia: encontrar o ponto de transicao onde aparece o primeiro
    // valor com separador de milhar (ex: 7.291,82). Tudo antes sao referencias,
    // tudo a partir sao valores.
    let tableVals: number[] = []
    if (numDescs > 0 && tableNums.length > 0) {
      // Encontrar indice da transicao (primeiro numero com milhar)
      let transitionIdx = -1
      for (let k = 0; k < tableNumRaws.length; k++) {
        if (/\d\.\d{3},/.test(tableNumRaws[k])) {
          transitionIdx = k
          break
        }
      }

      if (transitionIdx >= 0 && tableNums.length - transitionIdx >= numDescs) {
        // Valores comecam no ponto de transicao
        tableVals = tableNums.slice(transitionIdx, transitionIdx + numDescs)
      } else if (tableNums.length >= numDescs * 2) {
        // Exatamente 2*N: primeira metade refs, segunda metade vals
        tableVals = tableNums.slice(numDescs, numDescs * 2)
      } else if (tableNums.length >= numDescs) {
        // Pegar os ultimos N numeros como valores
        tableVals = tableNums.slice(tableNums.length - numDescs)
      } else {
        tableVals = tableNums
      }
    }

    // Criar eventos de vencimento: codigo[j] -> descricao[j] -> valor[j]
    for (let j = 0; j < Math.min(numDescs, tableVals.length); j++) {
      const code = j < tableCodes.length ? tableCodes[j] : ''
      const desc = tableDescs[j]
      const val = tableVals[j]

      if (val <= 0) continue
      const cleanDesc = desc.replace(/\.\s*$/, '').trim()
      const descKey = `${normalizeText(cleanDesc)}|${val.toFixed(2)}`
      if (addedDescKeys.has(descKey)) continue
      addedDescKeys.add(descKey)

      const field = classifyForField(code, cleanDesc, false)
      addEvent(field, cleanDesc, val, code)
    }

    // Eventos de linhas inline mistas (ex: "DIFERENCA MEDIA VALOR 13o . 0,00 578,32")
    for (const ie of inlineItems) {
      if (ie.val <= 0) continue
      const cleanDesc = ie.desc.replace(/\.\s*$/, '').trim()
      const descKey = `${normalizeText(cleanDesc)}|${ie.val.toFixed(2)}`
      if (addedDescKeys.has(descKey)) continue
      addedDescKeys.add(descKey)

      const field = classifyForField('', cleanDesc, false)
      addEvent(field, cleanDesc, ie.val)
    }
  }

  // -- Reconciliacao --
  const sumDescontos = events.filter(e => e.type === 'desconto').reduce((s, e) => s + e.value, 0)
  const sumProventos = events.filter(e => e.type === 'provento').reduce((s, e) => s + e.value, 0)

  // Inferir totais faltantes a partir dos disponiveis
  if (!totalDeductions && sumDescontos > 0) totalDeductions = sumDescontos
  if (!totalGross && netSalary > 0 && totalDeductions > 0) totalGross = netSalary + totalDeductions
  if (!netSalary && totalGross > 0 && totalDeductions > 0) netSalary = totalGross - totalDeductions
  if (!totalDeductions && totalGross > 0 && netSalary > 0) totalDeductions = totalGross - netSalary

  // Se temos Total de Vencimentos mas nenhum provento individual, criar item generico
  if (totalGross > 0 && sumProventos === 0) {
    events.push({ id: `e-${eventIdx++}`, description: 'Total de Vencimentos', type: 'provento', value: totalGross })
  }

  // Reconciliacao de descontos: diferenca entre total do PDF e soma dos itens
  if (totalDeductions > 0 && sumDescontos > 0) {
    const diffDesc = Number((totalDeductions - sumDescontos).toFixed(2))
    if (diffDesc > 0.01) {
      events.push({ id: `e-${eventIdx++}`, description: 'Outros Descontos (reconciliacao)', type: 'desconto', value: diffDesc })
    }
  }

  // Reconciliacao de proventos: diferenca entre total do PDF e soma dos itens
  const sumProventosAfter = events.filter(e => e.type === 'provento').reduce((s, e) => s + e.value, 0)
  if (totalGross > 0 && sumProventosAfter > 0) {
    const diffProv = Number((totalGross - sumProventosAfter).toFixed(2))
    if (diffProv > 0.01) {
      events.push({ id: `e-${eventIdx++}`, description: 'Outros Rendimentos (reconciliacao)', type: 'provento', value: diffProv })
    }
  }

  // Se nao temos dados significativos, retornar null
  if (!employeeName && !totalGross && !netSalary && events.length === 0) return null

  return {
    name: employeeName || undefined,
    cpf: employeeCpf || undefined,
    baseSalary,
    commissions,
    employeePurchases: purchases,
    vouchers: irrf,
    advances,
    inss,
    fgts,
    events,
    totalGross,
    totalDeductions,
    netSalary,
  }
}

// == Vinculacao com funcionarios =============================================

export function matchEmployee(
  payslip: { name?: string; cpf?: string },
  employees: any[],
  cpfMap: Map<string, any>
): any | null {
  if (payslip.cpf) {
    const key = payslip.cpf.replace(/[^\d]/g, '')
    const found = cpfMap.get(key)
    if (found) return found
  }
  if (payslip.name) {
    const n = normalizeName(payslip.name)
    if (n.length < 3) return null
    const exact = employees.filter(e => normalizeName(e.name || '') === n)
    if (exact.length === 1) return exact[0]
    if (exact.length === 0) {
      const partial = employees.filter(e => {
        const en = normalizeName(e.name || '')
        return en.length > 3 && n.length > 3 && (en.includes(n) || n.includes(en))
      })
      if (partial.length === 1) return partial[0]
    }
  }
  return null
}

// == Funcoes auxiliares de pdf2json ==========================================

function extractTextFromPages(data: any): string {
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

// == Funcao principal: parse completo do PDF ================================

export async function parsePdfBuffer(buf: Buffer): Promise<PdfParseResult> {
  await loadRubricas()

  const { createRequire } = await import('module')
  const require = createRequire(import.meta.url)

  let text = ''
  let totalPages = 0

  // -- Metodo 1: pdf-parse (extracao de texto) --
  try {
    const pdfParseMod = require('pdf-parse')
    const pdfParse = pdfParseMod?.default || pdfParseMod
    const parsed = await pdfParse(buf)
    text = String(parsed?.text || '').trim()
    totalPages = parsed?.numpages || 0
  } catch { /* pdf-parse falhou */ }

  // -- Metodo 2: pdf2json (texto alternativo) --
  if (!text.trim()) {
    try {
      const mod = require('pdf2json')
      const PDFCtor = mod?.PDFParser || mod?.default || mod
      if (PDFCtor) {
        const result = await new Promise<string>((resolve, reject) => {
          try {
            const parser = new PDFCtor()
            parser.on('pdfParser_dataError', (err: any) => reject(err?.parserError || err))
            parser.on('pdfParser_dataReady', (data: any) => {
              try {
                const txt = typeof (parser as any).getRawTextContent === 'function'
                  ? (parser as any).getRawTextContent()
                  : extractTextFromPages(data)
                const pages = Array.isArray(data?.Pages) ? data.Pages : []
                if (!totalPages) totalPages = pages.length
                resolve(String(txt || ''))
              } catch {
                resolve('')
              }
            })
            parser.parseBuffer(buf)
          } catch (e) {
            reject(e)
          }
        })
        if (!text && result) text = result
      }
    } catch { /* pdf2json falhou */ }
  }

  if (!text.trim()) {
    return { payslips: [], competence: {}, rawText: '', totalPages, employerPagesCount: 0 }
  }

  const competence = detectCompetence(text)

  // Dividir em recibos individuais e filtrar via empregador
  const allReceipts = splitIntoReceipts(text)
  const employerReceipts = filterEmployerReceipts(allReceipts)
  const employerPagesCount = employerReceipts.length

  // Parsear cada recibo
  const payslips: ParsedPayslip[] = []
  const seen = new Set<string>()

  for (const receipt of employerReceipts) {
    const ps = parseTextReceipt(receipt)
    if (!ps) continue
    // Deduplicar por nome + liquido
    const key = `${normalizeName(ps.name || '')}|${ps.netSalary}|${ps.totalGross}`
    if (seen.has(key)) continue
    seen.add(key)
    payslips.push(ps)
  }

  return {
    payslips,
    competence,
    rawText: text,
    totalPages,
    employerPagesCount,
  }
}

// == Parse de texto puro (para import-extracted) ============================

export async function parseTextPayslips(pagesText: string): Promise<{
  payslips: ParsedPayslip[]
  competence: { month?: number; year?: number }
}> {
  await loadRubricas()
  const competence = detectCompetence(pagesText)
  const allReceipts = splitIntoReceipts(pagesText)
  const employerReceipts = filterEmployerReceipts(allReceipts)
  const payslips: ParsedPayslip[] = []
  const seen = new Set<string>()
  for (const receipt of employerReceipts) {
    const ps = parseTextReceipt(receipt)
    if (!ps) continue
    const key = `${normalizeName(ps.name || '')}|${ps.netSalary}|${ps.totalGross}`
    if (seen.has(key)) continue
    seen.add(key)
    payslips.push(ps)
  }
  return { payslips, competence }
}
