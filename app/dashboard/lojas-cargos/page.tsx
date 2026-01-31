'use client'

import { useState, useMemo } from 'react'
import { usePositions, useStores, useEmployees, createStore as apiCreateStore, updateStore as apiUpdateStore, deleteStore as apiDeleteStore, createPosition as apiCreatePosition, updatePosition as apiUpdatePosition, deletePosition as apiDeletePosition } from '@/hooks/use-data'
import type { Position, Store } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  DialogFooter,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Search, Plus, MoreHorizontal, Pencil, Trash2, Loader2, Briefcase, Users, DollarSign, Building, MapPin } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export default function LojasCargosPage() {
  const { stores, mutate: mutateStores } = useStores()
  const [storeSearchTerm, setStoreSearchTerm] = useState('')
  const [isNewStoreOpen, setIsNewStoreOpen] = useState(false)
  const [isEditStoreOpen, setIsEditStoreOpen] = useState(false)
  const [isDeleteStoreOpen, setIsDeleteStoreOpen] = useState(false)
  const [selectedStore, setSelectedStore] = useState<Store | null>(null)

  const { positions, mutate: mutatePositions } = usePositions()
  const { employees } = useEmployees()
  const [searchTerm, setSearchTerm] = useState('')
  const [storeFilter, setStoreFilter] = useState<string>('all')
  const [isNewOpen, setIsNewOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  // Store form
  const [storeFormData, setStoreFormData] = useState({
    name: '',
    cnpj: '',
    city: '',
  })

  // Position form
  const [formData, setFormData] = useState({
    name: '',
    baseSalary: '',
    storeId: '',
    description: '',
  })

  // Stats
  const stats = useMemo(() => {
    const totalPositions = positions.length
    const avgSalary = positions.reduce((sum, p: any) => sum + Number((p as any)?.baseSalary ?? (p as any)?.base_salary ?? 0), 0) / (positions.length || 1)
    const totalStores = stores.length
    const totalEmployeesInPositions = positions.reduce((sum, p) => {
      return sum + (employees || []).filter((e: any) => ((e as any).positionId || (e as any).position_id) === (p as any).id && (e as any).status === 'active').length
    }, 0)
    return { totalPositions, avgSalary, totalStores, totalEmployeesInPositions }
  }, [positions, stores, employees])

  // Filtered data
  const filteredStores = useMemo(() => {
    return stores.filter((store) => 
      store.name.toLowerCase().includes(storeSearchTerm.toLowerCase()) ||
      store.cnpj.includes(storeSearchTerm) ||
      (store.city && store.city.toLowerCase().includes(storeSearchTerm.toLowerCase()))
    )
  }, [stores, storeSearchTerm])

  const filteredPositions = useMemo(() => {
    return positions.filter((position) => {
      const matchesSearch = position.name.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesStore = storeFilter === 'all' || position.storeId === storeFilter
      return matchesSearch && matchesStore
    })
  }, [positions, searchTerm, storeFilter])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  const getEmployeeCount = (positionId: string) => {
    return (employees || []).filter((e: any) => ((e as any).positionId || (e as any).position_id) === positionId && (e as any).status === 'active').length
  }

  const getStoreEmployeeCount = (storeId: string) => {
    return (employees || []).filter((e: any) => ((e as any).storeId || (e as any).store_id) === storeId && (e as any).status === 'active').length
  }

  // Store handlers
  const resetStoreForm = () => {
    setStoreFormData({ name: '', cnpj: '', city: '' })
  }

  const openEditStore = (store: Store) => {
    setSelectedStore(store)
    setStoreFormData({
      name: store.name,
      cnpj: store.cnpj,
      city: store.city || '',
    })
    setIsEditStoreOpen(true)
  }

  const openDeleteStore = (store: Store) => {
    setSelectedStore(store)
    setIsDeleteStoreOpen(true)
  }

  const handleCreateStore = async () => {
    if (!storeFormData.name || !storeFormData.cnpj) {
      toast({
        title: 'Campos obrigatorios',
        description: 'Preencha o nome e CNPJ da loja.',
        variant: 'destructive',
      })
      return
    }

    setIsSubmitting(true)
    await apiCreateStore({
      name: storeFormData.name,
      cnpj: storeFormData.cnpj,
      city: storeFormData.city || undefined,
    } as any)
    await mutateStores()
    setIsSubmitting(false)
    setIsNewStoreOpen(false)
    resetStoreForm()
    toast({
      title: 'Loja criada',
      description: `${storeFormData.name} foi criada com sucesso.`,
    })
  }

  const handleEditStore = async () => {
    if (!selectedStore || !storeFormData.name || !storeFormData.cnpj) {
      toast({
        title: 'Campos obrigatorios',
        description: 'Preencha o nome e CNPJ da loja.',
        variant: 'destructive',
      })
      return
    }

    setIsSubmitting(true)
    await apiUpdateStore(String(selectedStore.id), {
      name: storeFormData.name,
      cnpj: storeFormData.cnpj,
      city: storeFormData.city || undefined,
    } as any)
    await mutateStores()

    setIsSubmitting(false)
    setIsEditStoreOpen(false)
    setSelectedStore(null)
    resetStoreForm()
    toast({
      title: 'Loja atualizada',
      description: `${storeFormData.name} foi atualizada com sucesso.`,
    })
  }

  const handleDeleteStore = async () => {
    if (!selectedStore) return

    const employeeCount = getStoreEmployeeCount(selectedStore.id)
    if (employeeCount > 0) {
      toast({
        title: 'Nao e possivel excluir',
        description: `Esta loja possui ${employeeCount} funcionario(s) vinculado(s).`,
        variant: 'destructive',
      })
      setIsDeleteStoreOpen(false)
      return
    }

    setIsSubmitting(true)
    await apiDeleteStore(String(selectedStore.id))
    await mutateStores()
    setIsSubmitting(false)
    setIsDeleteStoreOpen(false)
    setSelectedStore(null)
    toast({
      title: 'Loja excluida',
      description: 'A loja foi excluida com sucesso.',
    })
  }

  // Position handlers
  const resetForm = () => {
    setFormData({ name: '', baseSalary: '', storeId: '', description: '' })
  }

  const openEdit = (position: Position) => {
    setSelectedPosition(position)
    setFormData({
      name: position.name,
      baseSalary: position.baseSalary.toString(),
      storeId: position.storeId || '',
      description: position.description || '',
    })
    setIsEditOpen(true)
  }

  const openDelete = (position: Position) => {
    setSelectedPosition(position)
    setIsDeleteOpen(true)
  }

  const handleCreate = async () => {
    if (!formData.name || !formData.baseSalary || !formData.storeId) {
      toast({
        title: 'Campos obrigatorios',
        description: 'Preencha todos os campos obrigatorios.',
        variant: 'destructive',
      })
      return
    }

    setIsSubmitting(true)
    await apiCreatePosition({
      name: formData.name,
      baseSalary: parseFloat(formData.baseSalary),
      storeId: formData.storeId,
      description: formData.description || undefined,
    } as any)
    await mutatePositions()
    setIsSubmitting(false)
    setIsNewOpen(false)
    resetForm()
    toast({
      title: 'Cargo criado',
      description: `${formData.name} foi criado com sucesso.`,
    })
  }

  const handleEdit = async () => {
    if (!selectedPosition || !formData.name || !formData.baseSalary || !formData.storeId) {
      toast({
        title: 'Campos obrigatorios',
        description: 'Preencha todos os campos obrigatorios.',
        variant: 'destructive',
      })
      return
    }

    setIsSubmitting(true)
    await apiUpdatePosition(String(selectedPosition.id), {
      name: formData.name,
      baseSalary: parseFloat(formData.baseSalary),
      storeId: formData.storeId,
      description: formData.description || undefined,
    } as any)
    await mutatePositions()

    setIsSubmitting(false)
    setIsEditOpen(false)
    setSelectedPosition(null)
    resetForm()
    toast({
      title: 'Cargo atualizado',
      description: `${formData.name} foi atualizado com sucesso.`,
    })
  }

  const handleDelete = async () => {
    if (!selectedPosition) return

    const employeeCount = getEmployeeCount(selectedPosition.id)
    if (employeeCount > 0) {
      toast({
        title: 'Nao e possivel excluir',
        description: `Este cargo possui ${employeeCount} funcionario(s) vinculado(s).`,
        variant: 'destructive',
      })
      setIsDeleteOpen(false)
      return
    }

    setIsSubmitting(true)
    await apiDeletePosition(String(selectedPosition.id))
    await mutatePositions()
    setIsSubmitting(false)
    setIsDeleteOpen(false)
    setSelectedPosition(null)
    toast({
      title: 'Cargo excluido',
      description: 'O cargo foi excluido com sucesso.',
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Lojas e Cargos</h1>
        <p className="text-muted-foreground">Gerencie unidades e cargos com suas faixas salariais</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Lojas</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalStores}</div>
            <p className="text-xs text-muted-foreground">Unidades cadastradas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Cargos</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPositions}</div>
            <p className="text-xs text-muted-foreground">Cargos cadastrados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Media Salarial</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.avgSalary)}</div>
            <p className="text-xs text-muted-foreground">Salario base medio</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Funcionarios</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalEmployeesInPositions}</div>
            <p className="text-xs text-muted-foreground">Em cargos ativos</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Stores and Positions */}
      <Tabs defaultValue="lojas" className="space-y-4">
        <TabsList>
          <TabsTrigger value="lojas">Lojas / Unidades</TabsTrigger>
          <TabsTrigger value="cargos">Cargos</TabsTrigger>
        </TabsList>

        {/* Stores Tab */}
        <TabsContent value="lojas" className="space-y-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, CNPJ ou cidade..."
                value={storeSearchTerm}
                onChange={(e) => setStoreSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button onClick={() => setIsNewStoreOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Nova Loja
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome da Loja</TableHead>
                    <TableHead>CNPJ</TableHead>
                    <TableHead>Cidade</TableHead>
                    <TableHead className="text-center">Funcionarios</TableHead>
                    <TableHead className="w-[70px]">Acoes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStores.length > 0 ? (
                    filteredStores.map((store) => (
                      <TableRow key={store.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Building className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{store.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{store.cnpj}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-muted-foreground" />
                            {store.city || '-'}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary">{getStoreEmployeeCount(store.id)}</Badge>
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
                              <DropdownMenuItem onClick={() => openEditStore(store)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openDeleteStore(store)} className="text-destructive">
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
                      <TableCell colSpan={5} className="h-24 text-center">
                        Nenhuma loja encontrada.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Positions Tab */}
        <TabsContent value="cargos" className="space-y-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-col gap-4 md:flex-row flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome do cargo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={storeFilter} onValueChange={setStoreFilter}>
                <SelectTrigger className="w-full md:w-[200px]">
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
            <Button onClick={() => setIsNewOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Cargo
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cargo</TableHead>
                    <TableHead>Loja</TableHead>
                    <TableHead>Salario Base</TableHead>
                    <TableHead className="hidden md:table-cell">Descricao</TableHead>
                    <TableHead className="text-center">Funcionarios</TableHead>
                    <TableHead className="w-[70px]">Acoes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPositions.length > 0 ? (
                    filteredPositions.map((position) => (
                      <TableRow key={position.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Briefcase className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{position.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{(position as any).storeId || (position as any).store_id ? (stores.find(s => (s as any).id === ((position as any).storeId || (position as any).store_id))?.name || '-') : '-'}</Badge>
                        </TableCell>
                        <TableCell className="font-semibold text-primary">
                          {formatCurrency(Number((position as any)?.baseSalary ?? (position as any)?.base_salary ?? 0))}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground max-w-[200px] truncate">
                          {position.description || '-'}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary">{getEmployeeCount(position.id)}</Badge>
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
                              <DropdownMenuItem onClick={() => openEdit(position)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openDelete(position)} className="text-destructive">
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
                        Nenhum cargo encontrado.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Store Dialogs */}
      <Dialog open={isNewStoreOpen} onOpenChange={(open) => { setIsNewStoreOpen(open); if (!open) resetStoreForm() }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Nova Loja
            </DialogTitle>
            <DialogDescription>Cadastre uma nova unidade/loja</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="store-name">Nome da Loja *</Label>
              <Input
                id="store-name"
                value={storeFormData.name}
                onChange={(e) => setStoreFormData({ ...storeFormData, name: e.target.value })}
                placeholder="Ex: Loja Centro, Loja Shopping..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="store-cnpj">CNPJ *</Label>
              <Input
                id="store-cnpj"
                value={storeFormData.cnpj}
                onChange={(e) => setStoreFormData({ ...storeFormData, cnpj: e.target.value })}
                placeholder="00.000.000/0000-00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="store-city">Cidade</Label>
              <Input
                id="store-city"
                value={storeFormData.city}
                onChange={(e) => setStoreFormData({ ...storeFormData, city: e.target.value })}
                placeholder="Ex: Sao Paulo"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewStoreOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateStore} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : 'Criar Loja'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditStoreOpen} onOpenChange={(open) => { setIsEditStoreOpen(open); if (!open) { resetStoreForm(); setSelectedStore(null) } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5" />
              Editar Loja
            </DialogTitle>
            <DialogDescription>Atualize as informacoes da loja</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-store-name">Nome da Loja *</Label>
              <Input
                id="edit-store-name"
                value={storeFormData.name}
                onChange={(e) => setStoreFormData({ ...storeFormData, name: e.target.value })}
                placeholder="Ex: Loja Centro, Loja Shopping..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-store-cnpj">CNPJ *</Label>
              <Input
                id="edit-store-cnpj"
                value={storeFormData.cnpj}
                onChange={(e) => setStoreFormData({ ...storeFormData, cnpj: e.target.value })}
                placeholder="00.000.000/0000-00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-store-city">Cidade</Label>
              <Input
                id="edit-store-city"
                value={storeFormData.city}
                onChange={(e) => setStoreFormData({ ...storeFormData, city: e.target.value })}
                placeholder="Ex: Sao Paulo"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditStoreOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEditStore} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : 'Salvar Alteracoes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteStoreOpen} onOpenChange={setIsDeleteStoreOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Excluir Loja
            </DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir a loja{' '}
              <span className="font-semibold">{selectedStore?.name}</span>?
              Esta acao nao pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteStoreOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteStore} disabled={isSubmitting}>
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

      {/* Position Dialogs */}
      <Dialog open={isNewOpen} onOpenChange={(open) => { setIsNewOpen(open); if (!open) resetForm() }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Novo Cargo
            </DialogTitle>
            <DialogDescription>Cadastre um novo cargo com seu salario base</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Cargo *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Vendedor, Gerente, Caixa..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="store">Loja *</Label>
              <Select
                value={formData.storeId}
                onValueChange={(value) => setFormData({ ...formData, storeId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a loja" />
                </SelectTrigger>
                <SelectContent>
                  {stores.map((store) => (
                    <SelectItem key={store.id} value={store.id}>
                      {store.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="baseSalary">Salario Base (R$) *</Label>
              <Input
                id="baseSalary"
                type="number"
                step="0.01"
                value={formData.baseSalary}
                onChange={(e) => setFormData({ ...formData, baseSalary: e.target.value })}
                placeholder="0,00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descricao</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descricao breve do cargo..."
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
              ) : 'Criar Cargo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={(open) => { setIsEditOpen(open); if (!open) { resetForm(); setSelectedPosition(null) } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5" />
              Editar Cargo
            </DialogTitle>
            <DialogDescription>Atualize as informacoes do cargo</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nome do Cargo *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Vendedor, Gerente, Caixa..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-store">Loja *</Label>
              <Select
                value={formData.storeId}
                onValueChange={(value) => setFormData({ ...formData, storeId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a loja" />
                </SelectTrigger>
                <SelectContent>
                  {stores.map((store) => (
                    <SelectItem key={store.id} value={store.id}>
                      {store.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-baseSalary">Salario Base (R$) *</Label>
              <Input
                id="edit-baseSalary"
                type="number"
                step="0.01"
                value={formData.baseSalary}
                onChange={(e) => setFormData({ ...formData, baseSalary: e.target.value })}
                placeholder="0,00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Descricao</Label>
              <Input
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descricao breve do cargo..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEdit} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : 'Salvar Alteracoes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Excluir Cargo
            </DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o cargo{' '}
              <span className="font-semibold">{selectedPosition?.name}</span>?
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
