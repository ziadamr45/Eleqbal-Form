import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    // Read session token from cookies
    const sessionCookie = request.cookies.get('session')

    if (sessionCookie?.value) {
      // Delete session from DB
      await db.session.deleteMany({
        where: { token: sessionCookie.value },
      })
    }

    // Clear the session cookie and return success
    const response = NextResponse.json({ success: true })

    response.cookies.set('session', '', {
      path: '/',
      maxAge: 0,
      httpOnly: true,
      sameSite: 'lax',
    })

    return response
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to logout' },
      { status: 500 }
    )
  }
}
