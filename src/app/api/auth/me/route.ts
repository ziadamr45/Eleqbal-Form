import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    // Read session token from cookies
    const sessionCookie = request.cookies.get('session')
    if (!sessionCookie?.value) {
      return NextResponse.json(
        { success: false, error: 'unauthorized' },
        { status: 401 }
      )
    }

    // Find valid (non-expired) session
    const session = await db.session.findUnique({
      where: { token: sessionCookie.value },
      include: {
        user: {
          include: {
            student: true,
          },
        },
      },
    })

    if (!session || session.expiresAt < new Date()) {
      return NextResponse.json(
        { success: false, error: 'unauthorized' },
        { status: 401 }
      )
    }

    return NextResponse.json({
      success: true,
      user: {
        id: session.user.id,
        email: session.user.email,
        student: session.user.student,
      },
    })
  } catch (error) {
    console.error('Auth me error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to authenticate' },
      { status: 500 }
    )
  }
}
