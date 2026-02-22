import { NextResponse } from 'next/server'
import { updateVacation, deleteVacation } from '@/lib/services/data-service'

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await request.json()
    const vacation = await updateVacation(id, body)
    return NextResponse.json(vacation)
  } catch (error) {
    console.error('Error updating vacation:', error)
    const message = error instanceof Error ? error.message : 'Failed to update vacation'
    const status = message === 'overlap' || message === 'start_after_end' ? 400 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
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
