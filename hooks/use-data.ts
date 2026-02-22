import useSWR from 'swr'
import type { 
  Store, 
  Position, 
  Employee, 
  Vacation, 
  MedicalCertificate, 
  Resignation, 
  PayrollItem 
} from '@/types'
import type { VacationAlertLevel } from '@/types'

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to fetch')
  }
  return res.json()
}

// Stores
export function useStores() {
  const { data, error, isLoading, mutate } = useSWR<Store[]>('/api/stores', fetcher)
  return {
    data: data || [],
    stores: data || [],
    isLoading,
    error,
    mutate,
  }
}

// Positions
export function usePositions() {
  const { data, error, isLoading, mutate } = useSWR<Position[]>('/api/positions', fetcher)
  return {
    data: data || [],
    positions: data || [],
    isLoading,
    error,
    mutate,
  }
}

// Employees
export function useEmployees() {
  const { data, error, isLoading, mutate } = useSWR<Employee[]>('/api/employees', fetcher)
  return {
    data: data || [],
    employees: data || [],
    isLoading,
    error,
    mutate,
  }
}

export function useEmployee(id: string | null) {
  const { data, error, isLoading, mutate } = useSWR<Employee>(
    id ? `/api/employees/${id}` : null,
    fetcher
  )
  return {
    data: data,
    employee: data,
    isLoading,
    error,
    mutate,
  }
}

// Vacations
export function useVacations() {
  const { data, error, isLoading, mutate } = useSWR<Vacation[]>('/api/vacations', fetcher)
  return {
    data: data || [],
    vacations: data || [],
    isLoading,
    error,
    mutate,
  }
}

// Medical Certificates
export function useMedicalCertificates() {
  const { data, error, isLoading, mutate } = useSWR<MedicalCertificate[]>(
    '/api/medical-certificates',
    fetcher
  )
  return {
    data: data || [],
    certificates: data || [],
    isLoading,
    error,
    mutate,
  }
}

// Resignations
export function useResignations() {
  const { data, error, isLoading, mutate } = useSWR<Resignation[]>('/api/resignations', fetcher)
  return {
    data: data || [],
    resignations: data || [],
    isLoading,
    error,
    mutate,
  }
}

// Payroll
export function usePayroll() {
  const { data, error, isLoading, mutate } = useSWR<PayrollItem[]>('/api/payroll', fetcher)
  return {
    data: data || [],
    payrolls: data || [],
    isLoading,
    error,
    mutate,
  }
}

// Dashboard Stats
interface DashboardStats {
  totalEmployees: number
  activeEmployees: number
  onVacation: number
  birthdays: Array<{ id: string; name: string; birthDate: string }>
  upcomingVacations: Array<{
    id: string
    employeeName: string
    startDate: string
    endDate: string
    days: number
  }>
}

export function useDashboardStats() {
  const { data, error, isLoading, mutate } = useSWR<DashboardStats>(
    '/api/dashboard/stats',
    fetcher
  )
  return {
    stats: data,
    isLoading,
    error,
    mutate,
  }
}

// API mutation helpers
export async function createStore(data: Omit<Store, 'id'>) {
  const res = await fetch('/api/stores', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to create store')
  return res.json()
}

export async function updateStore(id: string, data: Partial<Store>) {
  const res = await fetch(`/api/stores/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to update store')
  return res.json()
}

export async function deleteStore(id: string) {
  const res = await fetch(`/api/stores/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Failed to delete store')
  return res.json()
}

export async function createPosition(data: Omit<Position, 'id'>) {
  const res = await fetch('/api/positions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to create position')
  return res.json()
}

export async function updatePosition(id: string, data: Partial<Position>) {
  const res = await fetch(`/api/positions/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to update position')
  return res.json()
}

export async function deletePosition(id: string) {
  const res = await fetch(`/api/positions/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Failed to delete position')
  return res.json()
}

export async function createEmployee(data: Omit<Employee, 'id'>) {
  const res = await fetch('/api/employees', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to create employee')
  return res.json()
}

export async function updateEmployee(id: string, data: Partial<Employee>) {
  const res = await fetch(`/api/employees/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to update employee')
  return res.json()
}

export async function deleteEmployee(id: string) {
  const res = await fetch(`/api/employees/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Failed to delete employee')
  return res.json()
}

export async function createVacation(data: Omit<Vacation, 'id'>) {
  const res = await fetch('/api/vacations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to create vacation')
  return res.json()
}

export async function updateVacation(id: string, data: Partial<Vacation>) {
  const res = await fetch(`/api/vacations/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to update vacation')
  return res.json()
}

export async function deleteVacation(id: string) {
  const res = await fetch(`/api/vacations/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Failed to delete vacation')
  return res.json()
}

export async function createMedicalCertificate(data: Omit<MedicalCertificate, 'id' | 'createdAt'>) {
  const res = await fetch('/api/medical-certificates', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to create medical certificate')
  return res.json()
}

export async function deleteMedicalCertificate(id: string) {
  const res = await fetch(`/api/medical-certificates/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Failed to delete medical certificate')
  return res.json()
}

export async function createResignation(data: Omit<Resignation, 'id' | 'createdAt'>) {
  const res = await fetch('/api/resignations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to create resignation')
  return res.json()
}

export async function deleteResignation(id: string) {
  const res = await fetch(`/api/resignations/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Failed to delete resignation')
  return res.json()
}

export async function createPayrollItem(data: Omit<PayrollItem, 'id'>) {
  const res = await fetch('/api/payroll', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to create payroll')
  return res.json()
}

export async function updatePayrollItem(id: string, data: Partial<PayrollItem>) {
  const res = await fetch(`/api/payroll/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to update payroll')
  return res.json()
}

export async function deletePayrollItem(id: string) {
  const res = await fetch(`/api/payroll/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Failed to delete payroll')
  return res.json()
}

export function getVacationRadar(employees: Employee[], vacations: Vacation[]) {
  const today = new Date()
  const parseDate = (d?: string) => (d ? new Date(d) : null)
  return (employees || [])
    .filter((e: any) => (e as any).status !== 'terminated')
    .map((emp: any) => {
      const hd = (emp as any).hireDate || (emp as any).hire_date
      const hire = new Date(hd)
      const lastAnniversary = new Date(hire)
      lastAnniversary.setFullYear(today.getFullYear())
      if (lastAnniversary > today) {
        lastAnniversary.setFullYear(today.getFullYear() - 1)
      }
      const cycleEnd = new Date(lastAnniversary)
      cycleEnd.setFullYear(cycleEnd.getFullYear() + 1)
      const hasVacation = (vacations || []).some((v: any) => {
        const empId = String((v as any).employeeId || (v as any).employee_id || '')
        if (empId !== emp.id) return false
        if ((v as any).status === 'cancelled') return false
        const sStr = String((v as any).startDate || (v as any).start_date || '')
        const eStr = String((v as any).endDate || (v as any).end_date || '')
        if (!sStr || !eStr) return false
        const s = new Date(sStr)
        const e = new Date(eStr)
        return e >= lastAnniversary && s <= cycleEnd
      })
      if (hasVacation) {
        return { ...emp, vacationAlert: { level: 'ok' as VacationAlertLevel, daysUntilDeadline: 999 } }
      }
      const diffTime = cycleEnd.getTime() - today.getTime()
      const daysUntilDeadline = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      let level: VacationAlertLevel = 'ok'
      if (daysUntilDeadline <= 15) level = 'critical'
      else if (daysUntilDeadline <= 30) level = 'attention'
      else if (daysUntilDeadline <= 60) level = 'planning'
      return { ...emp, vacationAlert: { level, daysUntilDeadline } }
    })
}
