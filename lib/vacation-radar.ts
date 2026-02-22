import type { Employee, Vacation, VacationAlertLevel } from '@/types'

export function getVacationRadar(employees: Employee[], vacations: Vacation[]) {
  const today = new Date()
  return (employees || [])
    .filter((e: any) => (e as any).status !== 'terminated')
    .map((emp: any) => {
      const hd = (emp as any).hireDate || (emp as any).hire_date
      const hire = new Date(hd)
      const lastAnniversary = new Date(hire)
      lastAnniversary.setFullYear(today.getFullYear())
      if (lastAnniversary > today) {
        lastAnniversary.setFullYear(today.getFullYear() - 1)
      }
      const cycleEnd = new Date(lastAnniversary)
      cycleEnd.setFullYear(cycleEnd.getFullYear() + 1)
      const hasVacation = (vacations || []).some((v: any) => {
        const empId = String((v as any).employeeId || (v as any).employee_id || '')
        if (empId !== emp.id) return false
        if ((v as any).status === 'cancelled') return false
        const sStr = String((v as any).startDate || (v as any).start_date || '')
        const eStr = String((v as any).endDate || (v as any).end_date || '')
        if (!sStr || !eStr) return false
        const s = new Date(sStr)
        const e = new Date(eStr)
        return e >= lastAnniversary && s <= cycleEnd
      })
      if (hasVacation) {
        return { ...emp, vacationAlert: { level: 'ok' as VacationAlertLevel, daysUntilDeadline: 999 } }
      }
      const diffTime = cycleEnd.getTime() - today.getTime()
      const daysUntilDeadline = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      let level: VacationAlertLevel = 'ok'
      if (daysUntilDeadline <= 15) level = 'critical'
      else if (daysUntilDeadline <= 30) level = 'attention'
      else if (daysUntilDeadline <= 60) level = 'planning'
      return { ...emp, vacationAlert: { level, daysUntilDeadline } }
    })
}
