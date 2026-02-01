export type RubricaType = 'base' | 'provento' | 'desconto' | 'fgts'

export type Rubrica = {
  code?: string
  description: string
  type: RubricaType
  synonyms?: string[]
}

function norm(s: string) {
  return s
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

const STATIC_RUBRICAS: Rubrica[] = [
  { code: '8781', description: 'Dias Normais', type: 'base', synonyms: ['salario base', 'dias normais', 'base salarial'] },
  { code: '250', description: 'Reflexo Extras DSR', type: 'provento', synonyms: ['reflexo extras dsr', 'reflexo dsr'] },
  { code: '1134', description: 'Abono Domingo 50%', type: 'provento', synonyms: ['abono domingo', 'abono 50', 'domingo'] },
  { code: '1138', description: 'Horas Domingo', type: 'provento', synonyms: ['horas domingo', 'hora domingo', 'hora extra domingo'] },
  { code: '8181', description: 'Diferenca Media Hora 13o', type: 'provento', synonyms: ['diferenca media hora 13o', 'media hora 13', 'diferenca media hora'] },
  { code: '8182', description: 'Diferenca Media Valor 13o', type: 'provento', synonyms: ['diferenca media valor 13o', 'media valor 13', 'diferenca 13'] },
  { code: '203', description: 'Gratificacao', type: 'provento', synonyms: ['gratificacao', 'gratificacao salario', 'premio'] },
  { code: '244', description: 'Compras Efetuadas na Empresa', type: 'desconto', synonyms: ['compras efetuadas na empresa', 'compras na empresa', 'consumo'] },
  { code: '534', description: 'Vale Avulso', type: 'desconto', synonyms: ['vale avulso', 'vale mercadoria', 'vale'] },
  { code: '232', description: 'Vale Transporte', type: 'desconto', synonyms: ['vale transporte', 'vt', 'transporte'] },
  { code: '998', description: 'INSS', type: 'desconto', synonyms: ['inss', 'previdencia'] },
  { code: '899', description: 'Imposto de Renda', type: 'desconto', synonyms: ['imposto de renda', 'irrf', 'ir'] },
  { code: 'fgts', description: 'FGTS', type: 'fgts', synonyms: ['fgts', 'f.g.t.s'] },
  { description: 'Contribuicao Negocial', type: 'desconto', synonyms: ['contribuicao negocial', 'contribuicao sindical', 'negocial'] },
]

let cachedRubricas: Rubrica[] | null = null
 
function catToType(cat: string): RubricaType {
  const n = norm(cat)
  if (n.includes('fgts')) return 'fgts'
  if (n.includes('inss') || n.includes('irrf') || n.includes('imposto') || n.includes('desconto') || n.includes('vale') || n.includes('contribuicao')) return 'desconto'
  if (n.includes('salario') || n.includes('base')) return 'base'
  return 'provento'
}

export async function loadRubricas(): Promise<Rubrica[]> {
  if (cachedRubricas) return cachedRubricas
  try {
    const pathMod = await import('node:path').catch(() => null as any)
    const fsMod = await import('node:fs').catch(() => null as any)
    const list: Rubrica[] = []
    if (pathMod && fsMod) {
      const jsonPath = pathMod.resolve(process.cwd(), 'rubricas', 'solution', 'rubricas_mapping.json')
      if (fsMod.existsSync(jsonPath)) {
        try {
          const raw = fsMod.readFileSync(jsonPath, 'utf-8')
          const obj = JSON.parse(raw) as Record<string, string>
          for (const [desc, cat] of Object.entries(obj)) {
            const type = catToType(cat)
            list.push({ description: desc, type, synonyms: [desc] })
          }
        } catch {}
      }
      const XLSXMod = await import('xlsx').catch(() => null as any)
      if (XLSXMod) {
        const xlsPath = pathMod.resolve(process.cwd(), 'rubricas', 'Rubricas.xls')
        const xlsxPath = pathMod.resolve(process.cwd(), 'rubricas', 'Rubricas.xlsx')
        const filePath = fsMod.existsSync(xlsxPath) ? xlsxPath : xlsPath
        if (fsMod.existsSync(filePath)) {
          try {
            const wb = XLSXMod.readFile(filePath)
            const sheetName = wb.SheetNames[0]
            const sheet = wb.Sheets[sheetName]
            const rows: any[] = XLSXMod.utils.sheet_to_json(sheet, { defval: '' })
            for (const row of rows) {
              const code = String(row.Codigo || row.Código || row.codigo || row.code || '').trim()
              const description = String(row.Descricao || row.Descrição || row.descricao || row.description || '').trim()
              const typeRaw = String(row.Tipo || row.tipo || '').trim()
              const synonymsRaw = String(row.Sinonimos || row.Sinônimos || row.sinonimos || row.synonyms || '').trim()
              let type: RubricaType | undefined
              if (typeRaw) {
                const t = norm(typeRaw)
                if (t.includes('provento') || t.includes('vencimento')) type = 'provento'
                else if (t.includes('desconto')) type = 'desconto'
                else if (t.includes('base')) type = 'base'
                else if (t.includes('fgts')) type = 'fgts'
              }
              if (!type) {
                const nd = norm(description)
                if (nd.includes('fgts')) type = 'fgts'
                else if (nd.includes('dias normais') || nd.includes('salario base')) type = 'base'
                else if (nd.includes('inss') || nd.includes('imposto') || nd.includes('vale') || nd.includes('compra') || nd.includes('contribuicao')) type = 'desconto'
                else type = 'provento'
              }
              const synonyms = synonymsRaw
                ? synonymsRaw.split(/[;,]/).map((s: string) => s.trim()).filter(Boolean)
                : [description]
              list.push({ code: code || undefined, description, type, synonyms })
            }
          } catch {}
        }
      }
    }
    const dedup = new Map<string, Rubrica>()
    for (const r of [...STATIC_RUBRICAS, ...list]) {
      const key = norm(r.description)
      if (!dedup.has(key)) dedup.set(key, r)
    }
    cachedRubricas = Array.from(dedup.values())
    return cachedRubricas
  } catch {
    cachedRubricas = [...STATIC_RUBRICAS]
    return cachedRubricas
  }
}

export async function getRubricaType(input: string): Promise<RubricaType | null> {
  const list = await loadRubricas()
  const n = norm(input)
  for (const r of list) {
    if (norm(r.description) === n) return r.type
    if (r.synonyms && r.synonyms.some(s => norm(s) === n)) return r.type
  }
  // fuzzy containment
  for (const r of list) {
    const nr = norm(r.description)
    if (n.includes(nr) || nr.includes(n)) return r.type
  }
  // Heuristic fallback
  if (/\bdias?\s+normais\b|\bsalario\s+base\b/.test(n)) return 'base'
  if (/\bfgts\b|f\.?g\.?t\.?s/.test(n)) return 'fgts'
  if (/inss|previd|irrf|imposto\s+de\s+renda|vale|contribuicao|descont/.test(n)) return 'desconto'
  if (/gratific|hora\s+extra|reflexo|abono|domingo|adicional|premio|diferenca/.test(n)) return 'provento'
  return null
}

export function getRubricaTypeSync(input: string): RubricaType | null {
  const list = cachedRubricas || STATIC_RUBRICAS
  const n = norm(input)
  for (const r of list) {
    if (norm(r.description) === n) return r.type
    if (r.synonyms && r.synonyms.some(s => norm(s) === n)) return r.type
  }
  for (const r of list) {
    const nr = norm(r.description)
    if (n.includes(nr) || nr.includes(n)) return r.type
  }
  if (/\bdias?\s+normais\b|\bsalario\s+base\b/.test(n)) return 'base'
  if (/\bfgts\b|f\.?g\.?t\.?s/.test(n)) return 'fgts'
  if (/inss|previd|irrf|imposto\s+de\s+renda|vale|contribuicao|descont/.test(n)) return 'desconto'
  if (/gratific|hora\s+extra|reflexo|abono|domingo|adicional|premio|diferenca/.test(n)) return 'provento'
  return null
}
