import { NextResponse } from 'next/server'
import { updateVacation, deleteVacation } from '@/lib/services/data-service'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const vacation = await updateVacation(id, body)
    return NextResponse.json(vacation)
  } catch (error) {
    console.error('Error updating vacation:', error)
    return NextResponse.json(
      { error: 'Failed to update vacation' },
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
    await deleteVacation(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting vacation:', error)
    return NextResponse.json(
      { error: 'Failed to delete vacation' },
      { status: 500 }
    )
  }
}
