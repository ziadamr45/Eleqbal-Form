import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import webpush from 'web-push'

// Configure web-push with VAPID keys
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || ''
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:eleqbalschool@gmail.com'

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
}

// Helper to get authenticated user from session
async function getUser(request: NextRequest) {
  const sessionCookie = request.cookies.get('session')
  if (!sessionCookie?.value) return null

  const session = await db.session.findUnique({
    where: { token: sessionCookie.value },
    select: { userId: true, expiresAt: true },
  })
  if (!session || session.expiresAt < new Date()) return null

  return session.userId
}

// POST: Subscribe to push notifications
export async function POST(request: NextRequest) {
  try {
    const userId = await getUser(request)
    if (!userId) {
      return NextResponse.json({ success: false, error: 'unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { subscription } = body

    if (!subscription?.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
      return NextResponse.json({ success: false, error: 'Invalid subscription' }, { status: 400 })
    }

    // Check if already subscribed with this endpoint
    const existing = await db.pushSubscription.findUnique({
      where: { userId_endpoint: { userId, endpoint: subscription.endpoint } },
    })

    if (existing) {
      await db.pushSubscription.update({
        where: { id: existing.id },
        data: {
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
        },
      })
    } else {
      await db.pushSubscription.create({
        data: {
          userId,
          endpoint: subscription.endpoint,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
        },
      })
    }

    // Send welcome notification
    try {
      await webpush.sendNotification(subscription, JSON.stringify({
        title: 'كلية الاقبال القوميه',
        body: 'تم تفعيل الإشعارات بنجاح ✅',
        icon: '/favicon.ico',
        url: '/',
      }))
    } catch (pushError: unknown) {
      const err = pushError as { statusCode?: number }
      if (err.statusCode === 404 || err.statusCode === 410) {
        await db.pushSubscription.deleteMany({ where: { userId, endpoint: subscription.endpoint } })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Push subscribe error:', error)
    return NextResponse.json({ success: false, error: 'Failed to subscribe' }, { status: 500 })
  }
}

// DELETE: Unsubscribe from push notifications
export async function DELETE(request: NextRequest) {
  try {
    const userId = await getUser(request)
    if (!userId) {
      return NextResponse.json({ success: false, error: 'unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { endpoint } = body

    if (endpoint) {
      await db.pushSubscription.deleteMany({ where: { userId, endpoint } })
    } else {
      await db.pushSubscription.deleteMany({ where: { userId } })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Push unsubscribe error:', error)
    return NextResponse.json({ success: false, error: 'Failed to unsubscribe' }, { status: 500 })
  }
}

// GET: Check push subscription status
export async function GET(request: NextRequest) {
  try {
    const userId = await getUser(request)
    if (!userId) {
      return NextResponse.json({ success: false, error: 'unauthorized' }, { status: 401 })
    }

    const subscriptions = await db.pushSubscription.findMany({
      where: { userId },
      select: { endpoint: true },
    })

    return NextResponse.json({
      success: true,
      subscribed: subscriptions.length > 0,
      count: subscriptions.length,
    })
  } catch (error) {
    console.error('Push status error:', error)
    return NextResponse.json({ success: false, error: 'Failed' }, { status: 500 })
  }
}
