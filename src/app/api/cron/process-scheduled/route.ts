import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sendPushToUser, sendPushToAll } from '@/lib/push'

// This endpoint processes scheduled notifications that are due
// Call it via cron (e.g., every minute on Vercel)
export async function GET() {
  try {
    const now = new Date()

    // Find all scheduled notifications that are due
    const dueNotifications = await db.notification.findMany({
      where: {
        status: 'scheduled',
        scheduledAt: { lte: now },
      },
    })

    if (dueNotifications.length === 0) {
      return NextResponse.json({ success: true, processed: 0 })
    }

    let processed = 0

    for (const notification of dueNotifications) {
      try {
        if (notification.sentToAll) {
          // Send to all students
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

          // Send Web Push to all
          await sendPushToAll(notification.title, notification.message)
        } else if (notification.targetUserId) {
          // Send to specific user
          await db.userNotification.create({
            data: { userId: notification.targetUserId, notificationId: notification.id },
          })

          // Send Web Push
          await sendPushToUser(notification.targetUserId, notification.title, notification.message)
        }

        // Mark as sent
        await db.notification.update({
          where: { id: notification.id },
          data: {
            status: 'sent',
            sentAt: now,
          },
        })

        processed++
      } catch (err) {
        console.error(`[Cron] Failed to process notification ${notification.id}:`, err)
        // Mark as failed
        await db.notification.update({
          where: { id: notification.id },
          data: { status: 'failed' },
        })
      }
    }

    return NextResponse.json({ success: true, processed, total: dueNotifications.length })
  } catch (error) {
    console.error('[Cron] Process scheduled error:', error)
    return NextResponse.json({ success: false, error: 'Failed' }, { status: 500 })
  }
}
