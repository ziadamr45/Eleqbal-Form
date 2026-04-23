import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Get current user's notifications
export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')
    if (!sessionCookie?.value) {
      return NextResponse.json({ success: false, error: 'unauthorized' }, { status: 401 })
    }

    const session = await db.session.findUnique({
      where: { token: sessionCookie.value },
      include: { user: true },
    })
    if (!session || session.expiresAt < new Date()) {
      return NextResponse.json({ success: false, error: 'unauthorized' }, { status: 401 })
    }

    const userNotifications = await db.userNotification.findMany({
      where: { userId: session.user.id },
      include: {
        notification: {
          include: {
            sentByAdmin: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    const unreadCount = userNotifications.filter(n => !n.isRead).length

    return NextResponse.json({
      success: true,
      notifications: userNotifications.map(un => ({
        id: un.notification.id,
        title: un.notification.title,
        message: un.notification.message,
        isRead: un.isRead,
        sentToAll: un.notification.sentToAll,
        createdAt: un.notification.createdAt,
        adminName: un.notification.sentByAdmin.name,
      })),
      unreadCount,
    })
  } catch (error) {
    console.error('Get notifications error:', error)
    return NextResponse.json({ success: false, error: 'Failed' }, { status: 500 })
  }
}
