import { NextResponse } from 'next/server'
import { deleteMedicalCertificate } from '@/lib/services/data-service'

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await deleteMedicalCertificate(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting medical certificate:', error)
    return NextResponse.json(
      { error: 'Failed to delete medical certificate' },
      { status: 500 }
    )
  }
}
