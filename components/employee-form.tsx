'use client'

import React from "react"
import { useState, useEffect } from 'react'
import type { Employee } from '@/types'
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
import { Loader2 } from 'lucide-react'
import { useStores, usePositions } from '@/hooks/use-data'

interface EmployeeFormProps {
  employee?: Employee
  onSubmit: (data: Omit<Employee, 'id'>) => void
  onCancel: () => void
}

const departments = [
  'Vendas',
  'Recursos Humanos',
  'Financeiro',
  'Logistica',
  'Administrativo',
  'Marketing',
  'TI',
]

export function EmployeeForm({ employee, onSubmit, onCancel }: EmployeeFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { stores } = useStores()
  const { positions } = usePositions()
  const [formData, setFormData] = useState({
    name: employee?.name || '',
    email: employee?.email || '',
    phone: employee?.phone || '',
    cpf: employee?.cpf || '',
    positionId: employee?.positionId || '',
    department: employee?.department || '',
    storeId: employee?.storeId || '',
    hireDate: employee?.hireDate || '',
    birthDate: employee?.birthDate || '',
    status: employee?.status || 'active',
    street: employee?.address?.street || '',
    number: employee?.address?.number || '',
    city: employee?.address?.city || '',
    state: employee?.address?.state || '',
    zipCode: employee?.address?.zipCode || '',
  })

  const [baseSalary, setBaseSalary] = useState<number>(0)

  useEffect(() => {
    if (formData.positionId) {
      const pos = positions.find(p => (p as any).id === formData.positionId)
      const salary = Number((pos as any)?.baseSalary ?? (pos as any)?.base_salary ?? 0)
      setBaseSalary(salary)
    } else {
      setBaseSalary(0)
    }
  }, [formData.positionId, positions])

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    await new Promise((resolve) => setTimeout(resolve, 500))

    const employeeData: Omit<Employee, 'id'> = {
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      cpf: formData.cpf,
      positionId: formData.positionId,
      department: formData.department,
      storeId: formData.storeId,
      hireDate: formData.hireDate,
      birthDate: formData.birthDate,
      status: formData.status as Employee['status'],
      address: {
        street: formData.street,
        number: formData.number,
        city: formData.city,
        state: formData.state,
        zipCode: formData.zipCode,
      },
    }

    onSubmit(employeeData)
    setIsSubmitting(false)
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Personal Info */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-muted-foreground">Dados Pessoais</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">Nome Completo *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cpf">CPF *</Label>
            <Input
              id="cpf"
              value={formData.cpf}
              onChange={(e) => handleChange('cpf', e.target.value)}
              placeholder="000.000.000-00"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Telefone *</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              placeholder="(00) 00000-0000"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="birthDate">Data de Nascimento *</Label>
            <Input
              id="birthDate"
              type="date"
              value={formData.birthDate}
              onChange={(e) => handleChange('birthDate', e.target.value)}
              required
            />
          </div>
        </div>
      </div>

      {/* Professional Info */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-muted-foreground">Dados Profissionais</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="storeId">Loja *</Label>
            <Select
              value={formData.storeId}
              onValueChange={(value) => handleChange('storeId', value)}
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
            <Label htmlFor="positionId">Cargo *</Label>
            <Select
              value={formData.positionId}
              onValueChange={(value) => handleChange('positionId', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o cargo" />
              </SelectTrigger>
              <SelectContent>
                {positions.map((position) => (
                  <SelectItem key={position.id} value={position.id}>
                    {String((position as any).name)} - {formatCurrency(Number((position as any)?.baseSalary ?? (position as any)?.base_salary ?? 0))}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="department">Departamento</Label>
            <Select
              value={formData.department}
              onValueChange={(value) => handleChange('department', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o departamento" />
              </SelectTrigger>
              <SelectContent>
                {departments.map((dept) => (
                  <SelectItem key={dept} value={dept}>
                    {dept}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Salario Base (automatico)</Label>
            <div className="h-10 px-3 py-2 rounded-md border bg-muted flex items-center">
              <span className="text-sm font-medium">
                {baseSalary > 0 ? formatCurrency(baseSalary) : 'Selecione um cargo'}
              </span>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="hireDate">Data de Admissao *</Label>
            <Input
              id="hireDate"
              type="date"
              value={formData.hireDate}
              onChange={(e) => handleChange('hireDate', e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => handleChange('status', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Ativo</SelectItem>
                <SelectItem value="inactive">Inativo</SelectItem>
                <SelectItem value="vacation">Ferias</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Address */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-muted-foreground">Endereco</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="street">Rua</Label>
            <Input
              id="street"
              value={formData.street}
              onChange={(e) => handleChange('street', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="number">Numero</Label>
            <Input
              id="number"
              value={formData.number}
              onChange={(e) => handleChange('number', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="zipCode">CEP</Label>
            <Input
              id="zipCode"
              value={formData.zipCode}
              onChange={(e) => handleChange('zipCode', e.target.value)}
              placeholder="00000-000"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="city">Cidade</Label>
            <Input
              id="city"
              value={formData.city}
              onChange={(e) => handleChange('city', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="state">Estado</Label>
            <Input
              id="state"
              value={formData.state}
              onChange={(e) => handleChange('state', e.target.value)}
              placeholder="SP"
            />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting || !formData.storeId || !formData.positionId}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Salvando...
            </>
          ) : employee ? (
            'Atualizar'
          ) : (
            'Cadastrar'
          )}
        </Button>
      </div>
    </form>
  )
}
