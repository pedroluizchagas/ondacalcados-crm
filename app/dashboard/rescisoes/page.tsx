'use client'

import { useState, useMemo } from 'react'
import { mockResignations, mockEmployees, mockStores, getStoreName } from '@/lib/mock-data'
import type { Resignation } from '@/types'
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
  DialogFooter,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Search, Plus, MoreHorizontal, Eye, Trash2, Loader2, UserMinus, DollarSign, TrendingDown, Calendar } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

const reasonMap: Record<Resignation['reason'], { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pedido: { label: 'Pedido de Demissao', variant: 'secondary' },
  sem_justa_causa: { label: 'Sem Justa Causa', variant: 'default' },
  justa_causa: { label: 'Justa Causa', variant: 'destructive' },
  acordo: { label: 'Acordo Mutuo', variant: 'outline' },
  termino_contrato: { label: 'Termino de Contrato', variant: 'secondary' },
}

export default function RescisoesPage() {
  const [resignations, setResignations] = useState<Resignation[]>(mockResignations)
  const [searchTerm, setSearchTerm] = useState('')
  const [reasonFilter, setReasonFilter] = useState<string>('all')
  const [storeFilter, setStoreFilter] = useState<string>('all')
  const [selectedResignation, setSelectedResignation] = useState<Resignation | null>(null)
  const [isNewOpen, setIsNewOpen] = useState(false)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isEmployeeOpen, setIsEmployeeOpen] = useState(false)
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    employeeId: '',
    exitDate: new Date().toISOString().split('T')[0],
    reason: '' as Resignation['reason'] | '',
    totalAmount: '',
    notes: '',
  })

  const stats = useMemo(() => {
    const total = resignations.length
    const totalAmount = resignations.reduce((sum, r) => sum + r.totalAmount, 0)
    const currentMonth = new Date().getMonth()
    const currentYear = new Date().getFullYear()
    const thisMonth = resignations.filter(r => {
      const date = new Date(r.exitDate)
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear
    }).length
    const byReason = Object.entries(reasonMap).map(([reason, config]) => ({
      reason,
      label: config.label,
      count: resignations.filter(r => r.reason === reason).length,
    }))
    return { total, totalAmount, thisMonth, byReason }
  }, [resignations])

  const filteredResignations = useMemo(() => {
    return resignations.filter((resignation) => {
      const matchesSearch = resignation.employeeName.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesReason = reasonFilter === 'all' || resignation.reason === reasonFilter
      const matchesStore = storeFilter === 'all' || resignation.storeId === storeFilter
      return matchesSearch && matchesReason && matchesStore
    })
  }, [resignations, searchTerm, reasonFilter, storeFilter])

  const activeEmployees = useMemo(() => {
    return mockEmployees.filter(e => e.status === 'active')
  }, [])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR')
  }

  const resetForm = () => {
    setFormData({
      employeeId: '',
      exitDate: new Date().toISOString().split('T')[0],
      reason: '',
      totalAmount: '',
      notes: '',
    })
  }

  const handleCreate = async () => {
    if (!formData.employeeId || !formData.exitDate || !formData.reason || !formData.totalAmount) {
      toast({
        title: 'Campos obrigatorios',
        description: 'Preencha todos os campos obrigatorios.',
        variant: 'destructive',
      })
      return
    }

    setIsSubmitting(true)
    await new Promise(resolve => setTimeout(resolve, 500))

    const employee = mockEmployees.find(e => e.id === formData.employeeId)
    if (!employee) return

    const newResignation: Resignation = {
      id: `res-${Date.now()}`,
      employeeId: employee.id,
      employeeName: employee.name,
      storeId: employee.storeId,
      exitDate: formData.exitDate,
      reason: formData.reason as Resignation['reason'],
      totalAmount: parseFloat(formData.totalAmount),
      notes: formData.notes || undefined,
      createdAt: new Date().toISOString().split('T')[0],
    }

    setResignations([...resignations, newResignation])
    setIsSubmitting(false)
    setIsNewOpen(false)
    resetForm()
    toast({
      title: 'Rescisao registrada',
      description: `Rescisao de ${employee.name} foi registrada com sucesso.`,
    })
  }

  const openDetails = (resignation: Resignation) => {
    setSelectedResignation(resignation)
    setIsDetailsOpen(true)
  }

  const openDelete = (resignation: Resignation) => {
    setSelectedResignation(resignation)
    setIsDeleteOpen(true)
  }

  const handleDelete = async () => {
    if (!selectedResignation) return

    setIsSubmitting(true)
    await new Promise(resolve => setTimeout(resolve, 500))

    setResignations(resignations.filter(r => r.id !== selectedResignation.id))
    setIsSubmitting(false)
    setIsDeleteOpen(false)
    setSelectedResignation(null)
    toast({
      title: 'Rescisao excluida',
      description: 'O registro de rescisao foi excluido com sucesso.',
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Rescisoes</h1>
          <p className="text-muted-foreground">Gerencie os desligamentos de funcionarios</p>
        </div>
        <Button onClick={() => setIsNewOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Rescisao
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Rescisoes</CardTitle>
            <UserMinus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Rescisoes registradas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Este Mes</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.thisMonth}</div>
            <p className="text-xs text-muted-foreground">Rescisoes no mes atual</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalAmount)}</div>
            <p className="text-xs text-muted-foreground">Total em rescisoes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pedidos</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.byReason.find(r => r.reason === 'pedido')?.count || 0}</div>
            <p className="text-xs text-muted-foreground">Pedidos de demissao</p>
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
                placeholder="Buscar por nome..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={reasonFilter} onValueChange={setReasonFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Motivo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Motivos</SelectItem>
                {Object.entries(reasonMap).map(([key, { label }]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={storeFilter} onValueChange={setStoreFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Loja" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Lojas</SelectItem>
                {mockStores.map((store) => (
                  <SelectItem key={store.id} value={store.id}>
                    {store.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Resignations Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Funcionario</TableHead>
                <TableHead>Loja</TableHead>
                <TableHead>Data de Saida</TableHead>
                <TableHead>Motivo</TableHead>
                <TableHead className="text-right">Valor Total</TableHead>
                <TableHead className="w-[70px]">Acoes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredResignations.length > 0 ? (
                filteredResignations.map((resignation) => (
                  <TableRow key={resignation.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <UserMinus className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{resignation.employeeName}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{getStoreName(resignation.storeId)}</Badge>
                    </TableCell>
                    <TableCell>{formatDate(resignation.exitDate)}</TableCell>
                    <TableCell>
                      <Badge variant={reasonMap[resignation.reason].variant}>
                        {reasonMap[resignation.reason].label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold text-primary">
                      {formatCurrency(resignation.totalAmount)}
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
                          <DropdownMenuItem onClick={() => openDetails(resignation)}>
                            <Eye className="mr-2 h-4 w-4" />
                            Ver Detalhes
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openDelete(resignation)} className="text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    Nenhuma rescisao encontrada.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* New Resignation Dialog */}
      <Dialog open={isNewOpen} onOpenChange={(open) => { setIsNewOpen(open); if (!open) resetForm() }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserMinus className="h-5 w-5" />
              Nova Rescisao
            </DialogTitle>
            <DialogDescription>Registre o desligamento de um funcionario</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
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
                        {activeEmployees.map((employee) => (
                          <CommandItem
                            key={employee.id}
                            value={`${employee.name} ${getStoreName(employee.storeId)}`}
                            onSelect={() => {
                              setFormData({ ...formData, employeeId: employee.id })
                              setIsEmployeeOpen(false)
                            }}
                          >
                            {employee.name} - {getStoreName(employee.storeId)}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label htmlFor="exitDate">Data de Saida *</Label>
              <Input
                id="exitDate"
                type="date"
                value={formData.exitDate}
                onChange={(e) => setFormData({ ...formData, exitDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reason">Motivo *</Label>
              <Select
                value={formData.reason}
                onValueChange={(value) => setFormData({ ...formData, reason: value as Resignation['reason'] })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o motivo" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(reasonMap).map(([key, { label }]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="totalAmount">Valor Total Rescisorio (R$) *</Label>
              <Input
                id="totalAmount"
                type="number"
                step="0.01"
                value={formData.totalAmount}
                onChange={(e) => setFormData({ ...formData, totalAmount: e.target.value })}
                placeholder="0,00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Observacoes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Observacoes sobre a rescisao..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : 'Registrar Rescisao'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserMinus className="h-5 w-5" />
              Detalhes da Rescisao
            </DialogTitle>
          </DialogHeader>
          {selectedResignation && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Funcionario</p>
                  <p className="font-medium">{selectedResignation.employeeName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Loja</p>
                  <p className="font-medium">{getStoreName(selectedResignation.storeId)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Data de Saida</p>
                  <p className="font-medium">{formatDate(selectedResignation.exitDate)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Motivo</p>
                  <Badge variant={reasonMap[selectedResignation.reason].variant}>
                    {reasonMap[selectedResignation.reason].label}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Valor Total</p>
                  <p className="text-lg font-bold text-primary">{formatCurrency(selectedResignation.totalAmount)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Data de Registro</p>
                  <p className="font-medium">{formatDate(selectedResignation.createdAt)}</p>
                </div>
              </div>
              {selectedResignation.notes && (
                <div>
                  <p className="text-sm text-muted-foreground">Observacoes</p>
                  <p className="text-sm">{selectedResignation.notes}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailsOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Excluir Rescisao
            </DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o registro de rescisao de{' '}
              <span className="font-semibold">{selectedResignation?.employeeName}</span>?
              Esta acao nao pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Excluindo...
                </>
              ) : 'Excluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
