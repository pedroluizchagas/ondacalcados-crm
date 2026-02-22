import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/admin'
import type { 
  Store, 
  Position, 
  Employee, 
  Vacation, 
  MedicalCertificate, 
  Resignation, 
  PayrollItem 
} from '@/types'

// ============ STORES ============

export async function getStores(): Promise<Store[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('stores')
    .select('*')
    .order('name')
  
  if (error) throw new Error(error.message)
  return data || []
}

export async function getStore(id: string): Promise<Store | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('stores')
    .select('*')
    .eq('id', id)
    .single()
  
  if (error) return null
  return data
}

export async function createStore(store: Omit<Store, 'id'>): Promise<Store> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('stores')
    .insert(store)
    .select()
    .single()
  
  if (error) throw new Error(error.message)
  return data
}

export async function updateStore(id: string, store: Partial<Store>): Promise<Store> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('stores')
    .update(store)
    .eq('id', id)
    .select()
    .single()
  
  if (error) throw new Error(error.message)
  return data
}

export async function deleteStore(id: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('stores')
    .delete()
    .eq('id', id)
  
  if (error) throw new Error(error.message)
}

// ============ POSITIONS ============

export async function getPositions(): Promise<Position[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('positions')
    .select('*')
    .order('name')
  
  if (error) throw new Error(error.message)
  return data?.map(p => ({
    id: p.id,
    name: p.name,
    cbo: p.cbo,
    baseSalary: Number(p.base_salary),
    storeId: p.store_id,
    description: p.description,
  })) || []
}

export async function createPosition(position: Omit<Position, 'id'>): Promise<Position> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('positions')
    .insert({
      name: position.name,
      cbo: position.cbo,
      base_salary: position.baseSalary,
      store_id: position.storeId,
      description: position.description,
    })
    .select()
    .single()
  
  if (error) throw new Error(error.message)
  return {
    id: data.id,
    name: data.name,
    cbo: data.cbo,
    baseSalary: Number(data.base_salary),
    storeId: data.store_id,
    description: data.description,
  }
}

export async function updatePosition(id: string, position: Partial<Position>): Promise<Position> {
  const supabase = await createClient()
  const updateData: Record<string, unknown> = {}
  if (position.name !== undefined) updateData.name = position.name
  if (position.cbo !== undefined) updateData.cbo = position.cbo
  if (position.baseSalary !== undefined) updateData.base_salary = position.baseSalary
  if (position.storeId !== undefined) updateData.store_id = position.storeId
  if (position.description !== undefined) updateData.description = position.description

  const { data, error } = await supabase
    .from('positions')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()
  
  if (error) throw new Error(error.message)
  return {
    id: data.id,
    name: data.name,
    cbo: data.cbo,
    baseSalary: Number(data.base_salary),
    storeId: data.store_id,
    description: data.description,
  }
}

export async function deletePosition(id: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('positions')
    .delete()
    .eq('id', id)
  
  if (error) throw new Error(error.message)
}

// ============ EMPLOYEES ============

export async function getEmployees(): Promise<Employee[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .order('name')
  
  if (error) throw new Error(error.message)
  return data?.map(e => ({
    id: e.id,
    name: e.name,
    email: e.email,
    phone: e.phone,
    cpf: e.cpf,
    role: e.role,
    department: e.department,
    store: e.store_id,
    storeId: e.store_id,
    positionId: e.position_id,
    salary: Number(e.salary),
    hireDate: e.hire_date,
    birthDate: e.birth_date,
    status: e.status,
    avatarUrl: (e as any).avatar_url || undefined,
    address: {
      street: e.address_street || '',
      number: e.address_number || '',
      city: e.address_city || '',
      state: e.address_state || '',
      zipCode: e.address_zip_code || '',
    },
    terminationDate: e.termination_date,
    terminationReason: e.termination_reason,
  })) || []
}

export async function getEmployee(id: string): Promise<Employee | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .eq('id', id)
    .single()
  
  if (error) return null
  return {
    id: data.id,
    name: data.name,
    email: data.email,
    phone: data.phone,
    cpf: data.cpf,
    role: data.role,
    department: data.department,
    store: data.store_id,
    storeId: data.store_id,
    positionId: data.position_id,
    salary: Number(data.salary),
    hireDate: data.hire_date,
    birthDate: data.birth_date,
    status: data.status,
    avatarUrl: (data as any).avatar_url || undefined,
    address: {
      street: data.address_street || '',
      number: data.address_number || '',
      city: data.address_city || '',
      state: data.address_state || '',
      zipCode: data.address_zip_code || '',
    },
    terminationDate: data.termination_date,
    terminationReason: data.termination_reason,
  }
}

export async function createEmployee(employee: Omit<Employee, 'id'>): Promise<Employee> {
  const supabase = await createClient()
  const { data: authData } = await supabase.auth.getUser()
  const userId = authData?.user?.id
  if (!userId) throw new Error('unauthorized')
  const admin = createServiceClient()
  let salaryValue = employee.salary
  if (salaryValue === undefined || salaryValue === null) {
    if (employee.positionId) {
      const { data: pos } = await supabase
        .from('positions')
        .select('base_salary')
        .eq('id', employee.positionId)
        .single()
      salaryValue = pos?.base_salary ?? null
    }
  }
  const { data, error } = await admin
    .from('employees')
    .insert({
      name: employee.name,
      email: employee.email,
      phone: employee.phone,
      cpf: employee.cpf,
      role: employee.role,
      department: employee.department,
      store_id: employee.storeId || employee.store,
      position_id: employee.positionId,
      salary: salaryValue,
      hire_date: employee.hireDate,
      birth_date: employee.birthDate,
      status: employee.status,
      avatar_url: (employee as any).avatarUrl ?? (employee as any).avatar_url ?? null,
      address_street: employee.address?.street,
      address_number: employee.address?.number,
      address_city: employee.address?.city,
      address_state: employee.address?.state,
      address_zip_code: employee.address?.zipCode,
    })
    .select()
    .single()
  
  if (error) throw new Error(error.message)
  return {
    id: data.id,
    name: data.name,
    email: data.email,
    phone: data.phone,
    cpf: data.cpf,
    role: data.role,
    department: data.department,
    store: data.store_id,
    storeId: data.store_id,
    positionId: data.position_id,
    salary: Number(data.salary),
    hireDate: data.hire_date,
    birthDate: data.birth_date,
    status: data.status,
    avatarUrl: (data as any).avatar_url || undefined,
    address: {
      street: data.address_street || '',
      number: data.address_number || '',
      city: data.address_city || '',
      state: data.address_state || '',
      zipCode: data.address_zip_code || '',
    },
  }
}

export async function updateEmployee(id: string, employee: Partial<Employee>): Promise<Employee> {
  const supabase = await createClient()
  const updateData: Record<string, unknown> = {}
  
  if (employee.name !== undefined) updateData.name = employee.name
  if (employee.email !== undefined) updateData.email = employee.email
  if (employee.phone !== undefined) updateData.phone = employee.phone
  if (employee.cpf !== undefined) updateData.cpf = employee.cpf
  if (employee.role !== undefined) updateData.role = employee.role
  if (employee.department !== undefined) updateData.department = employee.department
  if (employee.storeId !== undefined) updateData.store_id = employee.storeId
  if (employee.positionId !== undefined) updateData.position_id = employee.positionId
  if (employee.salary !== undefined) updateData.salary = employee.salary
  if (employee.hireDate !== undefined) updateData.hire_date = employee.hireDate
  if (employee.birthDate !== undefined) updateData.birth_date = employee.birthDate
  if (employee.status !== undefined) updateData.status = employee.status
  if (employee.terminationDate !== undefined) updateData.termination_date = employee.terminationDate
  if (employee.terminationReason !== undefined) updateData.termination_reason = employee.terminationReason
  if ((employee as any).avatarUrl !== undefined) updateData.avatar_url = (employee as any).avatarUrl
  if ((employee as any).avatar_url !== undefined) updateData.avatar_url = (employee as any).avatar_url
  if (employee.address) {
    updateData.address_street = employee.address.street
    updateData.address_number = employee.address.number
    updateData.address_city = employee.address.city
    updateData.address_state = employee.address.state
    updateData.address_zip_code = employee.address.zipCode
  }

  const { data, error } = await supabase
    .from('employees')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()
  
  if (error) throw new Error(error.message)
  return {
    id: data.id,
    name: data.name,
    email: data.email,
    phone: data.phone,
    cpf: data.cpf,
    role: data.role,
    department: data.department,
    store: data.store_id,
    storeId: data.store_id,
    positionId: data.position_id,
    salary: Number(data.salary),
    hireDate: data.hire_date,
    birthDate: data.birth_date,
    status: data.status,
    avatarUrl: (data as any).avatar_url || undefined,
    address: {
      street: data.address_street || '',
      number: data.address_number || '',
      city: data.address_city || '',
      state: data.address_state || '',
      zipCode: data.address_zip_code || '',
    },
    terminationDate: data.termination_date,
    terminationReason: data.termination_reason,
  }
}

export async function deleteEmployee(id: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('employees')
    .delete()
    .eq('id', id)
  
  if (error) throw new Error(error.message)
}

// ============ VACATIONS ============

export async function getVacations(): Promise<Vacation[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('vacations')
    .select(`
      *,
      employees(name)
    `)
    .order('start_date', { ascending: false })
  
  if (error) throw new Error(error.message)
  const today = new Date().toISOString().split('T')[0]
  return data?.map(v => {
    let st = v.status as Vacation['status']
    if (st !== 'cancelled') {
      if (today < v.start_date) st = 'scheduled'
      else if (today > v.end_date) st = 'completed'
      else st = 'in-progress'
    }
    return {
      id: v.id,
      employeeId: v.employee_id,
      employeeName: v.employees?.name || '',
      startDate: v.start_date,
      endDate: v.end_date,
      days: v.days,
      paidAmount: Number(v.paid_amount),
      status: st,
      acquisitionPeriodStart: v.acquisition_period_start,
      acquisitionPeriodEnd: v.acquisition_period_end,
    }
  }) || []
}

export async function createVacation(vacation: Omit<Vacation, 'id'>): Promise<Vacation> {
  const supabase = await createClient()
  const start = String(vacation.startDate)
  const end = String(vacation.endDate)
  if (!start || !end) throw new Error('startDate/endDate required')
  if (new Date(start) > new Date(end)) throw new Error('start_after_end')
  const millis = new Date(end).getTime() - new Date(start).getTime()
  const days = Math.ceil(millis / (1000 * 60 * 60 * 24)) + 1
  const { data: overlaps } = await supabase
    .from('vacations')
    .select('id')
    .eq('employee_id', vacation.employeeId)
    .neq('status', 'cancelled')
    .lte('start_date', end)
    .gte('end_date', start)
    .limit(1)
  if (overlaps && overlaps.length > 0) {
    throw new Error('overlap')
  }
  const today = new Date().toISOString().split('T')[0]
  let st = vacation.status
  if (st !== 'cancelled') {
    if (today < start) st = 'scheduled'
    else if (today > end) st = 'completed'
    else st = 'in-progress'
  }
  const { data, error } = await supabase
    .from('vacations')
    .insert({
      employee_id: vacation.employeeId,
      start_date: start,
      end_date: end,
      days: days,
      paid_amount: vacation.paidAmount,
      status: st,
      acquisition_period_start: vacation.acquisitionPeriodStart,
      acquisition_period_end: vacation.acquisitionPeriodEnd,
    })
    .select(`*, employees(name)`)
    .single()
  
  if (error) throw new Error(error.message)
  {
    const today = new Date().toISOString().split('T')[0]
    let st = data.status as Vacation['status']
    if (st !== 'cancelled') {
      if (today < data.start_date) st = 'scheduled'
      else if (today > data.end_date) st = 'completed'
      else st = 'in-progress'
    }
    return {
      id: data.id,
      employeeId: data.employee_id,
      employeeName: data.employees?.name || '',
      startDate: data.start_date,
      endDate: data.end_date,
      days: data.days,
      paidAmount: Number(data.paid_amount),
      status: st,
      acquisitionPeriodStart: data.acquisition_period_start,
      acquisitionPeriodEnd: data.acquisition_period_end,
    }
  }
}

export async function updateVacation(id: string, vacation: Partial<Vacation>): Promise<Vacation> {
  const supabase = await createClient()
  const { data: existing, error: getErr } = await supabase
    .from('vacations')
    .select('*')
    .eq('id', id)
    .single()
  if (getErr) throw new Error(getErr.message)
  const updateData: Record<string, unknown> = {}
  
  if (vacation.startDate !== undefined) updateData.start_date = vacation.startDate
  if (vacation.endDate !== undefined) updateData.end_date = vacation.endDate
  const newStart = String((vacation.startDate ?? existing.start_date) || '')
  const newEnd = String((vacation.endDate ?? existing.end_date) || '')
  if (newStart && newEnd) {
    if (new Date(newStart) > new Date(newEnd)) throw new Error('start_after_end')
    updateData.days = Math.ceil((new Date(newEnd).getTime() - new Date(newStart).getTime()) / (1000 * 60 * 60 * 24)) + 1
  } else if (vacation.days !== undefined) {
    updateData.days = vacation.days
  }
  if (vacation.paidAmount !== undefined) updateData.paid_amount = vacation.paidAmount
  const empId = existing.employee_id as string
  const { data: overlaps } = await supabase
    .from('vacations')
    .select('id')
    .eq('employee_id', empId)
    .neq('id', id)
    .neq('status', 'cancelled')
    .lte('start_date', newEnd)
    .gte('end_date', newStart)
    .limit(1)
  if (overlaps && overlaps.length > 0) {
    throw new Error('overlap')
  }
  let st = (vacation.status ?? existing.status) as Vacation['status']
  if (st !== 'cancelled') {
    const today = new Date().toISOString().split('T')[0]
    if (newStart && newEnd) {
      if (today < newStart) st = 'scheduled'
      else if (today > newEnd) st = 'completed'
      else st = 'in-progress'
    }
  }
  updateData.status = st

  const { data, error } = await supabase
    .from('vacations')
    .update(updateData)
    .eq('id', id)
    .select(`*, employees(name)`)
    .single()
  
  if (error) throw new Error(error.message)
  {
    const today = new Date().toISOString().split('T')[0]
    let st = data.status as Vacation['status']
    if (st !== 'cancelled') {
      if (today < data.start_date) st = 'scheduled'
      else if (today > data.end_date) st = 'completed'
      else st = 'in-progress'
    }
    return {
      id: data.id,
      employeeId: data.employee_id,
      employeeName: data.employees?.name || '',
      startDate: data.start_date,
      endDate: data.end_date,
      days: data.days,
      paidAmount: Number(data.paid_amount),
      status: st,
      acquisitionPeriodStart: data.acquisition_period_start,
      acquisitionPeriodEnd: data.acquisition_period_end,
    }
  }
}

export async function deleteVacation(id: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('vacations')
    .delete()
    .eq('id', id)
  
  if (error) throw new Error(error.message)
}

// ============ MEDICAL CERTIFICATES ============

export async function getMedicalCertificates(): Promise<MedicalCertificate[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('medical_certificates')
    .select(`
      *,
      employees(name)
    `)
    .order('start_date', { ascending: false })
  
  if (error) throw new Error(error.message)
  return data?.map(m => ({
    id: m.id,
    employeeId: m.employee_id,
    employeeName: m.employees?.name || '',
    startDate: m.start_date,
    days: m.days,
    cid: m.cid,
    notes: m.notes,
    createdAt: m.created_at,
  })) || []
}

export async function createMedicalCertificate(certificate: Omit<MedicalCertificate, 'id' | 'createdAt'>): Promise<MedicalCertificate> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('medical_certificates')
    .insert({
      employee_id: certificate.employeeId,
      start_date: certificate.startDate,
      days: certificate.days,
      cid: certificate.cid,
      notes: certificate.notes,
    })
    .select(`*, employees(name)`)
    .single()
  
  if (error) throw new Error(error.message)
  return {
    id: data.id,
    employeeId: data.employee_id,
    employeeName: data.employees?.name || '',
    startDate: data.start_date,
    days: data.days,
    cid: data.cid,
    notes: data.notes,
    createdAt: data.created_at,
  }
}

export async function deleteMedicalCertificate(id: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('medical_certificates')
    .delete()
    .eq('id', id)
  
  if (error) throw new Error(error.message)
}

// ============ RESIGNATIONS ============

export async function getResignations(): Promise<Resignation[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('resignations')
    .select(`
      *,
      employees(name)
    `)
    .order('exit_date', { ascending: false })
  
  if (error) throw new Error(error.message)
  return data?.map(r => ({
    id: r.id,
    employeeId: r.employee_id,
    employeeName: r.employees?.name || '',
    storeId: r.store_id,
    exitDate: r.exit_date,
    reason: r.reason,
    totalAmount: Number(r.total_amount),
    notes: r.notes,
    createdAt: r.created_at,
  })) || []
}

export async function createResignation(resignation: Omit<Resignation, 'id' | 'createdAt'>): Promise<Resignation> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('resignations')
    .insert({
      employee_id: resignation.employeeId,
      store_id: resignation.storeId,
      exit_date: resignation.exitDate,
      reason: resignation.reason,
      total_amount: resignation.totalAmount,
      notes: resignation.notes,
    })
    .select(`*, employees(name)`)
    .single()
  
  if (error) throw new Error(error.message)
  return {
    id: data.id,
    employeeId: data.employee_id,
    employeeName: data.employees?.name || '',
    storeId: data.store_id,
    exitDate: data.exit_date,
    reason: data.reason,
    totalAmount: Number(data.total_amount),
    notes: data.notes,
    createdAt: data.created_at,
  }
}

export async function deleteResignation(id: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('resignations')
    .delete()
    .eq('id', id)
  
  if (error) throw new Error(error.message)
}

// ============ PAYROLL ============

export async function getPayrollItems(): Promise<PayrollItem[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('payroll_items')
    .select(`
      *,
      employees(name)
    `)
    .order('year', { ascending: false })
    .order('month', { ascending: false })
  
  if (error) throw new Error(error.message)
  return data?.map(p => ({
    id: p.id,
    employeeId: p.employee_id,
    employeeName: p.employees?.name || '',
    month: p.month,
    year: p.year,
    storeId: p.store_id,
    positionId: p.position_id,
    baseSalary: Number(p.base_salary),
    commissions: Number(p.commissions),
    employeePurchases: Number(p.employee_purchases),
    vouchers: Number(p.vouchers),
    advances: Number(p.advances),
    inss: Number(p.inss),
    fgts: Number(p.fgts),
    grossSalary: Number(p.gross_salary),
    totalDeductions: Number(p.total_deductions),
    netSalary: Number(p.net_salary),
    paymentType: p.payment_type,
    status: p.status,
    paymentDate: p.payment_date,
    settlementDate: p.settlement_date,
    settlementLocation: p.settlement_location,
    customEvents: p.custom_events,
  })) || []
}

export async function createPayrollItem(payroll: Omit<PayrollItem, 'id'>): Promise<PayrollItem> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('payroll_items')
    .insert({
      employee_id: payroll.employeeId,
      month: payroll.month,
      year: payroll.year,
      store_id: payroll.storeId,
      position_id: payroll.positionId,
      base_salary: payroll.baseSalary,
      commissions: payroll.commissions,
      employee_purchases: payroll.employeePurchases,
      vouchers: payroll.vouchers,
      advances: payroll.advances,
      inss: payroll.inss,
      fgts: payroll.fgts,
      gross_salary: payroll.grossSalary,
      total_deductions: payroll.totalDeductions,
      net_salary: payroll.netSalary,
      payment_type: payroll.paymentType,
      status: payroll.status,
      custom_events: payroll.customEvents,
    })
    .select(`*, employees(name)`)
    .single()
  
  if (error) throw new Error(error.message)
  return {
    id: data.id,
    employeeId: data.employee_id,
    employeeName: data.employees?.name || '',
    month: data.month,
    year: data.year,
    storeId: data.store_id,
    positionId: data.position_id,
    baseSalary: Number(data.base_salary),
    commissions: Number(data.commissions),
    employeePurchases: Number(data.employee_purchases),
    vouchers: Number(data.vouchers),
    advances: Number(data.advances),
    inss: Number(data.inss),
    fgts: Number(data.fgts),
    grossSalary: Number(data.gross_salary),
    totalDeductions: Number(data.total_deductions),
    netSalary: Number(data.net_salary),
    paymentType: data.payment_type,
    status: data.status,
    paymentDate: data.payment_date,
    customEvents: data.custom_events,
  }
}

export async function updatePayrollItem(id: string, payroll: Partial<PayrollItem>): Promise<PayrollItem> {
  const supabase = await createClient()
  const updateData: Record<string, unknown> = {}
  
  if (payroll.baseSalary !== undefined) updateData.base_salary = payroll.baseSalary
  if (payroll.commissions !== undefined) updateData.commissions = payroll.commissions
  if (payroll.employeePurchases !== undefined) updateData.employee_purchases = payroll.employeePurchases
  if (payroll.vouchers !== undefined) updateData.vouchers = payroll.vouchers
  if (payroll.advances !== undefined) updateData.advances = payroll.advances
  if (payroll.inss !== undefined) updateData.inss = payroll.inss
  if (payroll.fgts !== undefined) updateData.fgts = payroll.fgts
  if (payroll.grossSalary !== undefined) updateData.gross_salary = payroll.grossSalary
  if (payroll.totalDeductions !== undefined) updateData.total_deductions = payroll.totalDeductions
  if (payroll.netSalary !== undefined) updateData.net_salary = payroll.netSalary
  if (payroll.paymentType !== undefined) updateData.payment_type = payroll.paymentType
  if (payroll.status !== undefined) updateData.status = payroll.status
  if (payroll.paymentDate !== undefined) updateData.payment_date = payroll.paymentDate
  if (payroll.customEvents !== undefined) updateData.custom_events = payroll.customEvents
  if (payroll.settlementDate !== undefined) updateData.settlement_date = payroll.settlementDate
  if (payroll.settlementLocation !== undefined) updateData.settlement_location = payroll.settlementLocation

  const { data, error } = await supabase
    .from('payroll_items')
    .update(updateData)
    .eq('id', id)
    .select(`*, employees(name)`)
    .single()
  
  if (error) throw new Error(error.message)
  return {
    id: data.id,
    employeeId: data.employee_id,
    employeeName: data.employees?.name || '',
    month: data.month,
    year: data.year,
    storeId: data.store_id,
    positionId: data.position_id,
    baseSalary: Number(data.base_salary),
    commissions: Number(data.commissions),
    employeePurchases: Number(data.employee_purchases),
    vouchers: Number(data.vouchers),
    advances: Number(data.advances),
    inss: Number(data.inss),
    fgts: Number(data.fgts),
    grossSalary: Number(data.gross_salary),
    totalDeductions: Number(data.total_deductions),
    netSalary: Number(data.net_salary),
    paymentType: data.payment_type,
    status: data.status,
    paymentDate: data.payment_date,
    settlementDate: data.settlement_date,
    settlementLocation: data.settlement_location,
    customEvents: data.custom_events,
  }
}

export async function deletePayrollItem(id: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('payroll_items')
    .delete()
    .eq('id', id)
  
  if (error) throw new Error(error.message)
}

export async function createPayrollItemAdmin(payroll: Omit<PayrollItem, 'id'>): Promise<PayrollItem> {
  const admin = createServiceClient()
  const { data, error } = await admin
    .from('payroll_items')
    .insert({
      employee_id: payroll.employeeId,
      month: payroll.month,
      year: payroll.year,
      store_id: payroll.storeId,
      position_id: payroll.positionId,
      base_salary: payroll.baseSalary,
      commissions: payroll.commissions,
      employee_purchases: payroll.employeePurchases,
      vouchers: payroll.vouchers,
      advances: payroll.advances,
      inss: payroll.inss,
      fgts: payroll.fgts,
      gross_salary: payroll.grossSalary,
      total_deductions: payroll.totalDeductions,
      net_salary: payroll.netSalary,
      payment_type: payroll.paymentType,
      status: payroll.status,
      custom_events: payroll.customEvents,
    })
    .select(`*, employees(name)`)
    .single()
  
  if (error) throw new Error(error.message)
  return {
    id: data.id,
    employeeId: data.employee_id,
    employeeName: data.employees?.name || '',
    month: data.month,
    year: data.year,
    storeId: data.store_id,
    positionId: data.position_id,
    baseSalary: Number(data.base_salary),
    commissions: Number(data.commissions),
    employeePurchases: Number(data.employee_purchases),
    vouchers: Number(data.vouchers),
    advances: Number(data.advances),
    inss: Number(data.inss),
    fgts: Number(data.fgts),
    grossSalary: Number(data.gross_salary),
    totalDeductions: Number(data.total_deductions),
    netSalary: Number(data.net_salary),
    paymentType: data.payment_type,
    status: data.status,
    paymentDate: data.payment_date,
    customEvents: data.custom_events,
  }
}

export async function updatePayrollItemAdmin(id: string, payroll: Partial<PayrollItem>): Promise<PayrollItem> {
  const admin = createServiceClient()
  const updateData: Record<string, unknown> = {}
  
  if (payroll.baseSalary !== undefined) updateData.base_salary = payroll.baseSalary
  if (payroll.commissions !== undefined) updateData.commissions = payroll.commissions
  if (payroll.employeePurchases !== undefined) updateData.employee_purchases = payroll.employeePurchases
  if (payroll.vouchers !== undefined) updateData.vouchers = payroll.vouchers
  if (payroll.advances !== undefined) updateData.advances = payroll.advances
  if (payroll.inss !== undefined) updateData.inss = payroll.inss
  if (payroll.fgts !== undefined) updateData.fgts = payroll.fgts
  if (payroll.grossSalary !== undefined) updateData.gross_salary = payroll.grossSalary
  if (payroll.totalDeductions !== undefined) updateData.total_deductions = payroll.totalDeductions
  if (payroll.netSalary !== undefined) updateData.net_salary = payroll.netSalary
  if (payroll.paymentType !== undefined) updateData.payment_type = payroll.paymentType
  if (payroll.status !== undefined) updateData.status = payroll.status
  if (payroll.paymentDate !== undefined) updateData.payment_date = payroll.paymentDate
  if (payroll.customEvents !== undefined) updateData.custom_events = payroll.customEvents
  if (payroll.settlementDate !== undefined) updateData.settlement_date = payroll.settlementDate
  if (payroll.settlementLocation !== undefined) updateData.settlement_location = payroll.settlementLocation

  const { data, error } = await admin
    .from('payroll_items')
    .update(updateData)
    .eq('id', id)
    .select(`*, employees(name)`)
    .single()
  
  if (error) throw new Error(error.message)
  return {
    id: data.id,
    employeeId: data.employee_id,
    employeeName: data.employees?.name || '',
    month: data.month,
    year: data.year,
    storeId: data.store_id,
    positionId: data.position_id,
    baseSalary: Number(data.base_salary),
    commissions: Number(data.commissions),
    employeePurchases: Number(data.employee_purchases),
    vouchers: Number(data.vouchers),
    advances: Number(data.advances),
    inss: Number(data.inss),
    fgts: Number(data.fgts),
    grossSalary: Number(data.gross_salary),
    totalDeductions: Number(data.total_deductions),
    netSalary: Number(data.net_salary),
    paymentType: data.payment_type,
    status: data.status,
    paymentDate: data.payment_date,
    settlementDate: data.settlement_date,
    settlementLocation: data.settlement_location,
    customEvents: data.custom_events,
  }
}
// ============ DASHBOARD STATS ============

export async function getDashboardStats() {
  const supabase = await createClient()
  
  // Get employees count
  const { count: totalEmployees } = await supabase
    .from('employees')
    .select('*', { count: 'exact', head: true })
  
  const { count: activeEmployees } = await supabase
    .from('employees')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active')
  
  const todayStr = new Date().toISOString().split('T')[0]
  const { data: inProgressVacations } = await supabase
    .from('vacations')
    .select('employee_id, status, start_date, end_date')
    .neq('status', 'cancelled')
    .lte('start_date', todayStr)
    .gte('end_date', todayStr)
  const onVacation = new Set((inProgressVacations || []).map(v => v.employee_id)).size
  
  // Get current month birthdays
  const currentMonth = new Date().getMonth() + 1
  const { data: birthdayEmployees } = await supabase
    .from('employees')
    .select('*')
    .eq('status', 'active')
  
  const birthdays = birthdayEmployees?.filter(e => {
    const birthMonth = new Date(e.birth_date).getMonth() + 1
    return birthMonth === currentMonth
  }) || []

  // Get upcoming vacations
  const today = todayStr
  const { data: upcomingVacations } = await supabase
    .from('vacations')
    .select(`*, employees(name)`)
    .gte('start_date', today)
    .order('start_date')
    .limit(5)

  return {
    totalEmployees: totalEmployees || 0,
    activeEmployees: activeEmployees || 0,
    onVacation: onVacation || 0,
    birthdays: birthdays.map(e => ({
      id: e.id,
      name: e.name,
      birthDate: e.birth_date,
    })),
    upcomingVacations: upcomingVacations?.map(v => ({
      id: v.id,
      employeeName: v.employees?.name || '',
      startDate: v.start_date,
      endDate: v.end_date,
      days: v.days,
    })) || [],
  }
}
