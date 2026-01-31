import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

type RubricaType = 'provento' | 'desconto'
type SystemKey = 'comissao' | 'compras' | 'imposto_renda' | 'inss' | 'fgts'

function norm(s: string) {
  return s.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toUpperCase()
}

function has(pattern: RegExp, s: string) {
  return pattern.test(s)
}

export function mapRubricaToSystemField(description: string, type: RubricaType): SystemKey | null {
  const d = norm(description)

  if (type === 'provento') {
    const commissionSubs = [
      'COMISS', 'VENDAS', 'PREMIO', 'BONIFICACAO', 'PRODUTIVIDADE', 'PREMIACAO'
    ]
    if (commissionSubs.some(k => d.includes(k))) return 'comissao'
  }

  if (has(/\bI\.?\s*R\.?\s*R\.?\s*F\b/, d) || d.includes('IMPOSTO DE RENDA') || has(/\bIMP\.?\s*RENDA\b/, d)) {
    return 'imposto_renda'
  }

  if (has(/\bI\.?\s*N\.?\s*S\.?\s*S\b/, d) || d.includes('PREVIDENCIA') || d.includes('CONTRIBUICAO PREVIDENCIARIA')) {
    return 'inss'
  }

  if (has(/\bF\.?\s*G\.?\s*T\.?\s*S\b/, d) || d.includes('FUNDO DE GARANTIA')) {
    return 'fgts'
  }

  if (type === 'desconto') {
    const purchaseSubs = [
      'COMPRAS', 'FARMACIA', 'DROGARIA', 'CONVENIO', 'SUPERMERCADO', 'VALE COMPRA', 'RANCHO', 'CLUBE', 'UNIMED', 'ASSO'
    ]
    if (purchaseSubs.some(k => d.includes(k))) return 'compras'
  }

  return null
}
