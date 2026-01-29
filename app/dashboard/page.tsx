'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useStores, useEmployees, useVacations, useMedicalCertificates, usePayroll, useResignations } from '@/hooks/use-data'
import { Users, UserCheck, Palmtree, AlertTriangle, AlertCircle, Info, Cake, Calendar, ArrowRight, FileText, CalendarDays, DollarSign, Store, UserMinus, Loader2 } from 'lucide-react'
import { Bar, BarChart, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { ChartContainer } from '@/components/ui/chart'
import type { Employee, Vacation } from '@/types'

// Helper function to calculate vacation alert level
function getVacationAlertLevel(employee: Employee, vacations: Vacation[]): { level: 'critical' | 'attention' | 'planning' | 'ok', daysUntilExpiry: number } {
  const hireDate = new Date(employee.hire_date)
  const today = new Date()
  
  // Calculate acquisition periods
  const yearsSinceHire = Math.floor((today.getTime() - hireDate.getTime()) / (1000 * 60 * 60 * 24 * 365))
  
  if (yearsSinceHire < 1) {
    return { level: 'ok', daysUntilExpiry: 365 }
  }
  
  // Check if there's a scheduled or completed vacation for the current acquisition period
  const hasRecentVacation = vacations.some(v => 
    v.employee_id === employee.id && 
    (v.status === 'scheduled' || v.status === 'completed' || v.status === 'in-progress')
  )
  
  if (hasRecentVacation) {
    return { level: 'ok', daysUntilExpiry: 365 }
  }
  
  // Calculate days until vacation expires (after 2 years from hire anniversary)
  const lastAnniversary = new Date(hireDate)
  lastAnniversary.setFullYear(today.getFullYear())
  if (lastAnniversary > today) {
    lastAnniversary.setFullYear(today.getFullYear() - 1)
  }
  
  const expiryDate = new Date(lastAnniversary)
  expiryDate.setFullYear(expiryDate.getFullYear() + 1)
  
  const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  
  if (daysUntilExpiry <= 15) {
    return { level: 'critical', daysUntilExpiry }
  } else if (daysUntilExpiry <= 30) {
    return { level: 'attention', daysUntilExpiry }
  } else if (daysUntilExpiry <= 60) {
    return { level: 'planning', daysUntilExpiry }
  }
  
  return { level: 'ok', daysUntilExpiry }
}

export default function DashboardPage() {
  const today = new Date()
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
  const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)
  
  const [dateRange, setDateRange] = useState({
    start: firstDayOfMonth.toISOString().split('T')[0],
    end: lastDayOfMonth.toISOString().split('T')[0],
  })

  const [storeFilter, setStoreFilter] = useState<string>('all')

  // Fetch data using SWR hooks
  const { data: stores = [], isLoading: loadingStores } = useStores()
  const { data: employees = [], isLoading: loadingEmployees } = useEmployees()
  const { data: vacations = [], isLoading: loadingVacations } = useVacations()
  const { data: certificates = [], isLoading: loadingCertificates } = useMedicalCertificates()
  const { data: payroll = [], isLoading: loadingPayroll } = usePayroll()
  const { data: resignations = [], isLoading: loadingResignations } = useResignations()

  const isLoading = loadingStores || loadingEmployees || loadingVacations || loadingCertificates || loadingPayroll || loadingResignations

  const stats = useMemo(() => {
    const startDate = new Date(dateRange.start)
    const endDate = new Date(dateRange.end)
    const currentMonth = today.getMonth()

    // Filter employees by store
    const filteredEmployees = storeFilter === 'all' 
      ? employees 
      : employees.filter(e => e.store_id === storeFilter)

    const activeEmployees = filteredEmployees.filter((e) => e.status === 'active')
    const onVacation = filteredEmployees.filter((e) => e.status === 'vacation')
    
    const birthdays = filteredEmployees.filter((e) => {
      if (!e.birth_date) return false
      const birthDate = new Date(e.birth_date)
      return birthDate.getMonth() === currentMonth && e.status !== 'terminated'
    })

    const upcomingVacations = vacations.filter((v) => {
      const employee = employees.find(e => e.id === v.employee_id)
      if (storeFilter !== 'all' && employee?.store_id !== storeFilter) return false
      const vacStartDate = new Date(v.start_date)
      const diffDays = Math.ceil((vacStartDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      return diffDays > 0 && diffDays <= 30 && v.status === 'scheduled'
    })

    const vacationAlerts = {
      critical: [] as Employee[],
      attention: [] as Employee[],
      planning: [] as Employee[],
    }

    filteredEmployees
      .filter((e) => e.status === 'active')
      .forEach((employee) => {
        const { level } = getVacationAlertLevel(employee, vacations)
        if (level === 'critical') {
          vacationAlerts.critical.push(employee)
        } else if (level === 'attention') {
          vacationAlerts.attention.push(employee)
        } else if (level === 'planning') {
          vacationAlerts.planning.push(employee)
        }
      })

    const certificatesInPeriod = certificates.filter((cert) => {
      const employee = employees.find(e => e.id === cert.employee_id)
      if (storeFilter !== 'all' && employee?.store_id !== storeFilter) return false
      const certDate = new Date(cert.start_date)
      return certDate >= startDate && certDate <= endDate
    })

    // Calculate expenses by store
    const filteredPayroll = storeFilter === 'all' 
      ? payroll 
      : payroll.filter(p => p.store_id === storeFilter)
    
    const expensesByStore = stores.map(store => {
      const storePayrolls = payroll.filter(p => p.store_id === store.id)
      const totalExpense = storePayrolls.reduce((sum, p) => sum + (p.net_salary || 0), 0)
      return {
        name: store.name.replace('Loja ', ''),
        value: totalExpense,
        fullName: store.name,
      }
    }).filter(s => s.value > 0)

    // Calculate total payroll expense
    const totalPayrollExpense = filteredPayroll.reduce((sum, p) => sum + (p.net_salary || 0), 0)

    // Resignations by month (last 6 months)
    const filteredResignations = storeFilter === 'all'
      ? resignations
      : resignations.filter(r => r.store_id === storeFilter)

    const resignationsByMonth: Record<string, number> = {}
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
    
    // Initialize last 6 months
    for (let i = 5; i >= 0; i--) {
      const d = new Date()
      d.setMonth(d.getMonth() - i)
      const key = `${monthNames[d.getMonth()]}/${d.getFullYear().toString().slice(-2)}`
      resignationsByMonth[key] = 0
    }

    filteredResignations.forEach(r => {
      const date = new Date(r.exit_date)
      const key = `${monthNames[date.getMonth()]}/${date.getFullYear().toString().slice(-2)}`
      if (resignationsByMonth[key] !== undefined) {
        resignationsByMonth[key]++
      }
    })

    const resignationsChartData = Object.entries(resignationsByMonth).map(([month, count]) => ({
      month,
      count,
    }))

    const totalResignations = filteredResignations.length
    const thisMonthResignations = filteredResignations.filter(r => {
      const date = new Date(r.exit_date)
      return date.getMonth() === currentMonth && date.getFullYear() === today.getFullYear()
    }).length

    return {
      total: filteredEmployees.filter((e) => e.status !== 'terminated').length,
      active: activeEmployees.length,
      onVacation: onVacation.length,
      totalCertificates: certificatesInPeriod.length,
      totalCertificateDays: certificatesInPeriod.reduce((sum, cert) => sum + cert.days, 0),
      birthdays,
      upcomingVacations,
      vacationAlerts,
      expensesByStore,
      totalPayrollExpense,
      resignationsChartData,
      totalResignations,
      thisMonthResignations,
    }
  }, [dateRange, storeFilter, employees, vacations, certificates, payroll, resignations, stores, today])

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  const COLORS = ['#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#dbeafe']

  const chartConfig = {
    value: {
      label: 'Gasto',
      color: 'var(--primary)',
    },
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Carregando dados...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Visao geral do sistema de RH da Onda Calcados
          </p>
        </div>
        
        {/* Filters */}
        <Card className="p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            {/* Store Filter */}
            <div className="flex items-center gap-2">
              <Store className="h-4 w-4 text-muted-foreground" />
              <Select value={storeFilter} onValueChange={setStoreFilter}>
                <SelectTrigger className="w-[180px] h-8">
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

            {/* Date Range Filter */}
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Periodo:</span>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="flex items-center gap-2">
                <Label htmlFor="start-date" className="text-xs text-muted-foreground">De</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                  className="w-[140px] h-8"
                />
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="end-date" className="text-xs text-muted-foreground">Ate</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                  className="w-[140px] h-8"
                />
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Funcionarios</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Colaboradores ativos no sistema</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Funcionarios Ativos</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.active}</div>
            <p className="text-xs text-muted-foreground">Trabalhando atualmente</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Em Ferias</CardTitle>
            <Palmtree className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.onVacation}</div>
            <p className="text-xs text-muted-foreground">Funcionarios em periodo de ferias</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Atestados no Periodo</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCertificates}</div>
            <p className="text-xs text-muted-foreground">{stats.totalCertificateDays} dias de afastamento</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rescisoes no Mes</CardTitle>
            <UserMinus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.thisMonthResignations}</div>
            <p className="text-xs text-muted-foreground">{stats.totalResignations} total registradas</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Expenses by Store Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Store className="h-5 w-5 text-primary" />
              Gastos por Loja
            </CardTitle>
            <CardDescription>Distribuicao de folha de pagamento por loja</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.expensesByStore.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.expensesByStore} layout="vertical" margin={{ left: 10, right: 30 }}>
                    <XAxis type="number" tickFormatter={(value) => `R$${(value / 1000).toFixed(0)}k`} />
                    <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 12 }} />
                    <Tooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-background border rounded-lg shadow-lg p-3">
                              <p className="font-medium">{payload[0].payload.fullName}</p>
                              <p className="text-primary">{formatCurrency(payload[0].value as number)}</p>
                            </div>
                          )
                        }
                        return null
                      }}
                    />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {stats.expensesByStore.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                Nenhum dado disponivel
              </div>
            )}
            <div className="mt-4 pt-4 border-t">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Total Geral</span>
                <span className="text-lg font-bold text-primary">{formatCurrency(stats.totalPayrollExpense)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Resignations Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserMinus className="h-5 w-5 text-primary" />
              Rescisoes por Mes
            </CardTitle>
            <CardDescription>Historico de desligamentos nos ultimos 6 meses</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.resignationsChartData} margin={{ left: 10, right: 30 }}>
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-background border rounded-lg shadow-lg p-3">
                            <p className="font-medium">{payload[0].payload.month}</p>
                            <p className="text-primary">{payload[0].value} rescisao(es)</p>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  <Bar dataKey="count" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
            <div className="mt-4 pt-4 border-t">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Total no Periodo</span>
                <span className="text-lg font-bold text-destructive">{stats.totalResignations} rescisoes</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Vacation Alerts */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Alertas de Ferias</h2>
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/ferias">
              Ver todos
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {/* Critical - 15 days */}
          <Card className="border-destructive/50 bg-destructive/5">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-destructive">Critico - 15 dias</CardTitle>
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-destructive">{stats.vacationAlerts.critical.length}</div>
              <p className="text-xs text-muted-foreground mt-1">Funcionarios com ferias vencendo</p>
              {stats.vacationAlerts.critical.length > 0 && (
                <div className="mt-3 space-y-2">
                  {stats.vacationAlerts.critical.slice(0, 3).map((emp) => (
                    <div key={emp.id} className="flex items-center gap-2 text-sm">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-xs bg-destructive text-destructive-foreground">
                          {getInitials(emp.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="truncate">{emp.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Attention - 30 days */}
          <Card className="border-yellow-500/50 bg-yellow-500/5">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-yellow-600">Atencao - 30 dias</CardTitle>
              <AlertCircle className="h-5 w-5 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-yellow-600">{stats.vacationAlerts.attention.length}</div>
              <p className="text-xs text-muted-foreground mt-1">Funcionarios para agendar</p>
              {stats.vacationAlerts.attention.length > 0 && (
                <div className="mt-3 space-y-2">
                  {stats.vacationAlerts.attention.slice(0, 3).map((emp) => (
                    <div key={emp.id} className="flex items-center gap-2 text-sm">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-xs bg-yellow-500 text-white">
                          {getInitials(emp.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="truncate">{emp.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Planning - 60 days */}
          <Card className="border-blue-500/50 bg-blue-500/5">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-600">Planejamento - 60 dias</CardTitle>
              <Info className="h-5 w-5 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">{stats.vacationAlerts.planning.length}</div>
              <p className="text-xs text-muted-foreground mt-1">Funcionarios para planejar</p>
              {stats.vacationAlerts.planning.length > 0 && (
                <div className="mt-3 space-y-2">
                  {stats.vacationAlerts.planning.slice(0, 3).map((emp) => (
                    <div key={emp.id} className="flex items-center gap-2 text-sm">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-xs bg-blue-500 text-white">
                          {getInitials(emp.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="truncate">{emp.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Upcoming Vacations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-5 w-5 text-primary" />
              Proximas Ferias
            </CardTitle>
            <CardDescription>Nos proximos 30 dias</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.upcomingVacations.length > 0 ? (
              <div className="space-y-3">
                {stats.upcomingVacations.slice(0, 3).map((vacation) => {
                  const employee = employees.find(e => e.id === vacation.employee_id)
                  return (
                    <div key={vacation.id} className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">
                          {employee ? getInitials(employee.name) : '??'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{employee?.name || 'Funcionario'}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(vacation.start_date)} - {vacation.days} dias
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

        {/* Birthdays */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Cake className="h-5 w-5 text-primary" />
              Aniversariantes do Mes
            </CardTitle>
            <CardDescription>Colaboradores</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.birthdays.length > 0 ? (
              <div className="space-y-3">
                {stats.birthdays.slice(0, 3).map((employee) => (
                  <div key={employee.id} className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">
                        {getInitials(employee.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{employee.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {employee.birth_date ? formatDate(employee.birth_date) : 'Data nao informada'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhum aniversariante este mes</p>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Acoes Rapidas</CardTitle>
            <CardDescription>Atalhos do sistema</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" size="sm" className="w-full justify-start bg-transparent" asChild>
              <Link href="/dashboard/funcionarios">
                <Users className="mr-2 h-4 w-4" />
                Novo Funcionario
              </Link>
            </Button>
            <Button variant="outline" size="sm" className="w-full justify-start bg-transparent" asChild>
              <Link href="/dashboard/ferias">
                <Palmtree className="mr-2 h-4 w-4" />
                Agendar Ferias
              </Link>
            </Button>
            <Button variant="outline" size="sm" className="w-full justify-start bg-transparent" asChild>
              <Link href="/dashboard/folha-pagamento">
                <DollarSign className="mr-2 h-4 w-4" />
                Folha de Pagamento
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* System Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Informacoes</CardTitle>
            <CardDescription>Status do sistema</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Lojas cadastradas</span>
              <Badge variant="secondary">{stores.length}</Badge>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total funcionarios</span>
              <Badge variant="secondary">{employees.length}</Badge>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Ferias agendadas</span>
              <Badge variant="secondary">{vacations.filter(v => v.status === 'scheduled').length}</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
