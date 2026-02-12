// ---------------------------------------------------------------------------
// lib/rubricas.ts  --  Carregamento e consulta de rubricas (codigos de folha)
// ---------------------------------------------------------------------------
// Suporta 2.600+ rubricas carregadas do XLS da contabilidade.
// Oferece lookup por codigo numerico O(1) e por descricao O(1)/O(n).
// ---------------------------------------------------------------------------

export type RubricaType = 'base' | 'provento' | 'desconto' | 'informativa' | 'fgts'

export interface Rubrica {
  code: string
  description: string
  type: RubricaType
  unit?: string
  rate?: number
  synonyms?: string[]
}

// -- Normalizacao de texto --------------------------------------------------
export function norm(s: string): string {
  return s
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

// -- Rubricas estaticas (fallback minimo se o XLS nao carregar) -------------
const STATIC_RUBRICAS: Rubrica[] = [
  { code: '1', description: 'HORAS NORMAIS', type: 'base', synonyms: ['horas normais', 'salario base', 'dias normais', 'base salarial'] },
  { code: '10', description: 'HORAS REPOUSO REMUNERADO', type: 'provento', synonyms: ['repouso remunerado', 'dsr'] },
  { code: '12', description: '13 SALARIO INTEGRAL', type: 'provento', synonyms: ['13 salario', 'decimo terceiro'] },
  { code: '20', description: 'GRATIFICACAO', type: 'provento', synonyms: ['gratificacao', 'gratificacao salario'] },
  { code: '25', description: 'ADICIONAL NOTURNO 20%', type: 'provento', synonyms: ['adicional noturno'] },
  { code: '203', description: 'Gratificacao', type: 'provento', synonyms: ['gratificacao', 'premio'] },
  { code: '232', description: 'Vale Transporte', type: 'desconto', synonyms: ['vale transporte', 'vt'] },
  { code: '244', description: 'Compras Efetuadas na Empresa', type: 'desconto', synonyms: ['compras efetuadas na empresa', 'compras na empresa', 'consumo'] },
  { code: '250', description: 'Reflexo Extras DSR', type: 'provento', synonyms: ['reflexo extras dsr', 'reflexo dsr'] },
  { code: '534', description: 'Vale Avulso', type: 'desconto', synonyms: ['vale avulso', 'vale mercadoria'] },
  { code: '999', description: 'Imposto de Renda', type: 'desconto', synonyms: ['imposto de renda', 'irrf', 'ir'] },
  { code: '998', description: 'INSS', type: 'desconto', synonyms: ['inss', 'previdencia'] },
  { code: '1134', description: 'Abono Domingo 50%', type: 'provento', synonyms: ['abono domingo'] },
  { code: '1138', description: 'Horas Domingo', type: 'provento', synonyms: ['horas domingo'] },
  { code: '8181', description: 'Diferenca Media Hora 13o', type: 'provento', synonyms: ['diferenca media hora 13'] },
  { code: '8182', description: 'Diferenca Media Valor 13o', type: 'provento', synonyms: ['diferenca media valor 13'] },
  { code: '8781', description: 'Dias Normais', type: 'base', synonyms: ['dias normais'] },
]

// -- Cache e mapas ----------------------------------------------------------
let cachedList: Rubrica[] | null = null
let codeMap: Map<string, Rubrica> | null = null
let descMap: Map<string, Rubrica> | null = null

function buildMaps(list: Rubrica[]) {
  codeMap = new Map()
  descMap = new Map()
  for (const r of list) {
    if (r.code) codeMap.set(String(r.code), r)
    const key = norm(r.description)
    if (!descMap.has(key)) descMap.set(key, r)
    if (r.synonyms) {
      for (const s of r.synonyms) {
        const sk = norm(s)
        if (!descMap.has(sk)) descMap.set(sk, r)
      }
    }
  }
}

// -- Conversao do tipo texto do XLS para RubricaType ------------------------
function xlsTypeToRubricaType(raw: string, desc: string): RubricaType {
  const n = norm(raw)
  const nd = norm(desc)
  // Caso especial: FGTS sempre e tipo fgts
  if (/\bfgts\b|f\.?g\.?t\.?s/.test(nd)) return 'fgts'
  if (n === 'provento') return 'provento'
  if (n === 'desconto') return 'desconto'
  if (n === 'informativa' || n.includes('inf') && n.includes('dedut')) return 'informativa'
  if (n.includes('provento') || n.includes('vencimento')) return 'provento'
  if (n.includes('desconto')) return 'desconto'
  if (n.includes('informativ')) return 'informativa'
  return 'provento'
}

// -- Inferir tipo pela descricao (heuristica) -------------------------------
function inferTypeByDescription(desc: string): RubricaType {
  const n = norm(desc)
  if (/\bfgts\b|f\.?g\.?t\.?s/.test(n)) return 'fgts'
  if (/\bsalario\s*base\b|\bdias?\s*normais\b|\bhoras?\s*normais\b/.test(n)) return 'base'
  if (/\binss\b|\bprevid|\birrf\b|\bimposto\s*(de)?\s*renda\b/.test(n)) return 'desconto'
  if (/\bvale\b|\bcompra|\bcontribui|\bdescont|\bdeduc/.test(n)) return 'desconto'
  if (/\bgratific|\bhora\s*extra|\breflexo|\babono|\badicional|\bpremio|\bcomiss/.test(n)) return 'provento'
  return 'provento'
}

// -- Carregamento principal -------------------------------------------------
export async function loadRubricas(): Promise<Rubrica[]> {
  if (cachedList) return cachedList
  try {
    const pathMod = await import('node:path').catch(() => null as any)
    const fsMod = await import('node:fs').catch(() => null as any)
    const list: Rubrica[] = [...STATIC_RUBRICAS]

    if (pathMod && fsMod) {
      // Tentar carregar JSON de mapeamento customizado
      const jsonPath = pathMod.resolve(process.cwd(), 'rubricas', 'solution', 'rubricas_mapping.json')
      if (fsMod.existsSync(jsonPath)) {
        try {
          const raw = fsMod.readFileSync(jsonPath, 'utf-8')
          const obj = JSON.parse(raw) as Record<string, string>
          for (const [desc, cat] of Object.entries(obj)) {
            list.push({
              code: '',
              description: desc,
              type: xlsTypeToRubricaType(cat, desc),
              synonyms: [desc],
            })
          }
        } catch { /* ignora erro de parse */ }
      }

      // Carregar XLS/XLSX de rubricas
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

            // Detectar colunas dinamicamente a partir da linha de cabecalho.
            // O XLS tem titulo na primeira linha e cabecalho real na linha ~3
            // com colunas genericas (__EMPTY_N) por causa de celulas mescladas.
            const allKeys = rows.length > 0 ? Object.keys(rows[0]) : []
            const firstKey = allKeys[0] || 'BASE RUBRICAS'

            let colCode = firstKey
            let colDesc = ''
            let colType = ''
            let colUnit = ''
            let colRate = ''
            let headerRowIdx = -1

            // Procurar a linha de cabecalho (a que contem "Cod." na primeira coluna)
            for (let i = 0; i < Math.min(rows.length, 15); i++) {
              const val = norm(String(rows[i][firstKey] || ''))
              if (val.includes('cod')) {
                headerRowIdx = i
                for (const k of allKeys) {
                  const v = norm(String(rows[i][k] || ''))
                  if (v.includes('descri')) colDesc = k
                  else if (v === 'tipo') colType = k
                  else if (v === 'unidade') colUnit = k
                  else if (v === 'taxa') colRate = k
                }
                break
              }
            }

            // Fallback: se nao encontrou cabecalho, tentar colunas tipicas
            if (!colDesc) {
              for (const k of allKeys) {
                const kn = norm(k)
                if (kn.includes('descri') || kn.includes('description')) { colDesc = k; break }
              }
              if (!colDesc && allKeys.length > 2) colDesc = '__EMPTY_1'
            }
            if (!colType) {
              for (const k of allKeys) {
                const kn = norm(k)
                if (kn === 'tipo' || kn === 'type') { colType = k; break }
              }
              if (!colType && allKeys.length > 5) colType = '__EMPTY_4'
            }

            // Processar linhas de dados
            const startIdx = headerRowIdx >= 0 ? headerRowIdx + 1 : 0
            for (let i = startIdx; i < rows.length; i++) {
              const row = rows[i]
              const codeRaw = row[colCode]
              const descRaw = String(row[colDesc] || '').trim()
              const typeRaw = String(row[colType] || '').trim()
              const unitRaw = colUnit ? String(row[colUnit] || '').trim() : ''
              const rateRaw = colRate ? row[colRate] : undefined

              // Pular linhas sem codigo numerico ou sem descricao
              if (!descRaw) continue
              const code = typeof codeRaw === 'number' ? String(codeRaw) : String(codeRaw || '').trim()
              if (!code || !/^\d+$/.test(code)) continue

              let type: RubricaType
              if (typeRaw) {
                type = xlsTypeToRubricaType(typeRaw, descRaw)
              } else {
                type = inferTypeByDescription(descRaw)
              }

              list.push({
                code,
                description: descRaw,
                type,
                unit: unitRaw || undefined,
                rate: typeof rateRaw === 'number' ? rateRaw : undefined,
                synonyms: [descRaw],
              })
            }
          } catch { /* ignora erro ao ler XLS */ }
        }
      }
    }

    // Deduplicar: prioridade para rubricas do XLS (vem depois na lista)
    const dedup = new Map<string, Rubrica>()
    for (const r of list) {
      const key = r.code ? `code:${r.code}` : `desc:${norm(r.description)}`
      // Permite sobrescrever: a ultima entrada (do XLS) tem prioridade
      dedup.set(key, r)
    }

    cachedList = Array.from(dedup.values())
    buildMaps(cachedList)
    return cachedList
  } catch {
    cachedList = [...STATIC_RUBRICAS]
    buildMaps(cachedList)
    return cachedList
  }
}

// -- Busca por codigo (O(1)) ------------------------------------------------
export function getRubricaByCode(code: string | number): Rubrica | null {
  if (!codeMap) buildMaps(cachedList || STATIC_RUBRICAS)
  return codeMap!.get(String(code)) || null
}

// -- Busca por descricao (O(1) exato, O(n) fuzzy) --------------------------
export function getRubricaByDescription(input: string): Rubrica | null {
  if (!descMap) buildMaps(cachedList || STATIC_RUBRICAS)
  const n = norm(input)
  const exact = descMap!.get(n)
  if (exact) return exact
  const list = cachedList || STATIC_RUBRICAS
  for (const r of list) {
    const nr = norm(r.description)
    if (n.includes(nr) || nr.includes(n)) return r
  }
  return null
}

// -- Obter tipo por codigo ou descricao (sync) ------------------------------
export function getRubricaTypeSync(input: string): RubricaType | null {
  const trimmed = input.trim()
  // Tentar como codigo numerico primeiro
  if (/^\d+$/.test(trimmed)) {
    const byCode = getRubricaByCode(trimmed)
    if (byCode) return byCode.type
  }
  // Tentar por descricao
  const byDesc = getRubricaByDescription(trimmed)
  if (byDesc) return byDesc.type
  // Heuristica final
  return inferTypeByDescription(trimmed)
}

// -- Obter tipo por codigo ou descricao (async, garante carregamento) -------
export async function getRubricaType(input: string): Promise<RubricaType | null> {
  await loadRubricas()
  return getRubricaTypeSync(input)
}

// -- Verificar se rubricas ja estao carregadas ------------------------------
export function isLoaded(): boolean {
  return cachedList !== null
}

// -- Total de rubricas carregadas (debug) -----------------------------------
export function getRubricaCount(): number {
  return cachedList?.length || 0
}
