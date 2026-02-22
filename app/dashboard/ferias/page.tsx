'use client'

import React from 'react'
import { useState, useMemo, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, Search, Calendar, Palmtree, CheckCircle, AlertTriangle, AlertCircle, Info, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { getVacationRadar } from '@/lib/vacation-radar'
import { EmployeeProfile } from '@/components/employee-profile'

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
  const searchParams = useSearchParams()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [storeFilter, setStoreFilter] = useState<string>('all')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isEmployeeOpen, setIsEmployeeOpen] = useState(false)
  const { toast } = useToast()
  const [upcomingDays, setUpcomingDays] = useState<number>(30)
  const [alertsOpen, setAlertsOpen] = useState(false)
  const [alertsCategory, setAlertsCategory] = useState<'critical' | 'attention' | 'planning'>('attention')
  const [radarCategory, setRadarCategory] = useState<string>('all')
  const [radarStoreFilter, setRadarStoreFilter] = useState<string>('all')
  const [radarSearchTerm, setRadarSearchTerm] = useState('')
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState<any | null>(null)

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
    return getVacationRadar(activeEmployees as any, vacations as any)
  }, [activeEmployees, vacations])

  const radarEmployees = useMemo(() => {
    return employeesWithAlerts.filter((e: any) => (e as any).vacationAlert?.level && (e as any).vacationAlert.level !== 'ok')
  }, [employeesWithAlerts])

  const filteredRadarEmployees = useMemo(() => {
    return radarEmployees.filter((emp: any) => {
      const matchesSearch =
        String(emp.name || '').toLowerCase().includes(radarSearchTerm.toLowerCase()) ||
        String(emp.cpf || '').includes(radarSearchTerm)
      const matchesStore = radarStoreFilter === 'all' || String((emp as any).storeId || (emp as any).store_id) === radarStoreFilter
      const matchesCategory = radarCategory === 'all' || (emp as any).vacationAlert?.level === radarCategory
      return matchesSearch && matchesStore && matchesCategory
    })
  }, [radarEmployees, radarSearchTerm, radarStoreFilter, radarCategory])

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

  const upcomingVacations = useMemo(() => {
    const today = new Date()
    return (vacations || [])
      .filter((v: any) => {
        const start = (v as any).startDate || (v as any).start_date
        if (!start) return false
        const startDate = new Date(start)
        const diff = Math.ceil((startDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        return diff > 0 && diff <= upcomingDays && (v as any).status === 'scheduled'
      })
      .sort((a: any, b: any) => {
        const as = new Date((a as any).startDate || (a as any).start_date).getTime()
        const bs = new Date((b as any).startDate || (b as any).start_date).getTime()
        return as - bs
      })
  }, [vacations, upcomingDays])

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

  useEffect(() => {
    const empId = searchParams.get('employeeId')
    if (empId) {
      setFormData((prev) => ({ ...prev, employeeId: empId }))
      setIsFormOpen(true)
    }
  }, [searchParams])

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

    try {
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
      toast({
        title: 'Ferias agendadas',
        description: `Ferias de ${employee.name} foram agendadas com sucesso.`,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Falha ao agendar ferias'
      let description = 'Nao foi possivel agendar ferias.'
      if (message.includes('overlap')) {
        description = 'Ja existe ferias sobrepondo este periodo para o funcionario.'
      } else if (message.includes('start_after_end')) {
        description = 'Data inicial nao pode ser maior que a data final.'
      }
      toast({
        title: 'Erro ao agendar',
        description,
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
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

      <Tabs defaultValue="geral" className="space-y-6">
        <TabsList>
          <TabsTrigger value="geral">Visao Geral</TabsTrigger>
          <TabsTrigger value="radar">Radar 60/30/15</TabsTrigger>
        </TabsList>

        <TabsContent value="geral" className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-destructive">Critico - 15 dias</CardTitle>
            <AlertTriangle className="h-5 w-5 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-destructive">{stats.alertCounts.critical}</div>
            <p className="text-xs text-muted-foreground mt-1">Ferias prestes a vencer</p>
            <div className="mt-3">
              <Button size="sm" variant="outline" onClick={() => { setAlertsCategory('critical'); setAlertsOpen(true) }}>
                Visualizar
              </Button>
            </div>
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
            <div className="mt-3">
              <Button size="sm" variant="outline" onClick={() => { setAlertsCategory('attention'); setAlertsOpen(true) }}>
                Visualizar
              </Button>
            </div>
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
            <div className="mt-3">
              <Button size="sm" variant="outline" onClick={() => { setAlertsCategory('planning'); setAlertsOpen(true) }}>
                Visualizar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

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

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-5 w-5 text-primary" />
              Proximas Ferias
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => setAlertsOpen(true)}>
                Alertas de Ferias
              </Button>
              <span className="text-xs text-muted-foreground">Periodo</span>
              <Select value={String(upcomingDays)} onValueChange={(v) => setUpcomingDays(parseInt(v, 10))}>
                <SelectTrigger className="h-7 w-[90px]">
                  <SelectValue placeholder="Dias" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 dias</SelectItem>
                  <SelectItem value="60">60 dias</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">Nos proximos {upcomingDays} dias</p>
        </CardHeader>
        <CardContent>
          {upcomingVacations.length > 0 ? (
            <div className="space-y-3">
              {upcomingVacations.slice(0, 6).map((vacation: any) => {
                const employee = (employees || []).find((e: any) => e.id === ((vacation as any).employeeId || (vacation as any).employee_id))
                return (
                  <div key={vacation.id} className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={(employee as any)?.avatarUrl || (employee as any)?.avatar_url || undefined} alt={employee?.name || 'Avatar'} />
                      <AvatarFallback className="text-xs">
                        {employee ? getInitials(employee.name) : '??'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{employee?.name || 'Funcionario'}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(String((vacation as any).startDate || (vacation as any).start_date))} - {(vacation as any).days} dias
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhuma ferias agendada</p>
          )}
        </CardContent>
      </Card>
      <Dialog open={alertsOpen} onOpenChange={setAlertsOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {alertsCategory === 'critical' ? 'Critico - 15 dias' : alertsCategory === 'attention' ? 'Atencao - 30 dias' : 'Planejamento - 60 dias'}
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs text-muted-foreground">Categoria</span>
            <Select value={alertsCategory} onValueChange={(v) => setAlertsCategory(v as any)}>
              <SelectTrigger className="h-8 w-[180px]">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="critical">Critico - 15 dias</SelectItem>
                <SelectItem value="attention">Atencao - 30 dias</SelectItem>
                <SelectItem value="planning">Planejamento - 60 dias</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            {employeesWithAlerts.filter(e => e.vacationAlert.level === alertsCategory).length > 0 ? (
              employeesWithAlerts
                .filter(e => e.vacationAlert.level === alertsCategory)
                .map((emp: any) => {
                  const storeId = (emp as any).storeId || (emp as any).store_id
                  const store = stores.find(s => (s as any).id === storeId)
                  const daysInfo = (emp as any).vacationAlert?.daysUntilDeadline ?? 0
                  return (
                    <div key={emp.id} className="flex items-center justify-between p-2 border rounded-md">
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs">
                            {emp.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">{emp.name}</div>
                          <div className="text-xs text-muted-foreground truncate">
                            {store ? store.name : 'N/A'} • vence em {daysInfo} dia(s)
                          </div>
                        </div>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => { setFormData((prev) => ({ ...prev, employeeId: emp.id })); setIsFormOpen(true) }}>
                        Agendar
                      </Button>
                    </div>
                  )
                })
            ) : (
              <div className="text-sm text-muted-foreground">Nenhum colaborador nesta categoria.</div>
            )}
          </div>
        </DialogContent>
      </Dialog>

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
        </TabsContent>

        <TabsContent value="radar" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Radar de Ferias</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4 md:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome ou CPF..."
                    value={radarSearchTerm}
                    onChange={(e) => setRadarSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={radarCategory} onValueChange={setRadarCategory}>
                  <SelectTrigger className="w-full md:w-[200px]">
                    <SelectValue placeholder="Categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as Categorias</SelectItem>
                    <SelectItem value="critical">Critico (15 dias)</SelectItem>
                    <SelectItem value="attention">Atencao (30 dias)</SelectItem>
                    <SelectItem value="planning">Planejamento (60 dias)</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={radarStoreFilter} onValueChange={setRadarStoreFilter}>
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

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Funcionario</TableHead>
                    <TableHead className="hidden md:table-cell">Loja</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead className="text-center">Vence em</TableHead>
                    <TableHead className="w-[140px] text-right">Acoes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRadarEmployees.length > 0 ? (
                    filteredRadarEmployees.map((emp: any) => {
                      const storeId = (emp as any).storeId || (emp as any).store_id
                      const alert = (emp as any).vacationAlert
                      return (
                        <TableRow key={emp.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-9 w-9">
                                <AvatarImage src={(emp as any).avatarUrl || (emp as any).avatar_url || undefined} alt={emp.name} />
                                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                                  {getInitials(emp.name)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-medium">{emp.name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <Badge variant="outline">{getStoreName(String(storeId))}</Badge>
                          </TableCell>
                          <TableCell>
                            {alert?.level === 'critical' && <div className="flex items-center gap-1 text-destructive"><AlertTriangle className="h-4 w-4" /><span className="text-xs">Critico</span></div>}
                            {alert?.level === 'attention' && <div className="flex items-center gap-1 text-yellow-600"><AlertCircle className="h-4 w-4" /><span className="text-xs">Atencao</span></div>}
                            {alert?.level === 'planning' && <div className="flex items-center gap-1 text-blue-600"><Info className="h-4 w-4" /><span className="text-xs">Planejamento</span></div>}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="secondary">{alert?.daysUntilDeadline ?? 0} dia(s)</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button size="sm" variant="outline" onClick={() => { setFormData((prev) => ({ ...prev, employeeId: emp.id })); setIsFormOpen(true) }}>
                                Agendar
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => { setSelectedEmployee(emp); setIsProfileOpen(true) }}>
                                Ver Perfil
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center">
                        Nenhum colaborador no radar.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isProfileOpen} onOpenChange={setIsProfileOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Perfil do Funcionario</DialogTitle>
          </DialogHeader>
          {selectedEmployee && <EmployeeProfile employee={selectedEmployee} />}
        </DialogContent>
      </Dialog>
    </div>
  )
}
