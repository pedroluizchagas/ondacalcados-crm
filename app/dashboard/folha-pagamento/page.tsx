'use client'

import React from "react"

import { useState, useMemo, useRef, useEffect } from 'react'
import { usePayroll, useEmployees, useStores, usePositions, updatePayrollItem as apiUpdatePayrollItem, createPayrollItem as apiCreatePayrollItem } from '@/hooks/use-data'
import type { PayrollItem } from '@/types'
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
  DialogFooter,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { InputGroup, InputGroupAddon, InputGroupText, InputGroupInput } from '@/components/ui/input-group'
import { Separator } from '@/components/ui/separator'
import { Search, DollarSign, Clock, CheckCircle, MoreHorizontal, Eye, CreditCard, Pencil, Plus, Loader2, Upload, FileText, Printer, Trash2, ArrowUpCircle, ArrowDownCircle } from 'lucide-react'
import type { PayrollEvent } from '@/types'
import { useToast } from '@/hooks/use-toast'

interface ExtendedPayrollItem extends PayrollItem {
  settlementDate?: string
  settlementLocation?: string
  customEvents?: PayrollEvent[]
}

const statusMap: Record<PayrollItem['status'], { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: 'Pendente', variant: 'outline' },
  paid: { label: 'Pago', variant: 'default' },
}

const paymentTypeMap: Record<PayrollItem['paymentType'], string> = {
  contabil: 'Contabil',
  nao_contabil: 'Nao Contabil',
}

const settlementLocations = [
  'Banco',
  'Dinheiro em Maos',
  'Pix',
  'Transferencia',
  'Cheque',
]

const months = [
  { value: 1, label: 'Janeiro' },
  { value: 2, label: 'Fevereiro' },
  { value: 3, label: 'Marco' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Maio' },
  { value: 6, label: 'Junho' },
  { value: 7, label: 'Julho' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Setembro' },
  { value: 10, label: 'Outubro' },
  { value: 11, label: 'Novembro' },
  { value: 12, label: 'Dezembro' },
]

export default function FolhaPagamentoPage() {
  const { payrolls: serverPayrolls, isLoading: loadingPayrolls, mutate: mutatePayrolls } = usePayroll()
  const { employees } = useEmployees()
  const { stores } = useStores()
  const { positions } = usePositions()
  const [payrolls, setPayrolls] = useState<ExtendedPayrollItem[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [storeFilter, setStoreFilter] = useState<string>('all')
  const [paymentTypeFilter, setPaymentTypeFilter] = useState<string>('all')
  const [monthFilter, setMonthFilter] = useState<string>('all')
  const [yearFilter, setYearFilter] = useState<string>(new Date().getFullYear().toString())
  const [selectedPayroll, setSelectedPayroll] = useState<ExtendedPayrollItem | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isNewOpen, setIsNewOpen] = useState(false)
  const [isSettlementOpen, setIsSettlementOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isEmployeeOpen, setIsEmployeeOpen] = useState(false)
  const fileSheetInputRef = useRef<HTMLInputElement>(null)
  const [isImportingSheet, setIsImportingSheet] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (!loadingPayrolls && Array.isArray(serverPayrolls)) {
      const next = serverPayrolls as ExtendedPayrollItem[]
      if (payrolls !== next) {
        setPayrolls(next)
      }
    }
  }, [loadingPayrolls, serverPayrolls, payrolls])

  const getStoreName = (storeId: string) => {
    const s = stores.find(st => st.id === storeId || (st as any).id === storeId)
    return s?.name || 'N/A'
  }

  const handleSheetImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setIsImportingSheet(true)
    try {
      const form = new FormData()
      form.append('file', file)
      if (monthFilter !== 'all') form.append('month', monthFilter)
      if (yearFilter !== 'all') form.append('year', yearFilter)
      const res = await fetch('/api/payroll/import-sheet', { method: 'POST', body: form })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        const message = err?.error ? (err?.details ? `${err.error}: ${err.details}` : err.error) : 'Falha ao importar planilha'
        throw new Error(message)
      }
      const data = await res.json()
      if (data?.month && data?.year) {
        setMonthFilter(String(data.month))
        setYearFilter(String(data.year))
      }
      await mutatePayrolls()
      toast({
        title: 'Importação concluída',
        description: `Atualizados: ${data.updated}, Criados: ${data.created}, Total: ${data.total} (${data.month}/${data.year}).${data.unmatchedCount ? ` Não vinculados: ${data.unmatchedCount}${Array.isArray(data.unmatched) ? ` (ex.: ${data.unmatched.map((u:any)=>u?.name||u?.cpf).filter(Boolean).slice(0,3).join(', ')})` : ''}` : ''}${data.divergencesCount ? ` | Divergências de líquido: ${data.divergencesCount}${Array.isArray(data.divergences) ? ` (ex.: ${data.divergences.map((d:any)=>d?.name).filter(Boolean).slice(0,3).join(', ')})` : ''}` : ''}`,
      })
    } catch (e: any) {
      toast({
        title: 'Erro ao importar planilha',
        description: e?.message || 'Verifique o arquivo e tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setIsImportingSheet(false)
      if (fileSheetInputRef.current) fileSheetInputRef.current.value = ''
    }
  }

  const getPositionName = (positionId: string) => {
    const p = positions.find(pp => pp.id === positionId || (pp as any).id === positionId)
    return p?.name || 'N/A'
  }

  const getBaseSalary = (positionId: string) => {
    const p = positions.find(pp => pp.id === positionId || (pp as any).id === positionId)
    return Number((p as any)?.baseSalary || (p as any)?.base_salary || 0)
  }

  // Settlement form state
  const [settlementForm, setSettlementForm] = useState({
    date: new Date().toISOString().split('T')[0],
    location: '',
  })

  // Form state for editing
  const [editForm, setEditForm] = useState({
    commissions: '',
    employeePurchases: '',
    vouchers: '',
    advances: '',
    inss: '',
    fgts: '',
    paymentType: 'contabil' as 'contabil' | 'nao_contabil',
  })

  // Custom events state
  const [customEvents, setCustomEvents] = useState<PayrollEvent[]>([])
  const [newEventForm, setNewEventForm] = useState({
    description: '',
    type: 'provento' as 'provento' | 'desconto',
    value: '',
  })

  // Form state for new payroll
  const [newForm, setNewForm] = useState({
    employeeId: '',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    commissions: '',
    employeePurchases: '',
    vouchers: '',
    advances: '',
    inss: '',
    fgts: '',
    paymentType: 'contabil' as 'contabil' | 'nao_contabil',
  })

  // Custom events for new payroll
  const [newPayrollEvents, setNewPayrollEvents] = useState<PayrollEvent[]>([])
  const [newPayrollEventForm, setNewPayrollEventForm] = useState({
    description: '',
    type: 'provento' as 'provento' | 'desconto',
    value: '',
  })

  const stats = useMemo(() => {
    const pending = payrolls.filter((p) => p.status === 'pending')
    const paid = payrolls.filter((p) => p.status === 'paid')
    const totalPending = pending.reduce((sum, p) => sum + p.netSalary, 0)
    const totalPaid = paid.reduce((sum, p) => sum + p.netSalary, 0)
    return {
      pendingCount: pending.length,
      paidCount: paid.length,
      totalPending,
      totalPaid,
    }
  }, [payrolls])

  const filteredPayrolls = useMemo(() => {
    return payrolls.filter((payroll) => {
      const matchesSearch = payroll.employeeName
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
      const matchesStatus = statusFilter === 'all' || payroll.status === statusFilter
      const matchesStore = storeFilter === 'all' || payroll.storeId === storeFilter
      const matchesPaymentType = paymentTypeFilter === 'all' || payroll.paymentType === paymentTypeFilter
      const matchesMonth = monthFilter === 'all' || payroll.month === parseInt(monthFilter, 10)
      const matchesYear = yearFilter === 'all' || payroll.year === parseInt(yearFilter, 10)
      return matchesSearch && matchesStatus && matchesStore && matchesPaymentType && matchesMonth && matchesYear
    })
  }, [payrolls, searchTerm, statusFilter, storeFilter, paymentTypeFilter, monthFilter, yearFilter])

  // Get unique years from payrolls
  const availableYears = useMemo(() => {
    const years = [...new Set(payrolls.map(p => p.year))].sort((a, b) => b - a)
    return years
  }, [payrolls])

  const yearOptions = useMemo(() => {
    const set = new Set<number>(availableYears)
    if (yearFilter !== 'all') {
      const yf = parseInt(yearFilter, 10)
      if (!Number.isNaN(yf)) set.add(yf)
    }
    return Array.from(set).sort((a, b) => b - a)
  }, [availableYears, yearFilter])

  const activeEmployees = useMemo(() => {
    return (employees || []).filter(e => e.status === 'active')
  }, [employees])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  // Calculo: (Comissao + Proventos) - (Compras + Vales + Adiantamento + INSS + Descontos). FGTS e mostrado mas nao subtraido
  const calculatePayroll = (baseSalary: number, form: typeof editForm, events: PayrollEvent[] = []) => {
    const commissions = parseFloat(form.commissions) || 0
    const employeePurchases = parseFloat(form.employeePurchases) || 0
    const vouchers = parseFloat(form.vouchers) || 0
    const advances = parseFloat(form.advances) || 0
    const inss = parseFloat(form.inss) || 0
    const fgts = parseFloat(form.fgts) || 0

    // Calculate custom events
    const eventProventos = events.filter(e => e.type === 'provento').reduce((sum, e) => sum + e.value, 0)
    const eventDescontos = events.filter(e => e.type === 'desconto').reduce((sum, e) => sum + e.value, 0)

    const grossSalary = commissions + eventProventos
    const totalDeductions = employeePurchases + vouchers + advances + inss + eventDescontos
    const netSalary = grossSalary - totalDeductions

    return {
      grossSalary,
      totalDeductions,
      netSalary,
      commissions,
      employeePurchases,
      vouchers,
      advances,
      inss,
      fgts,
    }
  }

  // Add custom event
  const handleAddEvent = () => {
    if (!newEventForm.description || !newEventForm.value) return
    
    const parsedValue = parseFloat(newEventForm.value.replace(',', '.')) || 0
    if (parsedValue <= 0) return
    
    const newEvent: PayrollEvent = {
      id: `event-${Date.now()}`,
      description: newEventForm.description,
      type: newEventForm.type,
      value: parsedValue,
    }
    
    setCustomEvents([...customEvents, newEvent])
    setNewEventForm({ description: '', type: 'provento', value: '' })
  }

  // Remove custom event
  const handleRemoveEvent = (eventId: string) => {
    setCustomEvents(customEvents.filter(e => e.id !== eventId))
  }

  // Add custom event for new payroll
  const handleAddNewPayrollEvent = () => {
    if (!newPayrollEventForm.description || !newPayrollEventForm.value) return
    
    const parsedValue = parseFloat(newPayrollEventForm.value.replace(',', '.')) || 0
    if (parsedValue <= 0) return
    
    const newEvent: PayrollEvent = {
      id: `new-event-${Date.now()}`,
      description: newPayrollEventForm.description,
      type: newPayrollEventForm.type,
      value: parsedValue,
    }
    
    setNewPayrollEvents([...newPayrollEvents, newEvent])
    setNewPayrollEventForm({ description: '', type: 'provento', value: '' })
  }

  // Remove custom event from new payroll
  const handleRemoveNewPayrollEvent = (eventId: string) => {
    setNewPayrollEvents(newPayrollEvents.filter(e => e.id !== eventId))
  }

  // Print report
  const handlePrintReport = () => {
    const w = window.open('', '_blank')
    if (!w) return

    const filteredData = filteredPayrolls.map(p => ({
      name: p.employeeName,
      store: getStoreName(p.storeId),
      gross: formatCurrency(p.grossSalary),
      deductions: formatCurrency(p.totalDeductions),
      net: formatCurrency(p.netSalary),
      status: statusMap[p.status].label,
    }))

    const monthLabel =
      monthFilter === 'all'
        ? 'Todos'
        : months.find(m => m.value === parseInt(monthFilter, 10))?.label || monthFilter
    const yearLabel = yearFilter === 'all' ? 'Todos' : yearFilter
    const storeLabel = storeFilter === 'all' ? 'Todas' : getStoreName(storeFilter)
    const statusLabel =
      statusFilter === 'all'
        ? 'Todos'
        : statusMap[statusFilter as keyof typeof statusMap]?.label || statusFilter
    const typeLabel =
      paymentTypeFilter === 'all'
        ? 'Todos'
        : paymentTypeMap[paymentTypeFilter as keyof typeof paymentTypeMap] || paymentTypeFilter

    w.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Relatorio de Folha de Pagamento</title>
        <style>
          * { box-sizing: border-box; }
          body { font-family: Arial, sans-serif; padding: 24px; color: #111827; }
          h1 { color: #1e40af; font-size: 22px; margin: 0 0 8px; }
          .info { font-size: 12px; color: #4b5563; margin-bottom: 16px; }
          .info p { margin: 2px 0; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; }
          th, td { border: 1px solid #e5e7eb; padding: 8px; text-align: left; font-size: 12px; }
          th { background-color: #1e40af; color: #ffffff; }
          tr:nth-child(even) { background-color: #f9fafb; }
          .totals { font-weight: bold; margin-top: 16px; font-size: 13px; }
          .footer { margin-top: 24px; font-size: 11px; color: #6b7280; }
          @media print {
            body { padding: 0; }
            .footer { position: fixed; bottom: 8px; left: 24px; right: 24px; }
          }
        </style>
      </head>
      <body>
        <h1>Onda Calcados - Relatorio de Folha de Pagamento</h1>
        <div class="info">
          <p>Data: ${new Date().toLocaleDateString('pt-BR')}</p>
          <p>Filtros: Loja: ${storeLabel} | Status: ${statusLabel} | Mes: ${monthLabel} | Ano: ${yearLabel} | Tipo: ${typeLabel}</p>
        </div>
        <table>
          <thead>
            <tr>
              <th>Funcionario</th>
              <th>Loja</th>
              <th>Salario Bruto</th>
              <th>Descontos</th>
              <th>Liquido</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${filteredData.map(p => `
              <tr>
                <td>${p.name}</td>
                <td>${p.store}</td>
                <td>${p.gross}</td>
                <td>${p.deductions}</td>
                <td>${p.net}</td>
                <td>${p.status}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="totals">
          <p>Total Pendente: ${formatCurrency(stats.totalPending)}</p>
          <p>Total Pago: ${formatCurrency(stats.totalPaid)}</p>
        </div>
        <div class="footer">
          Relatorio gerado pelo sistema CRM - Onda Calcados
        </div>
      </body>
      </html>
    `)
    w.document.close()
    w.focus()
    w.print()
  }

  const handlePrintPayslip = () => {
    if (!selectedPayroll) return
    const w = window.open('', '_blank')
    if (!w) return
    const monthLabel = getMonthName(selectedPayroll.month)
    const paymentTypeLabel = paymentTypeMap[selectedPayroll.paymentType]
    const proventos = [
      ...(selectedPayroll.commissions > 0 ? [{ label: 'Comissoes', value: selectedPayroll.commissions }] : []),
      ...((selectedPayroll.customEvents || []).filter(e => e.type === 'provento').map(e => ({ label: e.description, value: e.value }))),
    ]
    const descontos = [
      ...(selectedPayroll.employeePurchases > 0 ? [{ label: 'Compras', value: selectedPayroll.employeePurchases }] : []),
      ...(selectedPayroll.vouchers > 0 ? [{ label: 'Imposto de Renda', value: selectedPayroll.vouchers }] : []),
      ...(selectedPayroll.advances > 0 ? [{ label: 'Adiantamento', value: selectedPayroll.advances }] : []),
      ...(selectedPayroll.inss > 0 ? [{ label: 'INSS', value: selectedPayroll.inss }] : []),
      ...((selectedPayroll.customEvents || []).filter(e => e.type === 'desconto').map(e => ({ label: e.description, value: e.value }))),
    ]
    w.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Holerite - ${selectedPayroll.employeeName}</title>
        <style>
          * { box-sizing: border-box; }
          body { font-family: Arial, sans-serif; padding: 24px; color: #111827; }
          h1 { font-size: 20px; margin: 0; }
          .header { display: grid; grid-template-columns: 1fr auto; gap: 8px; border-bottom: 1px solid #e5e7eb; padding-bottom: 10px; }
          .sub { color: #4b5563; font-size: 12px; }
          .badge { display: inline-block; padding: 4px 8px; border: 1px solid #e5e7eb; border-radius: 6px; font-size: 11px; margin-left: 6px; }
          .summary { display: flex; align-items: center; justify-content: space-between; background: #eef2ff; border: 1px solid #c7d2fe; border-radius: 8px; padding: 10px 12px; margin: 12px 0; }
          .summary-title { font-size: 12px; color: #374151; }
          .summary-value { font-size: 18px; font-weight: 700; color: #1e40af; }
          .info-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
          .info-item { font-size: 12px; }
          .info-label { color: #6b7280; font-size: 11px; }
          .card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; }
          .card-title { font-weight: 600; font-size: 13px; margin-bottom: 6px; }
          .row { display: flex; justify-content: space-between; font-size: 12px; margin: 2px 0; }
          .total { display: flex; justify-content: space-between; font-weight: 600; border-top: 1px solid #e5e7eb; padding-top: 6px; margin-top: 6px; font-size: 12px; }
          .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 10px; }
          .fgts { background: #f3f4f6; border-radius: 8px; padding: 10px 12px; margin-top: 10px; }
          .footer-total { display: flex; justify-content: space-between; align-items: center; font-size: 16px; font-weight: 700; border-top: 1px solid #e5e7eb; padding-top: 12px; margin-top: 12px; }
          .paid { background: #ecfdf5; border: 1px solid #d1fae5; border-radius: 8px; padding: 8px 10px; margin-top: 10px; font-size: 12px; color: #065f46; }
          @media print {
            body { padding: 0 12mm; }
            .summary { background: #ffffff; border-color: #e5e7eb; }
            .badge { border-color: #e5e7eb; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1>Onda Calcados</h1>
            <div class="sub">Holerite - ${monthLabel}/${selectedPayroll.year}</div>
          </div>
          <div>
            <span class="badge">${paymentTypeLabel}</span>
            <span class="badge">${selectedPayroll.status === 'paid' ? 'Pago' : 'Pendente'}</span>
          </div>
        </div>
        <div class="summary">
          <div>
            <div class="summary-title">Salario Liquido</div>
            <div class="sub">${selectedPayroll.employeeName}</div>
          </div>
          <div class="summary-value">${formatCurrency(selectedPayroll.netSalary)}</div>
        </div>
        <div class="info-grid">
          <div class="info-item"><div class="info-label">Funcionario</div><div>${selectedPayroll.employeeName}</div></div>
          <div class="info-item"><div class="info-label">Loja</div><div>${getStoreName(selectedPayroll.storeId)}</div></div>
          <div class="info-item"><div class="info-label">Cargo</div><div>${getPositionName(selectedPayroll.positionId)}</div></div>
          <div class="info-item"><div class="info-label">Classificacao</div><div>${paymentTypeLabel}</div></div>
        </div>
        <div class="grid-2">
          <div class="card">
            <div class="card-title">Proventos</div>
            ${proventos.map(p => `<div class="row"><span>${p.label}</span><span>${formatCurrency(p.value)}</span></div>`).join('')}
            <div class="total"><span>Total Proventos</span><span>${formatCurrency(selectedPayroll.grossSalary)}</span></div>
          </div>
          <div class="card">
            <div class="card-title">Descontos</div>
            ${descontos.map(d => `<div class="row"><span>${d.label}</span><span>-${formatCurrency(d.value)}</span></div>`).join('')}
            <div class="total"><span>Total Descontos</span><span>-${formatCurrency(selectedPayroll.totalDeductions)}</span></div>
          </div>
        </div>
        <div class="fgts">
          <div class="sub">FGTS (informativo)</div>
          <div class="row"><span>FGTS (8%) - Base de Calculo</span><span>${formatCurrency(selectedPayroll.fgts)}</span></div>
        </div>
        <div class="footer-total">
          <span>Salario Liquido</span>
          <span>${formatCurrency(selectedPayroll.netSalary)}</span>
        </div>
        ${selectedPayroll.status === 'paid' && selectedPayroll.settlementDate ? `
          <div class="paid">
            Pagamento Quitado em ${new Date(selectedPayroll.settlementDate).toLocaleDateString('pt-BR')}${selectedPayroll.settlementLocation ? ` via ${selectedPayroll.settlementLocation}` : ''}
          </div>
        ` : ''}
        <script>
          window.print();
        </script>
      </body>
      </html>
    `)
    w.document.close()
    w.focus()
  }

  const openSettlement = (payroll: ExtendedPayrollItem) => {
    setSelectedPayroll(payroll)
    setSettlementForm({
      date: new Date().toISOString().split('T')[0],
      location: '',
    })
    setIsSettlementOpen(true)
  }

  const handleMarkAsPaid = async () => {
    if (!selectedPayroll || !settlementForm.location) return
    setIsSubmitting(true)
    await apiUpdatePayrollItem(String(selectedPayroll.id), {
      status: 'paid',
      paymentDate: settlementForm.date,
      settlementDate: settlementForm.date,
      settlementLocation: settlementForm.location,
    })
    await mutatePayrolls()
    setIsSubmitting(false)
    setIsSettlementOpen(false)
    toast({
      title: 'Pagamento registrado',
      description: `Pagamento de ${selectedPayroll.employeeName} foi quitado via ${settlementForm.location}.`,
    })
  }

  const openEdit = (payroll: ExtendedPayrollItem) => {
    setSelectedPayroll(payroll)
    setEditForm({
      commissions: payroll.commissions.toString(),
      employeePurchases: payroll.employeePurchases.toString(),
      vouchers: payroll.vouchers.toString(),
      advances: payroll.advances.toString(),
      inss: payroll.inss.toString(),
      fgts: payroll.fgts.toString(),
      paymentType: payroll.paymentType,
    })
    setCustomEvents(payroll.customEvents || [])
    setIsEditOpen(true)
  }

const handleSaveEdit = async () => {
    if (!selectedPayroll) return
    setIsSubmitting(true)
    await new Promise(resolve => setTimeout(resolve, 500))
    
    const calculations = calculatePayroll(selectedPayroll.baseSalary, editForm, customEvents)
    
    await apiUpdatePayrollItem(String(selectedPayroll.id), {
      ...calculations,
      paymentType: editForm.paymentType,
      customEvents: customEvents.length > 0 ? [...customEvents] : undefined,
    })
    await mutatePayrolls()
    
    setIsSubmitting(false)
    setIsEditOpen(false)
    setCustomEvents([])
    setNewEventForm({ description: '', type: 'provento', value: '' })
    toast({
      title: 'Folha atualizada',
      description: `Folha de ${selectedPayroll.employeeName} foi atualizada com sucesso.`,
    })
  }

const handleCreatePayroll = async () => {
    if (!newForm.employeeId) return
    setIsSubmitting(true)
    await new Promise(resolve => setTimeout(resolve, 500))
    
    const employee = activeEmployees.find(e => e.id === newForm.employeeId)
    if (!employee) return
    
    const baseSalary = 0
    const calculations = calculatePayroll(baseSalary, newForm, newPayrollEvents)
    
    const newPayroll: ExtendedPayrollItem = {
      id: (payrolls.length + 1).toString(),
      employeeId: employee.id,
      employeeName: (employee as any).name,
      month: newForm.month,
      year: newForm.year,
      storeId: (employee as any).storeId || (employee as any).store_id,
      positionId: (employee as any).positionId || (employee as any).position_id,
      baseSalary,
      ...calculations,
      paymentType: newForm.paymentType,
      status: 'pending',
      customEvents: newPayrollEvents.length > 0 ? [...newPayrollEvents] : undefined,
    }
    
    await apiCreatePayrollItem(newPayroll)
    await mutatePayrolls()
    setIsSubmitting(false)
    setIsNewOpen(false)
    setNewForm({
      employeeId: '',
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
      commissions: '',
      employeePurchases: '',
      vouchers: '',
      advances: '',
      inss: '',
      fgts: '',
      paymentType: 'contabil',
    })
    setNewPayrollEvents([])
    setNewPayrollEventForm({ description: '', type: 'provento', value: '' })
    toast({
      title: 'Folha criada',
      description: `Folha de ${employee.name} foi criada com sucesso.`,
    })
  }

  const getMonthName = (month: number) => {
    return months.find(m => m.value === month)?.label || ''
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Folha de Pagamento</h1>
          <p className="text-muted-foreground">Gerencie proventos, descontos e impostos</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            ref={fileSheetInputRef}
            onChange={handleSheetImport}
            className="hidden"
          />
          <Button variant="outline" onClick={() => fileSheetInputRef.current?.click()} disabled={isImportingSheet}>
            {isImportingSheet ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            Importar XLSX/CSV
          </Button>
          <Button variant="outline" onClick={handlePrintReport}>
            <Printer className="mr-2 h-4 w-4" />
            Imprimir Relatorio
          </Button>
          <Button onClick={() => setIsNewOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Folha
          </Button>
        </div>
      </div>

      <Card className="bg-muted/50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div className="text-sm">
              <p className="font-medium">Importacao via XLSX/XLS/CSV:</p>
              <p className="text-muted-foreground">A planilha deve conter pelo menos a coluna Nome. Colunas como Base, Comissoes, Compras, IRRF, INSS, FGTS, Bruto, Descontos e Liquido sao aceitas. Rubricas adicionais sao aceitas como colunas e classificadas automaticamente.</p>
              <p className="text-muted-foreground">CPF (se existir) e opcional; o vinculo e feito por Nome normalizado.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingCount}</div>
            <p className="text-xs text-muted-foreground">Pagamentos a realizar</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pagos</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.paidCount}</div>
            <p className="text-xs text-muted-foreground">Pagamentos realizados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pendente</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalPending)}</div>
            <p className="text-xs text-muted-foreground">Valor a pagar</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pago</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalPaid)}</div>
            <p className="text-xs text-muted-foreground">Valor ja pago</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por funcionario..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={monthFilter} onValueChange={(v) => { if (v !== monthFilter) setMonthFilter(v) }}>
              <SelectTrigger>
                <SelectValue placeholder="Mes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Meses</SelectItem>
                <SelectItem value="1">Janeiro</SelectItem>
                <SelectItem value="2">Fevereiro</SelectItem>
                <SelectItem value="3">Marco</SelectItem>
                <SelectItem value="4">Abril</SelectItem>
                <SelectItem value="5">Maio</SelectItem>
                <SelectItem value="6">Junho</SelectItem>
                <SelectItem value="7">Julho</SelectItem>
                <SelectItem value="8">Agosto</SelectItem>
                <SelectItem value="9">Setembro</SelectItem>
                <SelectItem value="10">Outubro</SelectItem>
                <SelectItem value="11">Novembro</SelectItem>
                <SelectItem value="12">Dezembro</SelectItem>
              </SelectContent>
            </Select>
            <Select value={yearFilter} onValueChange={(v) => { if (v !== yearFilter) setYearFilter(v) }}>
              <SelectTrigger>
                <SelectValue placeholder="Ano" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Anos</SelectItem>
                {yearOptions.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => { if (v !== statusFilter) setStatusFilter(v) }}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="paid">Pago</SelectItem>
              </SelectContent>
            </Select>
            <Select value={storeFilter} onValueChange={(v) => { if (v !== storeFilter) setStoreFilter(v) }}>
              <SelectTrigger>
                <SelectValue placeholder="Loja" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Lojas</SelectItem>
                {stores.map((store) => (
                  <SelectItem key={store.id} value={String(store.id)}>
                    {store.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={paymentTypeFilter} onValueChange={(v) => { if (v !== paymentTypeFilter) setPaymentTypeFilter(v) }}>
              <SelectTrigger>
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Tipos</SelectItem>
                <SelectItem value="contabil">Contabil</SelectItem>
                <SelectItem value="nao_contabil">Nao Contabil</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Payroll Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Funcionario</TableHead>
                <TableHead>Competencia</TableHead>
                <TableHead className="hidden md:table-cell">Loja</TableHead>
                <TableHead className="hidden lg:table-cell">Salario Bruto</TableHead>
                <TableHead className="hidden lg:table-cell">Descontos</TableHead>
                <TableHead>Liquido</TableHead>
                <TableHead className="hidden sm:table-cell">Tipo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[70px]">Acoes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPayrolls.length > 0 ? (
                filteredPayrolls.map((payroll) => (
                  <TableRow key={payroll.id}>
                    <TableCell className="font-medium">{payroll.employeeName}</TableCell>
                    <TableCell>
                      {getMonthName(payroll.month)}/{payroll.year}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge variant="outline">{getStoreName(String(payroll.storeId))}</Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {formatCurrency(payroll.grossSalary)}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-destructive">
                      -{formatCurrency(payroll.totalDeductions)}
                    </TableCell>
                    <TableCell className="font-semibold text-primary">
                      {formatCurrency(payroll.netSalary)}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Badge variant="secondary">{paymentTypeMap[payroll.paymentType]}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusMap[payroll.status].variant}>
                        {statusMap[payroll.status].label}
                      </Badge>
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
                              setSelectedPayroll(payroll)
                              setIsDetailsOpen(true)
                            }}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            Ver Holerite
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEdit(payroll)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          {payroll.status === 'pending' && (
                            <DropdownMenuItem onClick={() => openSettlement(payroll)}>
                              <CreditCard className="mr-2 h-4 w-4" />
                              Registrar Quitacao
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={9} className="h-24 text-center">
                    Nenhum registro encontrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Settlement Dialog */}
      <Dialog open={isSettlementOpen} onOpenChange={setIsSettlementOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Quitacao</DialogTitle>
            <DialogDescription>
              Informe os dados do pagamento de {selectedPayroll?.employeeName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="settlementDate">Data da Quitacao</Label>
              <Input
                id="settlementDate"
                type="date"
                value={settlementForm.date}
                onChange={(e) => setSettlementForm({ ...settlementForm, date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="settlementLocation">Local da Quitacao</Label>
              <Select
                value={settlementForm.location}
                onValueChange={(value) => {
                  if (value !== settlementForm.location) {
                    setSettlementForm({ ...settlementForm, location: value })
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o local" />
                </SelectTrigger>
                <SelectContent>
                  {settlementLocations.map((location) => (
                    <SelectItem key={location} value={location}>
                      {location}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedPayroll && (
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">Valor a ser pago:</p>
                <p className="text-2xl font-bold text-primary">{formatCurrency(selectedPayroll.netSalary)}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSettlementOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleMarkAsPaid} disabled={!settlementForm.location}>
              Confirmar Pagamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payroll Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="w-full sm:max-w-3xl md:max-w-4xl max-h-[85vh] overflow-y-auto overflow-x-hidden">
          <DialogHeader>
            <DialogTitle>Holerite</DialogTitle>
            <DialogDescription>Detalhes do pagamento</DialogDescription>
          </DialogHeader>
          {selectedPayroll && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-2 border-b pb-4">
                <div>
                  <h3 className="font-semibold text-lg">Onda Calcados</h3>
                  <p className="text-sm text-muted-foreground">
                    Holerite - {getMonthName(selectedPayroll.month)}/{selectedPayroll.year}
                  </p>
                </div>
                <div className="flex sm:justify-end items-center gap-2">
                  <Badge variant={statusMap[selectedPayroll.status].variant}>
                    {statusMap[selectedPayroll.status].label}
                  </Badge>
                  <Badge variant="secondary">{paymentTypeMap[selectedPayroll.paymentType]}</Badge>
                  <Button variant="outline" onClick={handlePrintPayslip}>
                    <Printer className="mr-2 h-4 w-4" />
                    Imprimir Holerite
                  </Button>
                </div>
              </div>
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Salario Liquido</p>
                  <p className="text-xs text-muted-foreground">{getMonthName(selectedPayroll.month)} / {selectedPayroll.year}</p>
                </div>
                <p className="text-2xl font-bold text-primary">{formatCurrency(selectedPayroll.netSalary)}</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Funcionario</p>
                  <p className="font-medium">{selectedPayroll.employeeName}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Loja</p>
                  <p className="font-medium">{getStoreName(selectedPayroll.storeId)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Cargo</p>
                  <p className="font-medium">{getPositionName(selectedPayroll.positionId)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Classificacao</p>
                  <Badge variant="secondary">{paymentTypeMap[selectedPayroll.paymentType]}</Badge>
                </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="rounded-lg border p-4 space-y-2">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <ArrowUpCircle className="h-4 w-4 text-green-600" />
                    <span className="text-green-600">Proventos</span>
                  </h4>
                  {selectedPayroll.commissions > 0 && (
                    <div className="flex justify-between text-sm">
                      <span>Comissoes</span>
                      <span>{formatCurrency(selectedPayroll.commissions)}</span>
                    </div>
                  )}
                  {selectedPayroll.customEvents?.filter(e => e.type === 'provento').map((event) => (
                    <div key={event.id} className="flex justify-between text-sm">
                      <span>{event.description}</span>
                      <span>{formatCurrency(event.value)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between font-medium border-t pt-2">
                    <span>Total Proventos</span>
                    <span className="text-green-600">{formatCurrency(selectedPayroll.grossSalary)}</span>
                  </div>
                </div>
                <div className="rounded-lg border p-4 space-y-2">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <ArrowDownCircle className="h-4 w-4 text-destructive" />
                    <span className="text-destructive">Descontos</span>
                  </h4>
                  {selectedPayroll.employeePurchases > 0 && (
                    <div className="flex justify-between text-sm">
                      <span>Compras</span>
                      <span>-{formatCurrency(selectedPayroll.employeePurchases)}</span>
                    </div>
                  )}
                  {selectedPayroll.vouchers > 0 && (
                    <div className="flex justify-between text-sm">
                      <span>Imposto de Renda</span>
                      <span>-{formatCurrency(selectedPayroll.vouchers)}</span>
                    </div>
                  )}
                  {selectedPayroll.advances > 0 && (
                    <div className="flex justify-between text-sm">
                      <span>Adiantamento</span>
                      <span>-{formatCurrency(selectedPayroll.advances)}</span>
                    </div>
                  )}
                  {selectedPayroll.inss > 0 && (
                    <div className="flex justify-between text-sm">
                      <span>INSS</span>
                      <span>-{formatCurrency(selectedPayroll.inss)}</span>
                    </div>
                  )}
                  {selectedPayroll.customEvents?.filter(e => e.type === 'desconto').map((event) => (
                    <div key={event.id} className="flex justify-between text-sm">
                      <span>{event.description}</span>
                      <span>-{formatCurrency(event.value)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between font-medium border-t pt-2">
                    <span>Total Descontos</span>
                    <span className="text-destructive">-{formatCurrency(selectedPayroll.totalDeductions)}</span>
                  </div>
                </div>
              </div>
              <div className="rounded-lg bg-muted/40 p-4 space-y-2">
                <p className="text-sm text-muted-foreground">FGTS (informativo)</p>
                <div className="flex justify-between text-sm">
                  <span>FGTS (8%) - Base de Calculo</span>
                  <span>{formatCurrency(selectedPayroll.fgts)}</span>
                </div>
              </div>
              <div className="flex justify-between items-center text-lg font-bold border-t pt-4">
                <span>Salario Liquido</span>
                <span className="text-primary">{formatCurrency(selectedPayroll.netSalary)}</span>
              </div>
              {selectedPayroll.status === 'paid' && selectedPayroll.settlementDate && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-sm font-medium text-green-800">Pagamento Quitado</p>
                  <p className="text-sm text-green-600">
                    Data: {new Date(selectedPayroll.settlementDate).toLocaleDateString('pt-BR')}
                  </p>
                  {selectedPayroll.settlementLocation && (
                    <p className="text-sm text-green-600">
                      Local: {selectedPayroll.settlementLocation}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Payroll Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="w-full sm:max-w-2xl lg:max-w-3xl max-h-[85vh] overflow-y-auto overflow-x-hidden">
          <DialogHeader>
            <DialogTitle>Editar Folha de Pagamento</DialogTitle>
            <DialogDescription>
              Atualize os valores de {selectedPayroll?.employeeName}
            </DialogDescription>
          </DialogHeader>
          {selectedPayroll && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="rounded-lg border p-4 space-y-3">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <ArrowUpCircle className="h-4 w-4 text-green-600" />
                    <span className="text-green-600">Proventos</span>
                  </h4>
                  <div className="space-y-2">
                    <Label htmlFor="edit-commissions">Comissoes (R$)</Label>
                    <Input
                      id="edit-commissions"
                      type="number"
                      step="0.01"
                      value={editForm.commissions}
                      onChange={(e) => setEditForm({ ...editForm, commissions: e.target.value })}
                    />
                  </div>
                </div>

                <div className="rounded-lg border p-4 space-y-3">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <ArrowDownCircle className="h-4 w-4 text-destructive" />
                    <span className="text-destructive">Descontos</span>
                  </h4>
                  <div className="space-y-2">
                    <Label htmlFor="edit-purchases">Compras (R$)</Label>
                    <Input
                      id="edit-purchases"
                      type="number"
                      step="0.01"
                      value={editForm.employeePurchases}
                      onChange={(e) => setEditForm({ ...editForm, employeePurchases: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-vouchers">Imposto de Renda (R$)</Label>
                    <Input
                      id="edit-vouchers"
                      type="number"
                      step="0.01"
                      value={editForm.vouchers}
                      onChange={(e) => setEditForm({ ...editForm, vouchers: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-advances">Adiantamento (R$)</Label>
                    <Input
                      id="edit-advances"
                      type="number"
                      step="0.01"
                      value={editForm.advances}
                      onChange={(e) => setEditForm({ ...editForm, advances: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-inss">INSS (R$)</Label>
                    <Input
                      id="edit-inss"
                      type="number"
                      step="0.01"
                      value={editForm.inss}
                      onChange={(e) => setEditForm({ ...editForm, inss: e.target.value })}
                    />
                  </div>
                </div>

                <div className="rounded-lg border p-4 space-y-3">
                  <h4 className="font-semibold text-sm">FGTS (informativo)</h4>
                  <div className="space-y-2">
                    <Label htmlFor="edit-fgts">FGTS (R$)</Label>
                    <Input
                      id="edit-fgts"
                      type="number"
                      step="0.01"
                      value={editForm.fgts}
                      onChange={(e) => setEditForm({ ...editForm, fgts: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Classificacao</Label>
                <Select
                  value={editForm.paymentType}
                  onValueChange={(value: 'contabil' | 'nao_contabil') => {
                    if (value !== editForm.paymentType) {
                      setEditForm({ ...editForm, paymentType: value })
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="contabil">Contabil</SelectItem>
                    <SelectItem value="nao_contabil">Nao Contabil</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* Custom Events Section */}
              <div className="space-y-3">
                <Label className="text-base font-medium">Eventos Customizados</Label>
                <p className="text-xs text-muted-foreground">Adicione proventos ou descontos extras (ex: Gratificacao, Quebra de Caixa)</p>
                
                {/* Add Event Form */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 items-end">
                  <div className="space-y-1 md:col-span-2">
                    <Label className="text-xs">Descricao</Label>
                    <Input
                      placeholder="Ex: Gratificacao, Quebra de Caixa..."
                      value={newEventForm.description}
                      onChange={(e) => setNewEventForm({ ...newEventForm, description: e.target.value })}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Tipo</Label>
                    <Select
                      value={newEventForm.type}
                      onValueChange={(value: 'provento' | 'desconto') => {
                        if (value !== newEventForm.type) {
                          setNewEventForm({ ...newEventForm, type: value })
                        }
                      }}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="provento">Provento (+)</SelectItem>
                        <SelectItem value="desconto">Desconto (-)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-1">
                    <div className="space-y-1 flex-1">
                      <Label className="text-xs">Valor (R$)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0,00"
                        value={newEventForm.value}
                        onChange={(e) => setNewEventForm({ ...newEventForm, value: e.target.value })}
                        className="h-9"
                      />
                    </div>
                    <Button 
                      type="button" 
                      size="icon" 
                      className="h-9 w-9 mt-5"
                      onClick={handleAddEvent}
                      disabled={!newEventForm.description || !newEventForm.value}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Events List */}
                {customEvents.length > 0 && (
                  <div className="space-y-2 border rounded-lg p-3">
                    {customEvents.map((event) => (
                      <div key={event.id} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <Badge variant={event.type === 'provento' ? 'default' : 'destructive'} className="text-xs">
                            {event.type === 'provento' ? '+' : '-'}
                          </Badge>
                          <span>{event.description}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={event.type === 'provento' ? 'text-green-600' : 'text-destructive'}>
                            {event.type === 'provento' ? '+' : '-'}{formatCurrency(event.value)}
                          </span>
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6"
                            onClick={() => handleRemoveEvent(event.id)}
                          >
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Separator />

              {/* Preview */}
              {(() => {
                const calc = calculatePayroll(selectedPayroll.baseSalary, editForm, customEvents)
                return (
                  <div className="bg-muted p-4 rounded-lg space-y-2">
                    <p className="text-sm font-medium">Previa do Calculo:</p>
                    <div className="text-sm space-y-1">
                      <div className="flex justify-between">
                        <span>Bruto (Base + Comissao + Proventos)</span>
                        <span>{formatCurrency(calc.grossSalary)}</span>
                      </div>
                      <div className="flex justify-between text-destructive">
                        <span>Descontos</span>
                        <span>-{formatCurrency(calc.totalDeductions)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-primary border-t pt-1">
                        <span>Liquido</span>
                        <span>{formatCurrency(calc.netSalary)}</span>
                      </div>
                    </div>
                  </div>
                )
              })()}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Payroll Dialog */}
      <Dialog open={isNewOpen} onOpenChange={setIsNewOpen}>
        <DialogContent className="w-full sm:max-w-3xl max-h-[85vh] overflow-y-auto overflow-x-hidden">
          <DialogHeader className="pb-4 border-b pr-12">
            <DialogTitle className="text-xl flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              Nova Folha de Pagamento
            </DialogTitle>
            <DialogDescription>
              Preencha os dados abaixo para criar uma nova folha de pagamento
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
            <Card className="w-full">
              <CardHeader className="pb-0">
                <CardTitle className="text-sm">Dados do Funcionario</CardTitle>
                <CardDescription>Selecao, competencia e classificacao</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Funcionario *</Label>
                  <Popover open={isEmployeeOpen} onOpenChange={setIsEmployeeOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={isEmployeeOpen}
                        className="h-11 w-full justify-between"
                      >
                        {newForm.employeeId
                          ? ((activeEmployees || []).find(e => e.id === newForm.employeeId) as any)?.name
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
                                    value={`${(emp as any).name} ${getStoreName(String((emp as any).storeId || (emp as any).store_id))} ${getPositionName(String((emp as any).positionId || (emp as any).position_id))}`}
                                onSelect={() => {
                                  setNewForm({ ...newForm, employeeId: emp.id })
                                  setIsEmployeeOpen(false)
                                }}
                              >
                                <div className="flex flex-col">
                                      <span className="font-medium">{(emp as any).name}</span>
                                      <span className="text-xs text-muted-foreground">{getStoreName(String((emp as any).storeId || (emp as any).store_id))} - {getPositionName(String((emp as any).positionId || (emp as any).position_id))}</span>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                {newForm.employeeId && (
                  <div className="rounded-md border bg-muted/40 p-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Salario Base</span>
                      <span className="font-semibold">
                        {formatCurrency(getBaseSalary(((activeEmployees || []).find(e => e.id === newForm.employeeId) as any)?.positionId || ((activeEmployees || []).find(e => e.id === newForm.employeeId) as any)?.position_id || ''))}
                      </span>
                    </div>
                  </div>
                )}

                <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Competencia (Mes)</Label>
                    <Select
                      value={newForm.month.toString()}
                      onValueChange={(value) => {
                        const next = parseInt(value)
                        if (next !== newForm.month) {
                          setNewForm({ ...newForm, month: next })
                        }
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {months.map((month) => (
                          <SelectItem key={month.value} value={month.value.toString()}>
                            {month.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Ano</Label>
                    <Input
                      type="number"
                      value={newForm.year}
                      onChange={(e) => setNewForm({ ...newForm, year: parseInt(e.target.value) })}
                      className="w-full"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Classificacao</Label>
                  <Select
                    value={newForm.paymentType}
                    onValueChange={(value: 'contabil' | 'nao_contabil') => {
                      if (value !== newForm.paymentType) {
                        setNewForm({ ...newForm, paymentType: value })
                      }
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="contabil">Contabil</SelectItem>
                      <SelectItem value="nao_contabil">Nao Contabil</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card className="w-full">
              <CardHeader className="pb-0">
                <CardTitle className="flex items-center gap-2 text-green-600">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100 text-green-700 text-xs font-bold">+</span>
                  Proventos
                </CardTitle>
                <CardDescription>Valores que aumentam o bruto</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Label className="text-sm">Comissoes</Label>
                  <InputGroup>
                    <InputGroupAddon>
                      <InputGroupText>R$</InputGroupText>
                    </InputGroupAddon>
                    <InputGroupInput
                      type="number"
                      step="0.01"
                      placeholder="0,00"
                      value={newForm.commissions}
                      onChange={(e) => setNewForm({ ...newForm, commissions: e.target.value })}
                    />
                  </InputGroup>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="w-full">
              <CardHeader className="pb-0">
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-destructive/10 text-destructive text-xs font-bold">-</span>
                  Descontos
                </CardTitle>
                <CardDescription>Valores que reduzem o liquido</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-sm">Compras Func.</Label>
                    <InputGroup>
                      <InputGroupAddon>
                        <InputGroupText>R$</InputGroupText>
                      </InputGroupAddon>
                      <InputGroupInput
                        type="number"
                        step="0.01"
                        placeholder="0,00"
                        value={newForm.employeePurchases}
                        onChange={(e) => setNewForm({ ...newForm, employeePurchases: e.target.value })}
                      />
                    </InputGroup>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Imposto de Renda</Label>
                    <InputGroup>
                      <InputGroupAddon>
                        <InputGroupText>R$</InputGroupText>
                      </InputGroupAddon>
                      <InputGroupInput
                        type="number"
                        step="0.01"
                        placeholder="0,00"
                        value={newForm.vouchers}
                        onChange={(e) => setNewForm({ ...newForm, vouchers: e.target.value })}
                      />
                    </InputGroup>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Adiantamento</Label>
                    <InputGroup>
                      <InputGroupAddon>
                        <InputGroupText>R$</InputGroupText>
                      </InputGroupAddon>
                      <InputGroupInput
                        type="number"
                        step="0.01"
                        placeholder="0,00"
                        value={newForm.advances}
                        onChange={(e) => setNewForm({ ...newForm, advances: e.target.value })}
                      />
                    </InputGroup>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">INSS</Label>
                    <InputGroup>
                      <InputGroupAddon>
                        <InputGroupText>R$</InputGroupText>
                      </InputGroupAddon>
                      <InputGroupInput
                        type="number"
                        step="0.01"
                        placeholder="0,00"
                        value={newForm.inss}
                        onChange={(e) => setNewForm({ ...newForm, inss: e.target.value })}
                      />
                    </InputGroup>
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">FGTS (Informativo - nao desconta)</Label>
                  <InputGroup>
                    <InputGroupAddon>
                      <InputGroupText>R$</InputGroupText>
                    </InputGroupAddon>
                    <InputGroupInput
                      type="number"
                      step="0.01"
                      placeholder="0,00"
                      className="bg-muted/30"
                      value={newForm.fgts}
                      onChange={(e) => setNewForm({ ...newForm, fgts: e.target.value })}
                    />
                  </InputGroup>
                </div>
              </CardContent>
            </Card>

            <Card className="w-full">
              <CardHeader className="pb-0">
                <CardTitle className="text-sm">Lancamentos Manuais</CardTitle>
                <CardDescription>Adicione proventos ou descontos extras</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Input
                    placeholder="Descricao (Ex: Premio, Uniforme...)"
                    value={newPayrollEventForm.description}
                    onChange={(e) => setNewPayrollEventForm({ ...newPayrollEventForm, description: e.target.value })}
                  />
                </div>
                <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2">
                  <Select
                    value={newPayrollEventForm.type}
                    onValueChange={(value: 'provento' | 'desconto') => {
                      if (value !== newPayrollEventForm.type) {
                        setNewPayrollEventForm({ ...newPayrollEventForm, type: value })
                      }
                    }}
                  >
                    <SelectTrigger className="w-full sm:w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="provento">Provento (+)</SelectItem>
                      <SelectItem value="desconto">Desconto (-)</SelectItem>
                    </SelectContent>
                  </Select>
                  <InputGroup className="w-full sm:flex-1">
                    <InputGroupAddon>
                      <InputGroupText>R$</InputGroupText>
                    </InputGroupAddon>
                    <InputGroupInput
                      type="number"
                      step="0.01"
                      placeholder="0,00"
                      value={newPayrollEventForm.value}
                      onChange={(e) => setNewPayrollEventForm({ ...newPayrollEventForm, value: e.target.value })}
                    />
                  </InputGroup>
                  <Button 
                    type="button" 
                    size="icon"
                    onClick={handleAddNewPayrollEvent}
                    disabled={!newPayrollEventForm.description || !newPayrollEventForm.value}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {newPayrollEvents.length > 0 && (
                  <div className="space-y-2 pt-2 border-t">
                    {newPayrollEvents.map((event) => (
                      <div key={event.id} className="flex items-center justify-between text-sm py-1.5">
                        <div className="flex items-center gap-2">
                          <div className={`w-1.5 h-1.5 rounded-full ${event.type === 'provento' ? 'bg-green-500' : 'bg-destructive'}`} />
                          <span className="text-muted-foreground">{event.description}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className={event.type === 'provento' ? 'text-green-600 font-medium' : 'text-destructive font-medium'}>
                            {event.type === 'provento' ? '+' : '-'}{formatCurrency(event.value)}
                          </span>
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6 hover:bg-destructive/10"
                            onClick={() => handleRemoveNewPayrollEvent(event.id)}
                          >
                            <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {newForm.employeeId && (
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 mt-2 overflow-hidden">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Previa do Salario Liquido</p>
                  <p className="text-xs text-muted-foreground">
                    {months.find(m => m.value === newForm.month)?.label} / {newForm.year}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-primary">
                    {formatCurrency(
                      calculatePayroll(
                        0,
                        newForm,
                        newPayrollEvents
                      ).netSalary
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 pt-4 border-t">
            <Button 
              variant="outline" 
              onClick={() => { 
                setIsNewOpen(false); 
                setNewPayrollEvents([]); 
                setNewPayrollEventForm({ description: '', type: 'provento', value: '' }); 
              }}
            >
              Cancelar
            </Button>
            <Button onClick={handleCreatePayroll} disabled={isSubmitting || !newForm.employeeId}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Criando...
                </>
              ) : (
                'Criar Folha'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
