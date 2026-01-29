import { NextResponse } from 'next/server'
import { getPositions, createPosition } from '@/lib/services/data-service'

export async function GET() {
  try {
    const positions = await getPositions()
    return NextResponse.json(positions)
  } catch (error) {
    console.error('Error fetching positions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch positions' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const position = await createPosition(body)
    return NextResponse.json(position, { status: 201 })
  } catch (error) {
    console.error('Error creating position:', error)
    return NextResponse.json(
      { error: 'Failed to create position' },
      { status: 500 }
    )
  }
}
