import { NextResponse } from 'next/server'
import { getMedicalCertificates, createMedicalCertificate } from '@/lib/services/data-service'

export async function GET() {
  try {
    const certificates = await getMedicalCertificates()
    return NextResponse.json(certificates)
  } catch (error) {
    console.error('Error fetching medical certificates:', error)
    return NextResponse.json(
      { error: 'Failed to fetch medical certificates' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const certificate = await createMedicalCertificate(body)
    return NextResponse.json(certificate, { status: 201 })
  } catch (error) {
    console.error('Error creating medical certificate:', error)
    return NextResponse.json(
      { error: 'Failed to create medical certificate' },
      { status: 500 }
    )
  }
}
