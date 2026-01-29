import type { Employee, PayrollItem, Vacation, MedicalCertificate, Store, Position, Resignation } from '@/types'

export const mockStores: Store[] = [
  { id: '1', name: 'Loja Centro', cnpj: '12.345.678/0001-01', city: 'Sao Paulo' },
  { id: '2', name: 'Loja Shopping Cidade', cnpj: '12.345.678/0002-02', city: 'Sao Paulo' },
  { id: '3', name: 'Loja Shopping Norte', cnpj: '12.345.678/0003-03', city: 'Campinas' },
  { id: '4', name: 'Loja Bairro Sul', cnpj: '12.345.678/0004-04', city: 'Sao Paulo' },
  { id: '5', name: 'Loja Outlet', cnpj: '12.345.678/0005-05', city: 'Ribeirao Preto' },
]

export const mockPositions: Position[] = [
  { id: '1', name: 'Gerente de Vendas', cbo: '1414-10', baseSalary: 5500, storeId: '1', description: 'Gerencia equipe de vendas' },
  { id: '2', name: 'Vendedor', cbo: '5211-10', baseSalary: 2800, storeId: '1', description: 'Atendimento ao cliente' },
  { id: '3', name: 'Analista de RH', cbo: '2524-05', baseSalary: 4200, storeId: '1', description: 'Gestao de pessoas' },
  { id: '4', name: 'Estoquista', cbo: '4141-05', baseSalary: 2200, storeId: '3', description: 'Controle de estoque' },
  { id: '5', name: 'Gerente Financeiro', cbo: '1421-05', baseSalary: 6800, storeId: '1', description: 'Gestao financeira' },
  { id: '6', name: 'Assistente Administrativo', cbo: '4110-10', baseSalary: 2500, storeId: '5', description: 'Suporte administrativo' },
  { id: '7', name: 'Caixa', cbo: '4211-25', baseSalary: 2000, storeId: '2', description: 'Operacao de caixa' },
]

export const mockEmployees: Employee[] = [
  {
    id: '1',
    name: 'Maria Silva',
    email: 'maria.silva@ondacalcados.com.br',
    phone: '(11) 99999-1111',
    cpf: '123.456.789-00',
    positionId: '1',
    department: 'Vendas',
    storeId: '1',
    hireDate: '2020-03-15',
    birthDate: '1990-01-28',
    status: 'active',
    address: {
      street: 'Rua das Flores',
      number: '123',
      city: 'Sao Paulo',
      state: 'SP',
      zipCode: '01234-567',
    },
  },
  {
    id: '2',
    name: 'Joao Santos',
    email: 'joao.santos@ondacalcados.com.br',
    phone: '(11) 99999-2222',
    cpf: '234.567.890-11',
    positionId: '2',
    department: 'Vendas',
    storeId: '2',
    hireDate: '2021-06-01',
    birthDate: '1995-01-15',
    status: 'active',
    address: {
      street: 'Av. Principal',
      number: '456',
      city: 'Sao Paulo',
      state: 'SP',
      zipCode: '01234-568',
    },
  },
  {
    id: '3',
    name: 'Ana Oliveira',
    email: 'ana.oliveira@ondacalcados.com.br',
    phone: '(11) 99999-3333',
    cpf: '345.678.901-22',
    positionId: '3',
    department: 'Recursos Humanos',
    storeId: '1',
    hireDate: '2019-01-10',
    birthDate: '1988-05-20',
    status: 'vacation',
    address: {
      street: 'Rua do Comercio',
      number: '789',
      city: 'Sao Paulo',
      state: 'SP',
      zipCode: '01234-569',
    },
  },
  {
    id: '4',
    name: 'Carlos Ferreira',
    email: 'carlos.ferreira@ondacalcados.com.br',
    phone: '(11) 99999-4444',
    cpf: '456.789.012-33',
    positionId: '4',
    department: 'Logistica',
    storeId: '3',
    hireDate: '2024-03-10',
    birthDate: '1992-08-10',
    status: 'active',
    address: {
      street: 'Rua do Estoque',
      number: '101',
      city: 'Sao Paulo',
      state: 'SP',
      zipCode: '01234-570',
    },
  },
  {
    id: '5',
    name: 'Patricia Lima',
    email: 'patricia.lima@ondacalcados.com.br',
    phone: '(11) 99999-5555',
    cpf: '567.890.123-44',
    positionId: '5',
    department: 'Financeiro',
    storeId: '1',
    hireDate: '2018-05-15',
    birthDate: '1985-12-03',
    status: 'active',
    address: {
      street: 'Av. Financeira',
      number: '202',
      city: 'Sao Paulo',
      state: 'SP',
      zipCode: '01234-571',
    },
  },
  {
    id: '6',
    name: 'Roberto Costa',
    email: 'roberto.costa@ondacalcados.com.br',
    phone: '(11) 99999-6666',
    cpf: '678.901.234-55',
    positionId: '2',
    department: 'Vendas',
    storeId: '4',
    hireDate: '2024-12-01',
    birthDate: '1998-01-20',
    status: 'active',
    address: {
      street: 'Rua Nova',
      number: '303',
      city: 'Sao Paulo',
      state: 'SP',
      zipCode: '01234-572',
    },
  },
  {
    id: '7',
    name: 'Fernanda Souza',
    email: 'fernanda.souza@ondacalcados.com.br',
    phone: '(11) 99999-7777',
    cpf: '789.012.345-66',
    positionId: '6',
    department: 'Administrativo',
    storeId: '5',
    hireDate: '2021-09-01',
    birthDate: '1993-07-15',
    status: 'terminated',
    terminationDate: '2024-12-15',
    terminationReason: 'Pedido de demissao',
    address: {
      street: 'Rua Admin',
      number: '404',
      city: 'Sao Paulo',
      state: 'SP',
      zipCode: '01234-573',
    },
  },
  {
    id: '8',
    name: 'Lucas Mendes',
    email: 'lucas.mendes@ondacalcados.com.br',
    phone: '(11) 99999-8888',
    cpf: '890.123.456-77',
    positionId: '2',
    department: 'Vendas',
    storeId: '2',
    hireDate: '2025-01-15',
    birthDate: '1997-03-25',
    status: 'active',
    address: {
      street: 'Rua das Palmeiras',
      number: '505',
      city: 'Sao Paulo',
      state: 'SP',
      zipCode: '01234-574',
    },
  },
]

export const mockPayroll: PayrollItem[] = [
  {
    id: '1',
    employeeId: '1',
    employeeName: 'Maria Silva',
    month: 1,
    year: 2026,
    storeId: '1',
    positionId: '1',
    baseSalary: 5500,
    commissions: 850,
    employeePurchases: 150,
    vouchers: 200,
    advances: 0,
    inss: 605,
    fgts: 508,
    grossSalary: 6350,
    totalDeductions: 955,
    netSalary: 5395,
    paymentType: 'contabil',
    status: 'pending',
  },
  {
    id: '2',
    employeeId: '2',
    employeeName: 'Joao Santos',
    month: 1,
    year: 2026,
    storeId: '2',
    positionId: '2',
    baseSalary: 2800,
    commissions: 450,
    employeePurchases: 0,
    vouchers: 100,
    advances: 200,
    inss: 325,
    fgts: 260,
    grossSalary: 3250,
    totalDeductions: 625,
    netSalary: 2625,
    paymentType: 'contabil',
    status: 'pending',
  },
  {
    id: '3',
    employeeId: '4',
    employeeName: 'Carlos Ferreira',
    month: 1,
    year: 2026,
    storeId: '3',
    positionId: '4',
    baseSalary: 2200,
    commissions: 0,
    employeePurchases: 80,
    vouchers: 0,
    advances: 0,
    inss: 242,
    fgts: 176,
    grossSalary: 2200,
    totalDeductions: 322,
    netSalary: 1878,
    paymentType: 'contabil',
    status: 'paid',
    paymentDate: '2026-01-05',
  },
  {
    id: '4',
    employeeId: '5',
    employeeName: 'Patricia Lima',
    month: 1,
    year: 2026,
    storeId: '1',
    positionId: '5',
    baseSalary: 6800,
    commissions: 0,
    employeePurchases: 0,
    vouchers: 0,
    advances: 500,
    inss: 748,
    fgts: 544,
    grossSalary: 6800,
    totalDeductions: 1248,
    netSalary: 5552,
    paymentType: 'contabil',
    status: 'pending',
  },
  {
    id: '5',
    employeeId: '6',
    employeeName: 'Roberto Costa',
    month: 1,
    year: 2026,
    storeId: '4',
    positionId: '2',
    baseSalary: 2800,
    commissions: 320,
    employeePurchases: 50,
    vouchers: 0,
    advances: 0,
    inss: 343,
    fgts: 250,
    grossSalary: 3120,
    totalDeductions: 393,
    netSalary: 2727,
    paymentType: 'nao_contabil',
    status: 'paid',
    paymentDate: '2026-01-05',
  },
]

export const mockVacations: Vacation[] = [
  {
    id: '1',
    employeeId: '3',
    employeeName: 'Ana Oliveira',
    startDate: '2026-01-20',
    endDate: '2026-02-08',
    days: 20,
    paidAmount: 5600,
    status: 'in-progress',
    acquisitionPeriodStart: '2024-01-10',
    acquisitionPeriodEnd: '2025-01-09',
  },
  {
    id: '2',
    employeeId: '1',
    employeeName: 'Maria Silva',
    startDate: '2026-02-15',
    endDate: '2026-03-06',
    days: 20,
    paidAmount: 7333.33,
    status: 'scheduled',
    acquisitionPeriodStart: '2025-03-15',
    acquisitionPeriodEnd: '2026-03-14',
  },
  {
    id: '3',
    employeeId: '4',
    employeeName: 'Carlos Ferreira',
    startDate: '2026-03-01',
    endDate: '2026-03-15',
    days: 15,
    paidAmount: 2933.33,
    status: 'scheduled',
    acquisitionPeriodStart: '2025-03-10',
    acquisitionPeriodEnd: '2026-03-09',
  },
]

export function getVacationDeadline(hireDate: string): Date {
  const hire = new Date(hireDate)
  const today = new Date()
  
  let periodStart = new Date(hire)
  while (periodStart < today) {
    periodStart.setFullYear(periodStart.getFullYear() + 1)
  }
  periodStart.setFullYear(periodStart.getFullYear() - 1)
  
  const deadline = new Date(periodStart)
  deadline.setFullYear(deadline.getFullYear() + 2)
  
  return deadline
}

export function getVacationAlertLevel(employee: Employee, vacations: Vacation[]): { level: 'critical' | 'attention' | 'planning' | 'ok'; daysUntilDeadline: number } {
  const today = new Date()
  
  const hasVacation = vacations.some(v => 
    v.employeeId === employee.id && 
    (v.status === 'scheduled' || v.status === 'in-progress' || v.status === 'completed')
  )
  
  if (hasVacation) {
    return { level: 'ok', daysUntilDeadline: 999 }
  }
  
  const deadline = getVacationDeadline(employee.hireDate)
  const diffTime = deadline.getTime() - today.getTime()
  const daysUntilDeadline = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  if (daysUntilDeadline <= 15) {
    return { level: 'critical', daysUntilDeadline }
  } else if (daysUntilDeadline <= 30) {
    return { level: 'attention', daysUntilDeadline }
  } else if (daysUntilDeadline <= 60) {
    return { level: 'planning', daysUntilDeadline }
  }
  
  return { level: 'ok', daysUntilDeadline }
}

export const mockMedicalCertificates: MedicalCertificate[] = [
  {
    id: '1',
    employeeId: '2',
    employeeName: 'Joao Santos',
    startDate: '2026-01-10',
    days: 3,
    cid: 'J11',
    notes: 'Gripe',
    createdAt: '2026-01-10',
  },
  {
    id: '2',
    employeeId: '4',
    employeeName: 'Carlos Ferreira',
    startDate: '2026-01-20',
    days: 2,
    cid: 'M54.5',
    notes: 'Dor lombar',
    createdAt: '2026-01-20',
  },
  {
    id: '3',
    employeeId: '1',
    employeeName: 'Maria Silva',
    startDate: '2025-12-15',
    days: 5,
    cid: 'J06.9',
    notes: 'Infeccao respiratoria',
    createdAt: '2025-12-15',
  },
]

export const mockResignations: Resignation[] = [
  {
    id: '1',
    employeeId: '7',
    employeeName: 'Fernanda Souza',
    storeId: '5',
    exitDate: '2024-12-15',
    reason: 'pedido',
    totalAmount: 8500,
    notes: 'Funcionaria pediu demissao para nova oportunidade',
    createdAt: '2024-12-15',
  },
  {
    id: '2',
    employeeId: '9',
    employeeName: 'Pedro Alves',
    storeId: '2',
    exitDate: '2025-11-30',
    reason: 'sem_justa_causa',
    totalAmount: 12350,
    notes: 'Desligamento por reducao de quadro',
    createdAt: '2025-11-30',
  },
  {
    id: '3',
    employeeId: '10',
    employeeName: 'Juliana Costa',
    storeId: '1',
    exitDate: '2026-01-10',
    reason: 'acordo',
    totalAmount: 6800,
    notes: 'Acordo mutuo entre as partes',
    createdAt: '2026-01-10',
  },
]

// Legacy export for backwards compatibility
export const stores = mockStores.map(s => s.name)

// Helper to get store name by ID
export function getStoreName(storeId: string): string {
  return mockStores.find(s => s.id === storeId)?.name || 'N/A'
}

// Helper to get position by ID
export function getPosition(positionId: string): Position | undefined {
  return mockPositions.find(p => p.id === positionId)
}

// Helper to get position name by ID
export function getPositionName(positionId: string): string {
  return mockPositions.find(p => p.id === positionId)?.name || 'N/A'
}

// Helper to get base salary by position ID
export function getBaseSalary(positionId: string): number {
  return mockPositions.find(p => p.id === positionId)?.baseSalary || 0
}
