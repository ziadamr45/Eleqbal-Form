import webpush from 'web-push'
import { db } from '@/lib/db'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || ''
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:eleqbalschool@gmail.com'

let configured = false

function ensureConfigured() {
  if (!configured && VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
    configured = true
  }
}

export async function sendPushToUser(userId: string, title: string, message: string, url?: string): Promise<boolean> {
  ensureConfigured()

  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.warn('[Push] VAPID keys not configured')
    return false
  }

  try {
    const subscriptions = await db.pushSubscription.findMany({ where: { userId } })
    if (subscriptions.length === 0) return false

    const payload = JSON.stringify({
      title,
      body: message,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      url: url || '/',
    })

    await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            payload,
          )
        } catch (err: unknown) {
          const error = err as { statusCode?: number }
          if (error.statusCode === 404 || error.statusCode === 410) {
            await db.pushSubscription.deleteMany({ where: { endpoint: sub.endpoint } })
          }
        }
      }),
    )

    return true
  } catch (error) {
    console.error('[Push] sendPushToUser error:', error)
    return false
  }
}

export async function sendPushToAll(title: string, message: string, url?: string): Promise<number> {
  ensureConfigured()

  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return 0

  try {
    const allSubs = await db.pushSubscription.findMany()
    if (allSubs.length === 0) return 0

    const payload = JSON.stringify({
      title,
      body: message,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      url: url || '/',
    })

    let sent = 0
    await Promise.allSettled(
      allSubs.map(async (sub) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            payload,
          )
          sent++
        } catch (err: unknown) {
          const error = err as { statusCode?: number }
          if (error.statusCode === 404 || error.statusCode === 410) {
            await db.pushSubscription.deleteMany({ where: { endpoint: sub.endpoint } })
          }
        }
      }),
    )

    return sent
  } catch (error) {
    console.error('[Push] sendPushToAll error:', error)
    return 0
  }
}

export function getVapidPublicKey(): string {
  return VAPID_PUBLIC_KEY
}
