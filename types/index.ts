// Database types with snake_case to match Supabase schema

export interface Store {
  id: string
  name: string
  cnpj?: string
  city?: string
  created_at?: string
  updated_at?: string
}

export interface Position {
  id: string
  name: string
  cbo?: string
  base_salary?: number
  baseSalary?: number
  store_id?: string
  storeId?: string
  description?: string
  created_at?: string
  updated_at?: string
}

export interface Employee {
  id: string
  name: string
  email: string
  phone?: string
  cpf: string
  position_id?: string
  positionId?: string
  store_id?: string
  storeId?: string
  hire_date?: string
  hireDate?: string
  birth_date?: string
  birthDate?: string
  status: 'active' | 'inactive' | 'vacation' | 'terminated'
  avatar_url?: string
  avatarUrl?: string
  address_street?: string
  address_number?: string
  address_city?: string
  address_state?: string
  address_zip?: string
  address_zip_code?: string
  termination_date?: string
  terminationDate?: string
  termination_reason?: string
  terminationReason?: string
  created_at?: string
  updated_at?: string
  role?: string
  department?: string
  salary?: number
  address?: {
    street: string
    number: string
    city: string
    state: string
    zipCode: string
  }
  // Joined data
  position?: Position
  store?: Store
}

export interface Vacation {
  id: string
  employee_id?: string
  employeeId?: string
  start_date?: string
  startDate?: string
  end_date?: string
  endDate?: string
  days: number
  paid_amount?: number
  paidAmount?: number
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled'
  acquisition_period_start?: string
  acquisitionPeriodStart?: string
  acquisition_period_end?: string
  acquisitionPeriodEnd?: string
  created_at?: string
  createdAt?: string
  updated_at?: string
  // Joined data
  employeeName?: string
  employee?: Employee
}

export interface MedicalCertificate {
  id: string
  employee_id?: string
  employeeId?: string
  start_date?: string
  startDate?: string
  days: number
  cid?: string
  notes?: string
  created_at?: string
  createdAt?: string
  // Joined data
  employeeName?: string
  employee?: Employee
}

export interface Resignation {
  id: string
  employee_id?: string
  employeeId?: string
  store_id?: string
  storeId?: string
  exit_date?: string
  exitDate?: string
  reason: 'pedido' | 'sem_justa_causa' | 'justa_causa' | 'acordo' | 'termino_contrato'
  total_amount?: number
  totalAmount?: number
  notes?: string
  created_at?: string
  createdAt?: string
  // Joined data
  employeeName?: string
  employee?: Employee
  store?: Store
}

export interface PayrollEvent {
  id: string
  description: string
  type: 'provento' | 'desconto'
  value: number
}

export interface PayrollItem {
  id: string
  employee_id?: string
  employeeId?: string
  store_id?: string
  storeId?: string
  position_id?: string
  positionId?: string
  month: number
  year: number
  // Proventos
  base_salary?: number
  baseSalary?: number
  commissions: number
  // Descontos
  employee_purchases?: number
  employeePurchases?: number
  vouchers: number
  advances: number
  // Impostos
  inss: number
  fgts: number // Apenas informativo
  // Totais
  gross_salary?: number
  grossSalary?: number
  total_deductions?: number
  totalDeductions?: number
  net_salary?: number
  netSalary?: number
  // Classificacao
  payment_type?: 'contabil' | 'nao_contabil'
  paymentType?: 'contabil' | 'nao_contabil'
  status: 'pending' | 'paid'
  payment_date?: string
  paymentDate?: string
  // Custom events stored as JSON
  custom_events?: PayrollEvent[]
  customEvents?: PayrollEvent[]
  employeeName?: string
  settlement_date?: string
  settlementDate?: string
  settlement_location?: string
  settlementLocation?: string
  created_at?: string
  updated_at?: string
  // Joined data
  employee?: Employee
  store?: Store
  position?: Position
}

export interface UserProfile {
  id: string
  full_name?: string
  role: 'admin' | 'manager' | 'user'
  store_id?: string
  created_at?: string
  updated_at?: string
}

// Legacy types for compatibility (camelCase versions)
export type VacationAlertLevel = 'critical' | 'attention' | 'planning' | 'ok'

export interface User {
  id: string
  name: string
  email: string
  role: 'admin' | 'manager' | 'user'
}

export interface DashboardStats {
  totalEmployees: number
  activeEmployees: number
  onVacation: number
  totalCertificatesInPeriod: number
  birthdays: Employee[]
  upcomingVacations: Vacation[]
  vacationAlerts: {
    critical: Employee[]
    attention: Employee[]
    planning: Employee[]
  }
}
