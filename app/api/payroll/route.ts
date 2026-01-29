import { NextResponse } from 'next/server'
import { getPayrollItems, createPayrollItem } from '@/lib/services/data-service'

export async function GET() {
  try {
    const payrolls = await getPayrollItems()
    return NextResponse.json(payrolls)
  } catch (error) {
    console.error('Error fetching payroll:', error)
    return NextResponse.json(
      { error: 'Failed to fetch payroll' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const payroll = await createPayrollItem(body)
    return NextResponse.json(payroll, { status: 201 })
  } catch (error) {
    console.error('Error creating payroll:', error)
    return NextResponse.json(
      { error: 'Failed to create payroll' },
      { status: 500 }
    )
  }
}
