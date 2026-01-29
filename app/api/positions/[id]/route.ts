import { NextResponse } from 'next/server'
import { updatePosition, deletePosition } from '@/lib/services/data-service'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const position = await updatePosition(id, body)
    return NextResponse.json(position)
  } catch (error) {
    console.error('Error updating position:', error)
    return NextResponse.json(
      { error: 'Failed to update position' },
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
    await deletePosition(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting position:', error)
    return NextResponse.json(
      { error: 'Failed to delete position' },
      { status: 500 }
    )
  }
}
