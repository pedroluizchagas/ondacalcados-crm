'use client'

import React from 'react'
import { useState, useMemo } from 'react'
import { useVacations, useEmployees, useStores, createVacation as apiCreateVacation } from '@/hooks/use-data'
import type { Vacation } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Plus, Search, Calendar, Palmtree, CheckCircle, AlertTriangle, AlertCircle, Info, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

const statusMap: Record<Vacation['status'], { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  scheduled: { label: 'Agendada', variant: 'outline' },
  'in-progress': { label: 'Em Andamento', variant: 'default' },
  completed: { label: 'Concluida', variant: 'secondary' },
  cancelled: { label: 'Cancelada', variant: 'destructive' },
}

export default function FeriasPage() {
  const { vacations, mutate: mutateVacations } = useVacations()
  const { employees } = useEmployees()
  const { stores } = useStores()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [storeFilter, setStoreFilter] = useState<string>('all')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isEmployeeOpen, setIsEmployeeOpen] = useState(false)
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    employeeId: '',
    startDate: '',
    endDate: '',
    paidAmount: '',
    acquisitionPeriodStart: '',
    acquisitionPeriodEnd: '',
  })

  const activeEmployees = (employees || []).filter((e: any) => (e as any).status !== 'terminated')

  const employeesWithAlerts = useMemo(() => {
    return activeEmployees.map((emp) => {
      const today = new Date()
      const hasVacation = (vacations || []).some((v: any) => (((v as any).employeeId || (v as any).employee_id) === emp.id) && (((v as any).status === 'scheduled') || ((v as any).status === 'in-progress') || ((v as any).status === 'completed')))
      const getVacationDeadline = (hireDate: string): Date => {
        const hire = new Date(hireDate)
        let periodStart = new Date(hire)
        while (periodStart < today) {
          periodStart.setFullYear(periodStart.getFullYear() + 1)
        }
        periodStart.setFullYear(periodStart.getFullYear() - 1)
        const deadline = new Date(periodStart)
        deadline.setFullYear(deadline.getFullYear() + 2)
        return deadline
      }
      const alert = (() => {
        if (hasVacation) return { level: 'ok', daysUntilDeadline: 999 } as any
        const hd = (emp as any).hireDate || (emp as any).hire_date
        const deadline = getVacationDeadline(hd)
        const diffTime = deadline.getTime() - today.getTime()
        const daysUntilDeadline = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        if (daysUntilDeadline <= 15) return { level: 'critical', daysUntilDeadline }
        if (daysUntilDeadline <= 30) return { level: 'attention', daysUntilDeadline }
        if (daysUntilDeadline <= 60) return { level: 'planning', daysUntilDeadline }
        return { level: 'ok', daysUntilDeadline }
      })()
      return { ...emp, vacationAlert: alert }
    })
  }, [activeEmployees, vacations])

  const stats = useMemo(() => {
    const scheduled = vacations.filter((v) => v.status === 'scheduled').length
    const inProgress = vacations.filter((v) => v.status === 'in-progress').length
    const completed = vacations.filter((v) => v.status === 'completed').length

    const alertCounts = {
      critical: employeesWithAlerts.filter((e) => e.vacationAlert.level === 'critical').length,
      attention: employeesWithAlerts.filter((e) => e.vacationAlert.level === 'attention').length,
      planning: employeesWithAlerts.filter((e) => e.vacationAlert.level === 'planning').length,
    }

    return { scheduled, inProgress, completed, alertCounts }
  }, [vacations, employeesWithAlerts])

  const filteredVacations = useMemo(() => {
    return vacations.filter((vacation: any) => {
      const employee = (employees || []).find((e: any) => e.id === ((vacation as any).employeeId || (vacation as any).employee_id))
      const matchesSearch = String(vacation.employeeName || '').toLowerCase().includes(searchTerm.toLowerCase())
      const matchesStatus = statusFilter === 'all' || vacation.status === statusFilter
      const matchesStore = storeFilter === 'all' || ((employee as any)?.storeId || (employee as any)?.store_id) === storeFilter
      return matchesSearch && matchesStatus && matchesStore
    })
  }, [vacations, employees, searchTerm, statusFilter, storeFilter])

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR')
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  const calculateDays = (start: string, end: string) => {
    const startDate = new Date(start)
    const endDate = new Date(end)
    return Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
  }

  const resetForm = () => {
    setFormData({
      employeeId: '',
      startDate: '',
      endDate: '',
      paidAmount: '',
      acquisitionPeriodStart: '',
      acquisitionPeriodEnd: '',
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    await new Promise((resolve) => setTimeout(resolve, 200))

    const employee = activeEmployees.find((emp) => emp.id === formData.employeeId)
    if (!employee) {
      setIsSubmitting(false)
      return
    }

    const paidAmountNumber = parseFloat(formData.paidAmount) || 0
    if (paidAmountNumber <= 0) {
      toast({
        title: 'Erro',
        description: 'O valor pago de ferias deve ser maior que zero.',
        variant: 'destructive',
      })
      setIsSubmitting(false)
      return
    }

    await apiCreateVacation({
      employeeId: formData.employeeId,
      startDate: formData.startDate,
      endDate: formData.endDate,
      days: calculateDays(formData.startDate, formData.endDate),
      paidAmount: paidAmountNumber,
      status: 'scheduled',
      acquisitionPeriodStart: formData.acquisitionPeriodStart,
      acquisitionPeriodEnd: formData.acquisitionPeriodEnd,
    } as any)
    await mutateVacations()
    setIsFormOpen(false)
    resetForm()
    setIsSubmitting(false)
    toast({
      title: 'Ferias agendadas',
      description: `Ferias de ${employee.name} foram agendadas com sucesso.`,
    })
  }

  const getStoreName = (storeId: string) => {
    const s = stores.find(st => (st as any).id === storeId)
    return s?.name || 'N/A'
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Controle de Ferias</h1>
          <p className="text-muted-foreground">Gerencie os periodos de ferias dos colaboradores</p>
        </div>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Agendar Ferias
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Agendar Ferias</DialogTitle>
              <DialogDescription>
                Preencha os dados para agendar as ferias
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="employee">Funcionario</Label>
                <Popover open={isEmployeeOpen} onOpenChange={setIsEmployeeOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={isEmployeeOpen}
                      className="w-full justify-between"
                    >
                      {formData.employeeId
                        ? employeesWithAlerts.find(e => e.id === formData.employeeId)?.name
                        : 'Selecione o funcionario'}
                      <Search className="h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                    <Command>
                      <CommandInput placeholder="Buscar funcionario..." />
                      <CommandList>
                        <CommandEmpty>Nenhum funcionario encontrado.</CommandEmpty>
                        <CommandGroup>
                          {employeesWithAlerts.map((emp) => (
                            <CommandItem
                              key={emp.id}
                              value={`${emp.name} ${getStoreName(emp.storeId)} ${emp.vacationAlert.level}`}
                              onSelect={() => {
                                setFormData({ ...formData, employeeId: emp.id })
                                setIsEmployeeOpen(false)
                              }}
                            >
                              <div className="flex items-center gap-2">
                                <span>{emp.name}</span>
                                <span className="text-muted-foreground">- {getStoreName(emp.storeId)}</span>
                                {emp.vacationAlert.level === 'critical' && (
                                  <AlertTriangle className="h-4 w-4 text-destructive" />
                                )}
                                {emp.vacationAlert.level === 'attention' && (
                                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                                )}
                                {emp.vacationAlert.level === 'planning' && (
                                  <Info className="h-4 w-4 text-blue-600" />
                                )}
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Data Inicio *</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) =>
                      setFormData({ ...formData, startDate: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">Data Fim *</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={formData.endDate}
                    onChange={(e) =>
                      setFormData({ ...formData, endDate: e.target.value })
                    }
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="paidAmount">Valor Pago de Ferias (R$) *</Label>
                <Input
                  id="paidAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Ex: 3500.00"
                  value={formData.paidAmount}
                  onChange={(e) =>
                    setFormData({ ...formData, paidAmount: e.target.value })
                  }
                  required
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="acquisitionStart">Periodo Aquisitivo - Inicio</Label>
                  <Input
                    id="acquisitionStart"
                    type="date"
                    value={formData.acquisitionPeriodStart}
                    onChange={(e) =>
                      setFormData({ ...formData, acquisitionPeriodStart: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="acquisitionEnd">Periodo Aquisitivo - Fim</Label>
                  <Input
                    id="acquisitionEnd"
                    type="date"
                    value={formData.acquisitionPeriodEnd}
                    onChange={(e) =>
                      setFormData({ ...formData, acquisitionPeriodEnd: e.target.value })
                    }
                    required
                  />
                </div>
              </div>
              <div className="flex justify-end gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsFormOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting || !formData.employeeId}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Agendando...
                    </>
                  ) : (
                    'Agendar'
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Alert Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-destructive">Critico - 15 dias</CardTitle>
            <AlertTriangle className="h-5 w-5 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-destructive">{stats.alertCounts.critical}</div>
            <p className="text-xs text-muted-foreground mt-1">Ferias prestes a vencer</p>
          </CardContent>
        </Card>

        <Card className="border-yellow-500/50 bg-yellow-500/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-yellow-600">Atencao - 30 dias</CardTitle>
            <AlertCircle className="h-5 w-5 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">{stats.alertCounts.attention}</div>
            <p className="text-xs text-muted-foreground mt-1">Necessitam agendamento</p>
          </CardContent>
        </Card>

        <Card className="border-blue-500/50 bg-blue-500/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-600">Planejamento - 60 dias</CardTitle>
            <Info className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{stats.alertCounts.planning}</div>
            <p className="text-xs text-muted-foreground mt-1">Planejar ferias</p>
          </CardContent>
        </Card>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Agendadas</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.scheduled}</div>
            <p className="text-xs text-muted-foreground">Ferias programadas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Em Andamento</CardTitle>
            <Palmtree className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.inProgress}</div>
            <p className="text-xs text-muted-foreground">Funcionarios em ferias</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Concluidas</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completed}</div>
            <p className="text-xs text-muted-foreground">Ferias finalizadas</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por funcionario..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="scheduled">Agendada</SelectItem>
                <SelectItem value="in-progress">Em Andamento</SelectItem>
                <SelectItem value="completed">Concluida</SelectItem>
                <SelectItem value="cancelled">Cancelada</SelectItem>
              </SelectContent>
            </Select>
            <Select value={storeFilter} onValueChange={setStoreFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Loja" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Lojas</SelectItem>
                {stores.map((store) => (
                  <SelectItem key={store.id} value={store.id}>
                    {store.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Vacations Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Funcionario</TableHead>
                <TableHead className="hidden md:table-cell">Loja</TableHead>
                <TableHead>Periodo</TableHead>
                <TableHead className="hidden md:table-cell text-center">Dias</TableHead>
                <TableHead className="hidden lg:table-cell">Valor Pago</TableHead>
                <TableHead className="hidden xl:table-cell">Periodo Aquisitivo</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredVacations.length > 0 ? (
                filteredVacations.map((vacation: any) => {
                  const employee = (employees || []).find((e: any) => e.id === ((vacation as any).employeeId || (vacation as any).employee_id))
                  return (
                    <TableRow key={vacation.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                              {getInitials(vacation.employeeName)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{vacation.employeeName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge variant="outline">{employee ? getStoreName(String((employee as any).storeId || (employee as any).store_id)) : 'N/A'}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {formatDate(vacation.startDate)} - {formatDate(vacation.endDate)}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-center">
                        <Badge variant="secondary">{vacation.days}</Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <span className="font-medium text-green-600">{formatCurrency(vacation.paidAmount)}</span>
                      </TableCell>
                      <TableCell className="hidden xl:table-cell text-sm text-muted-foreground">
                        {formatDate(vacation.acquisitionPeriodStart)} -{' '}
                        {formatDate(vacation.acquisitionPeriodEnd)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusMap[vacation.status].variant}>
                          {statusMap[vacation.status].label}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  )
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    Nenhuma ferias encontrada.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
