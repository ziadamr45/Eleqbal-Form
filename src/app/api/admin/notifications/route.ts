import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAdminUser, adminUnauthorized } from '@/lib/admin-auth'

// POST: Send notification (to all or specific user)
export async function POST(request: NextRequest) {
  try {
    const admin = await getAdminUser(request)
    if (!admin) return adminUnauthorized()

    const body = await request.json()
    const { title, message, targetUserId, sentToAll } = body

    if (!title || !message) {
      return NextResponse.json({ success: false, error: 'Title and message are required' }, { status: 400 })
    }

    if (!sentToAll && !targetUserId) {
      return NextResponse.json({ success: false, error: 'Must specify target user or send to all' }, { status: 400 })
    }

    // Create notification
    const notification = await db.notification.create({
      data: {
        title,
        message,
        sentByAdminId: admin.id,
        targetUserId: sentToAll ? null : targetUserId,
        sentToAll: !!sentToAll,
      },
    })

    // Create recipient entries
    if (sentToAll) {
      // Send to all student users
      const students = await db.user.findMany({
        where: { role: 'student' },
        select: { id: true },
      })

      if (students.length > 0) {
        await db.userNotification.createMany({
          data: students.map(s => ({
            userId: s.id,
            notificationId: notification.id,
          })),
        })
      }

      return NextResponse.json({ success: true, sentTo: students.length })
    } else {
      // Send to specific user
      await db.userNotification.create({
        data: { userId: targetUserId, notificationId: notification.id },
      })

      return NextResponse.json({ success: true, sentTo: 1 })
    }
  } catch (error) {
    console.error('Send notification error:', error)
    return NextResponse.json({ success: false, error: 'Failed to send notification' }, { status: 500 })
  }
}

// GET: List sent notifications (admin history)
export async function GET(request: NextRequest) {
  try {
    const admin = await getAdminUser(request)
    if (!admin) return adminUnauthorized()

    const notifications = await db.notification.findMany({
      where: { sentByAdminId: admin.id },
      include: {
        targetUser: { select: { name: true, email: true, student: { select: { fullName: true } } } },
        _count: { select: { recipients: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    return NextResponse.json({
      success: true,
      notifications: notifications.map(n => ({
        id: n.id,
        title: n.title,
        message: n.message,
        sentToAll: n.sentToAll,
        targetName: n.targetUser ? (n.targetUser.student?.fullName || n.targetUser.name || n.targetUser.email) : null,
        recipientCount: n._count.recipients,
        createdAt: n.createdAt,
      })),
    })
  } catch (error) {
    console.error('List notifications error:', error)
    return NextResponse.json({ success: false, error: 'Failed' }, { status: 500 })
  }
}
