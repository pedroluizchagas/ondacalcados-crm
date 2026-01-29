import { NextResponse } from 'next/server'
import { getVacations, createVacation } from '@/lib/services/data-service'

export async function GET() {
  try {
    const vacations = await getVacations()
    return NextResponse.json(vacations)
  } catch (error) {
    console.error('Error fetching vacations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch vacations' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const vacation = await createVacation(body)
    return NextResponse.json(vacation, { status: 201 })
  } catch (error) {
    console.error('Error creating vacation:', error)
    return NextResponse.json(
      { error: 'Failed to create vacation' },
      { status: 500 }
    )
  }
}
