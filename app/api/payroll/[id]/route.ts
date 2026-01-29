import { NextResponse } from 'next/server'
import { updatePayrollItem, deletePayrollItem } from '@/lib/services/data-service'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const payroll = await updatePayrollItem(id, body)
    return NextResponse.json(payroll)
  } catch (error) {
    console.error('Error updating payroll:', error)
    return NextResponse.json(
      { error: 'Failed to update payroll' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await deletePayrollItem(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting payroll:', error)
    return NextResponse.json(
      { error: 'Failed to delete payroll' },
      { status: 500 }
    )
  }
}
