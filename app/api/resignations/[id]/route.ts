import { NextResponse } from 'next/server'
import { deleteResignation } from '@/lib/services/data-service'

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await deleteResignation(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting resignation:', error)
    return NextResponse.json(
      { error: 'Failed to delete resignation' },
      { status: 500 }
    )
  }
}
