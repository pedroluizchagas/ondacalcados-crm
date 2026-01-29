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
  base_salary: number
  store_id?: string
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
  position_id: string
  store_id: string
  hire_date: string
  birth_date?: string
  status: 'active' | 'inactive' | 'vacation' | 'terminated'
  address_street?: string
  address_number?: string
  address_city?: string
  address_state?: string
  address_zip?: string
  termination_date?: string
  termination_reason?: string
  created_at?: string
  updated_at?: string
  // Joined data
  position?: Position
  store?: Store
}

export interface Vacation {
  id: string
  employee_id: string
  start_date: string
  end_date: string
  days: number
  paid_amount: number
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled'
  acquisition_period_start: string
  acquisition_period_end: string
  created_at?: string
  updated_at?: string
  // Joined data
  employee?: Employee
}

export interface MedicalCertificate {
  id: string
  employee_id: string
  start_date: string
  days: number
  cid?: string
  notes?: string
  created_at?: string
  // Joined data
  employee?: Employee
}

export interface Resignation {
  id: string
  employee_id: string
  store_id: string
  exit_date: string
  reason: 'pedido' | 'sem_justa_causa' | 'justa_causa' | 'acordo' | 'termino_contrato'
  total_amount: number
  notes?: string
  created_at?: string
  // Joined data
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
  employee_id: string
  store_id: string
  position_id: string
  month: number
  year: number
  // Proventos
  base_salary: number
  commissions: number
  // Descontos
  employee_purchases: number
  vouchers: number
  advances: number
  // Impostos
  inss: number
  fgts: number // Apenas informativo
  // Totais
  gross_salary: number
  total_deductions: number
  net_salary: number
  // Classificacao
  payment_type: 'contabil' | 'nao_contabil'
  status: 'pending' | 'paid'
  payment_date?: string
  // Custom events stored as JSON
  custom_events?: PayrollEvent[]
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
