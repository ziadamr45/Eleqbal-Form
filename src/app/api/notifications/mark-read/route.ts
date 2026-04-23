import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function PUT(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')
    if (!sessionCookie?.value) {
      return NextResponse.json({ success: false, error: 'unauthorized' }, { status: 401 })
    }

    const session = await db.session.findUnique({
      where: { token: sessionCookie.value },
      select: { userId: true, expiresAt: true },
    })
    if (!session || session.expiresAt < new Date()) {
      return NextResponse.json({ success: false, error: 'unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { notificationId } = body
    if (!notificationId) {
      return NextResponse.json({ success: false, error: 'Notification ID required' }, { status: 400 })
    }

    await db.userNotification.updateMany({
      where: { userId: session.userId, notificationId },
      data: { isRead: true },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Mark read error:', error)
    return NextResponse.json({ success: false, error: 'Failed' }, { status: 500 })
  }
}
