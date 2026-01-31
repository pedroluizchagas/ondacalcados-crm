'use client'

import React from 'react'
import { useState, useMemo } from 'react'
import { useMedicalCertificates, useEmployees, useStores, createMedicalCertificate as apiCreateMedicalCertificate } from '@/hooks/use-data'
import type { MedicalCertificate } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
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
import { Plus, Search, FileText, Calendar, Clock, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export default function AtestadosPage() {
  const { certificates, mutate: mutateCertificates } = useMedicalCertificates()
  const { employees } = useEmployees()
  const { stores } = useStores()
  const [searchTerm, setSearchTerm] = useState('')
  const [storeFilter, setStoreFilter] = useState<string>('all')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isEmployeeOpen, setIsEmployeeOpen] = useState(false)
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    employeeId: '',
    startDate: '',
    days: '',
    cid: '',
    notes: '',
  })

  const activeEmployees = (employees || []).filter((e: any) => (e as any).status !== 'terminated')

  const stats = useMemo(() => {
    const today = new Date()
    const currentMonth = today.getMonth()
    const currentYear = today.getFullYear()

    const thisMonth = certificates.filter((cert) => {
      const certDate = new Date(cert.startDate)
      return certDate.getMonth() === currentMonth && certDate.getFullYear() === currentYear
    })

    const totalDaysThisMonth = thisMonth.reduce((sum, cert) => sum + cert.days, 0)
    const totalDaysAll = certificates.reduce((sum, cert) => sum + cert.days, 0)

    return {
      totalCertificates: certificates.length,
      thisMonthCount: thisMonth.length,
      totalDaysThisMonth,
      totalDaysAll,
    }
  }, [certificates])

  const filteredCertificates = useMemo(() => {
    return certificates.filter((cert) => {
      const employee = (employees || []).find((e: any) => e.id === ((cert as any).employeeId || (cert as any).employee_id))
      const matchesSearch = cert.employeeName
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
      const matchesStore = storeFilter === 'all' || ((employee as any)?.storeId || (employee as any)?.store_id) === storeFilter
      return matchesSearch && matchesStore
    }).sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
  }, [certificates, employees, searchTerm, storeFilter])

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

  const resetForm = () => {
    setFormData({
      employeeId: '',
      startDate: '',
      days: '',
      cid: '',
      notes: '',
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

    const daysNumber = parseInt(formData.days, 10)
    if (isNaN(daysNumber) || daysNumber <= 0) {
      toast({
        title: 'Erro',
        description: 'Quantidade de dias deve ser um numero valido maior que zero.',
        variant: 'destructive',
      })
      setIsSubmitting(false)
      return
    }

    await apiCreateMedicalCertificate({
      employeeId: formData.employeeId,
      startDate: formData.startDate,
      days: daysNumber,
      cid: formData.cid || undefined,
      notes: formData.notes || undefined,
    } as any)
    await mutateCertificates()
    setIsFormOpen(false)
    resetForm()
    setIsSubmitting(false)
    toast({
      title: 'Atestado registrado',
      description: `Atestado de ${employee.name} foi registrado com sucesso.`,
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
          <h1 className="text-3xl font-bold tracking-tight">Atestados Medicos</h1>
          <p className="text-muted-foreground">Registre e gerencie os afastamentos por atestado</p>
        </div>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Novo Atestado
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Registrar Atestado</DialogTitle>
              <DialogDescription>
                Preencha os dados do atestado medico
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="employee">Funcionario *</Label>
                <Popover open={isEmployeeOpen} onOpenChange={setIsEmployeeOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={isEmployeeOpen}
                      className="w-full justify-between"
                    >
                      {formData.employeeId
                        ? activeEmployees.find(e => e.id === formData.employeeId)?.name
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
                          {activeEmployees.map((emp) => (
                            <CommandItem
                              key={emp.id}
                              value={`${emp.name} ${getStoreName(emp.storeId)}`}
                              onSelect={() => {
                                setFormData({ ...formData, employeeId: emp.id })
                                setIsEmployeeOpen(false)
                              }}
                            >
                              <div className="flex items-center gap-2">
                                <span>{emp.name}</span>
                                <span className="text-muted-foreground text-xs">- {getStoreName(emp.storeId)}</span>
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
                  <Label htmlFor="startDate">Data de Inicio *</Label>
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
                  <Label htmlFor="days">Quantidade de Dias *</Label>
                  <Input
                    id="days"
                    type="number"
                    min="1"
                    placeholder="Ex: 3"
                    value={formData.days}
                    onChange={(e) =>
                      setFormData({ ...formData, days: e.target.value })
                    }
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cid">CID (opcional)</Label>
                <Input
                  id="cid"
                  placeholder="Ex: J11, M54.5"
                  value={formData.cid}
                  onChange={(e) =>
                    setFormData({ ...formData, cid: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Observacoes (opcional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Descricao do motivo, observacoes medicas..."
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsFormOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting || !formData.employeeId || !formData.startDate || !formData.days}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    'Registrar'
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Atestados</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCertificates}</div>
            <p className="text-xs text-muted-foreground">Atestados registrados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Atestados no Mes</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.thisMonthCount}</div>
            <p className="text-xs text-muted-foreground">Lancados este mes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dias no Mes</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalDaysThisMonth}</div>
            <p className="text-xs text-muted-foreground">Dias de afastamento</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Dias</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalDaysAll}</div>
            <p className="text-xs text-muted-foreground">Dias de afastamento total</p>
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

      {/* Certificates Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ultimos Atestados Lancados</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Funcionario</TableHead>
                <TableHead className="hidden md:table-cell">Loja</TableHead>
                <TableHead>Data Inicio</TableHead>
                <TableHead className="text-center">Dias</TableHead>
                <TableHead className="hidden lg:table-cell">CID</TableHead>
                <TableHead className="hidden xl:table-cell">Observacoes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCertificates.length > 0 ? (
                filteredCertificates.map((cert: any) => {
                  const employee = (employees || []).find((e: any) => e.id === ((cert as any).employeeId || (cert as any).employee_id))
                  return (
                    <TableRow key={cert.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                              {getInitials(cert.employeeName)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{cert.employeeName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge variant="outline">{employee ? getStoreName(String((employee as any).storeId || (employee as any).store_id)) : 'N/A'}</Badge>
                      </TableCell>
                      <TableCell>
                        {formatDate(cert.startDate)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">{cert.days}</Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {cert.cid ? (
                          <Badge variant="outline">{cert.cid}</Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden xl:table-cell max-w-[200px] truncate text-muted-foreground">
                        {cert.notes || '-'}
                      </TableCell>
                    </TableRow>
                  )
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    Nenhum atestado encontrado.
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
