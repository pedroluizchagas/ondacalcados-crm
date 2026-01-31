'use client'

import React from "react"
import { useState, useMemo } from 'react'
import { useEmployees, useVacations, useStores, usePositions, createEmployee as apiCreateEmployee, updateEmployee as apiUpdateEmployee } from '@/hooks/use-data'
import type { Employee, VacationAlertLevel } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Search, MoreHorizontal, Eye, Pencil, UserX, AlertTriangle, AlertCircle, Info } from 'lucide-react'
import { EmployeeForm } from '@/components/employee-form'
import { EmployeeProfile } from '@/components/employee-profile'
import { useToast } from '@/hooks/use-toast'

const statusMap: Record<Employee['status'], { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  active: { label: 'Ativo', variant: 'default' },
  inactive: { label: 'Inativo', variant: 'secondary' },
  vacation: { label: 'Ferias', variant: 'outline' },
  terminated: { label: 'Desligado', variant: 'destructive' },
}

const vacationAlertMap: Record<VacationAlertLevel, { label: string; color: string; icon: React.ComponentType<{ className?: string }> | null }> = {
  critical: { label: 'Critico', color: 'text-destructive', icon: AlertTriangle },
  attention: { label: 'Atencao', color: 'text-yellow-600', icon: AlertCircle },
  planning: { label: 'Planejamento', color: 'text-blue-600', icon: Info },
  ok: { label: 'OK', color: 'text-green-600', icon: null },
}

export default function FuncionariosPage() {
  const { employees, mutate: mutateEmployees } = useEmployees()
  const { vacations } = useVacations()
  const { stores } = useStores()
  const { positions } = usePositions()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [storeFilter, setStoreFilter] = useState<string>('all')
  const [vacationAlertFilter, setVacationAlertFilter] = useState<string>('all')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)
  const { toast } = useToast()

  const getStoreName = (storeId: string) => {
    const s = stores.find(st => (st as any).id === storeId)
    return s?.name || 'N/A'
  }

  const getPositionName = (positionId: string) => {
    const p = positions.find(pp => (pp as any).id === positionId)
    return String(p?.name || 'N/A')
  }

  const getBaseSalary = (positionId: string) => {
    const p = positions.find(pp => (pp as any).id === positionId)
    return Number((p as any)?.baseSalary ?? (p as any)?.base_salary ?? 0)
  }

  const getVacationDeadline = (hireDate: string): Date => {
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

  const getVacationAlertLevel = (employee: Employee, vacationsList: any[]): { level: VacationAlertLevel; daysUntilDeadline: number } => {
    const today = new Date()
    const hasVacation = vacationsList.some((v: any) =>
      ((v as any).employeeId || (v as any).employee_id) === employee.id &&
      (((v as any).status === 'scheduled') || ((v as any).status === 'in-progress') || ((v as any).status === 'completed'))
    )
    if (hasVacation) {
      return { level: 'ok', daysUntilDeadline: 999 }
    }
    const hd = (employee as any).hireDate || (employee as any).hire_date
    const deadline = getVacationDeadline(hd)
    const diffTime = deadline.getTime() - today.getTime()
    const daysUntilDeadline = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    if (daysUntilDeadline <= 15) return { level: 'critical', daysUntilDeadline }
    if (daysUntilDeadline <= 30) return { level: 'attention', daysUntilDeadline }
    if (daysUntilDeadline <= 60) return { level: 'planning', daysUntilDeadline }
    return { level: 'ok', daysUntilDeadline }
  }

  const employeesWithAlerts = useMemo(() => {
    return (employees || []).map((emp: any) => {
      const alert = getVacationAlertLevel(emp, vacations || [])
      return { ...emp, vacationAlert: alert }
    })
  }, [employees, vacations])

  const filteredEmployees = useMemo(() => {
    return employeesWithAlerts.filter((employee) => {
      const matchesSearch =
        employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employee.cpf.includes(searchTerm)

      const matchesStatus = statusFilter === 'all' || employee.status === statusFilter
      const matchesStore = storeFilter === 'all' || (employee.storeId || employee.store_id) === storeFilter
      const matchesVacationAlert = vacationAlertFilter === 'all' || employee.vacationAlert.level === vacationAlertFilter

      return matchesSearch && matchesStatus && matchesStore && matchesVacationAlert
    })
  }, [employeesWithAlerts, searchTerm, statusFilter, storeFilter, vacationAlertFilter])

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  const handleAddEmployee = async (data: Omit<Employee, 'id'>) => {
    await apiCreateEmployee(data as any)
    await mutateEmployees()
    setIsFormOpen(false)
    toast({ title: 'Funcionario cadastrado', description: `${data.name} foi cadastrado com sucesso.` })
  }

  const handleEditEmployee = async (data: Omit<Employee, 'id'>) => {
    if (!editingEmployee) return
    await apiUpdateEmployee(String(editingEmployee.id), data as any)
    await mutateEmployees()
    setEditingEmployee(null)
    toast({ title: 'Funcionario atualizado', description: `${data.name} foi atualizado com sucesso.` })
  }

  const handleTerminate = async (employee: Employee) => {
    await apiUpdateEmployee(String(employee.id), {
      status: 'terminated',
      terminationDate: new Date().toISOString().split('T')[0],
      terminationReason: 'Desligamento pelo sistema',
    } as any)
    await mutateEmployees()
    toast({ title: 'Funcionario desligado', description: `${employee.name} foi desligado do sistema.` })
  }

  const renderVacationAlert = (alert: { level: VacationAlertLevel; daysUntilDeadline: number }) => {
    const config = vacationAlertMap[alert.level]
    if (!config.icon) return null
    const Icon = config.icon
    return (
      <div className={`flex items-center gap-1 ${config.color}`}>
        <Icon className="h-4 w-4" />
        <span className="text-xs">{alert.daysUntilDeadline}d</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Funcionarios</h1>
          <p className="text-muted-foreground">Gerencie os colaboradores da empresa</p>
        </div>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Novo Funcionario
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Cadastrar Funcionario</DialogTitle>
              <DialogDescription>
                Preencha os dados do novo colaborador
              </DialogDescription>
            </DialogHeader>
            <EmployeeForm onSubmit={handleAddEmployee} onCancel={() => setIsFormOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 lg:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, email ou CPF..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full lg:w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Status</SelectItem>
                <SelectItem value="active">Ativo</SelectItem>
                <SelectItem value="inactive">Inativo</SelectItem>
                <SelectItem value="vacation">Ferias</SelectItem>
                <SelectItem value="terminated">Desligado</SelectItem>
              </SelectContent>
            </Select>
            <Select value={storeFilter} onValueChange={setStoreFilter}>
              <SelectTrigger className="w-full lg:w-[180px]">
                <SelectValue placeholder="Loja" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas Lojas</SelectItem>
                {stores.map((store) => (
                  <SelectItem key={store.id} value={store.id}>
                    {store.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={vacationAlertFilter} onValueChange={setVacationAlertFilter}>
              <SelectTrigger className="w-full lg:w-[180px]">
                <SelectValue placeholder="Alerta Ferias" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Alertas</SelectItem>
                <SelectItem value="critical">Critico (15 dias)</SelectItem>
                <SelectItem value="attention">Atencao (30 dias)</SelectItem>
                <SelectItem value="planning">Planejamento (60 dias)</SelectItem>
                <SelectItem value="ok">OK</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Employee Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Funcionario</TableHead>
                <TableHead className="hidden md:table-cell">Loja</TableHead>
                <TableHead className="hidden lg:table-cell">Cargo</TableHead>
                <TableHead className="hidden xl:table-cell">Salario</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">Ferias</TableHead>
                <TableHead className="w-[70px]">Acoes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEmployees.length > 0 ? (
                filteredEmployees.map((employee) => (
                  <TableRow key={employee.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                            {getInitials(employee.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{employee.name}</p>
                          <p className="text-sm text-muted-foreground">{employee.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge variant="outline">{getStoreName(String((employee as any).storeId || (employee as any).store_id))}</Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">{getPositionName(String((employee as any).positionId || (employee as any).position_id))}</TableCell>
                    <TableCell className="hidden xl:table-cell">
                      {formatCurrency(getBaseSalary(String((employee as any).positionId || (employee as any).position_id)))}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusMap[employee.status].variant}>
                        {statusMap[employee.status].label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {employee.status === 'active' && renderVacationAlert(employee.vacationAlert)}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Acoes</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedEmployee(employee)
                              setIsProfileOpen(true)
                            }}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            Ver Perfil
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setEditingEmployee(employee)}
                          >
                            <Pencil className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          {employee.status !== 'terminated' && (
                            <DropdownMenuItem
                              onClick={() => handleTerminate(employee)}
                              className="text-destructive"
                            >
                              <UserX className="mr-2 h-4 w-4" />
                              Desligar
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    Nenhum funcionario encontrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Profile Dialog */}
      <Dialog open={isProfileOpen} onOpenChange={setIsProfileOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Perfil do Funcionario</DialogTitle>
            <DialogDescription>
              Informacoes detalhadas do colaborador
            </DialogDescription>
          </DialogHeader>
          {selectedEmployee && <EmployeeProfile employee={selectedEmployee} />}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingEmployee} onOpenChange={() => setEditingEmployee(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Funcionario</DialogTitle>
            <DialogDescription>
              Atualize os dados do colaborador
            </DialogDescription>
          </DialogHeader>
          {editingEmployee && (
            <EmployeeForm
              employee={editingEmployee}
              onSubmit={handleEditEmployee}
              onCancel={() => setEditingEmployee(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
