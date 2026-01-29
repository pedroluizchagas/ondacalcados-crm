import { NextResponse } from 'next/server'
import { getResignations, createResignation } from '@/lib/services/data-service'

export async function GET() {
  try {
    const resignations = await getResignations()
    return NextResponse.json(resignations)
  } catch (error) {
    console.error('Error fetching resignations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch resignations' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const resignation = await createResignation(body)
    return NextResponse.json(resignation, { status: 201 })
  } catch (error) {
    console.error('Error creating resignation:', error)
    return NextResponse.json(
      { error: 'Failed to create resignation' },
      { status: 500 }
    )
  }
}
