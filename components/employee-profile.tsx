'use client'

import type { Employee } from '@/types'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Mail, Phone, MapPin, Building, Calendar, DollarSign, AlertCircle, Store, Briefcase } from 'lucide-react'
import { useStores, usePositions } from '@/hooks/use-data'

interface EmployeeProfileProps {
  employee: Employee
}

const statusMap: Record<Employee['status'], { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  active: { label: 'Ativo', variant: 'default' },
  inactive: { label: 'Inativo', variant: 'secondary' },
  vacation: { label: 'Ferias', variant: 'outline' },
  terminated: { label: 'Desligado', variant: 'destructive' },
}

export function EmployeeProfile({ employee }: EmployeeProfileProps) {
  const { stores } = useStores()
  const { positions } = usePositions()
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR')
  }

  const storeName = (() => {
    const s = stores.find(st => (st as any).id === ((employee as any).storeId || (employee as any).store_id))
    return s?.name || 'N/A'
  })()

  const positionName = (() => {
    const p = positions.find(pp => (pp as any).id === ((employee as any).positionId || (employee as any).position_id))
    return String(p?.name || 'N/A')
  })()

  const baseSalary = (() => {
    const p = positions.find(pp => (pp as any).id === ((employee as any).positionId || (employee as any).position_id))
    return Number((p as any)?.baseSalary ?? (p as any)?.base_salary ?? 0)
  })()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Avatar className="h-16 w-16">
          <AvatarFallback className="bg-primary text-primary-foreground text-lg">
            {getInitials(employee.name)}
          </AvatarFallback>
        </Avatar>
        <div>
          <h3 className="text-xl font-semibold">{employee.name}</h3>
          <p className="text-muted-foreground">{positionName}</p>
          <Badge variant={statusMap[employee.status].variant} className="mt-1">
            {statusMap[employee.status].label}
          </Badge>
        </div>
      </div>

      <Separator />

      {/* Contact Info */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-muted-foreground">Contato</h4>
        <div className="grid gap-3">
          <div className="flex items-center gap-3">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{employee.email}</span>
          </div>
          <div className="flex items-center gap-3">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{employee.phone}</span>
          </div>
          <div className="flex items-center gap-3">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">
              {employee.address.street}, {employee.address.number} - {employee.address.city}/{employee.address.state}
            </span>
          </div>
        </div>
      </div>

      <Separator />

      {/* Professional Info */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-muted-foreground">Informacoes Profissionais</h4>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="flex items-center gap-3">
            <Store className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Loja</p>
              <p className="text-sm font-medium">{storeName}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Briefcase className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Cargo</p>
              <p className="text-sm font-medium">{positionName}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Building className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Departamento</p>
              <p className="text-sm font-medium">{employee.department || 'N/A'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Salario Base</p>
              <p className="text-sm font-medium">{formatCurrency(baseSalary)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Data de Admissao</p>
              <p className="text-sm font-medium">{formatDate(employee.hireDate)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Data de Nascimento</p>
              <p className="text-sm font-medium">{formatDate(employee.birthDate)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Termination Info (if applicable) */}
      {employee.status === 'terminated' && employee.terminationDate && (
        <>
          <Separator />
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-destructive flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Informacoes de Desligamento
            </h4>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <p className="text-xs text-muted-foreground">Data de Desligamento</p>
                <p className="text-sm font-medium">{formatDate(employee.terminationDate)}</p>
              </div>
              {employee.terminationReason && (
                <div>
                  <p className="text-xs text-muted-foreground">Motivo</p>
                  <p className="text-sm font-medium">{employee.terminationReason}</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Documents */}
      <Separator />
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-muted-foreground">Documentos</h4>
        <div>
          <p className="text-xs text-muted-foreground">CPF</p>
          <p className="text-sm font-medium">{employee.cpf}</p>
        </div>
      </div>
    </div>
  )
}
