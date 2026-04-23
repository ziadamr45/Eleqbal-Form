import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAdminUser, adminUnauthorized } from '@/lib/admin-auth'

export async function GET(request: NextRequest) {
  try {
    const admin = await getAdminUser(request)
    if (!admin) return adminUnauthorized()

    const [notifications, unreadCount] = await Promise.all([
      db.adminNotification.findMany({
        orderBy: { createdAt: 'desc' },
        take: 30,
      }),
      db.adminNotification.count({ where: { isRead: false } }),
    ])

    return NextResponse.json({ success: true, notifications, unreadCount })
  } catch (error) {
    console.error('Admin notifications list error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch notifications' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const admin = await getAdminUser(request)
    if (!admin) return adminUnauthorized()

    const body = await request.json()
    const { action, id } = body

    if (action === 'mark_all_read') {
      await db.adminNotification.updateMany({ where: { isRead: false }, data: { isRead: true } })
      return NextResponse.json({ success: true })
    }

    if (action === 'mark_read' && id) {
      await db.adminNotification.update({ where: { id }, data: { isRead: true } })
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Admin notification update error:', error)
    return NextResponse.json({ success: false, error: 'Failed to update notification' }, { status: 500 })
  }
}
