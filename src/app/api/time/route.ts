import { NextResponse } from 'next/server'

export async function GET() {
  const now = new Date()

  // Get hours and minutes in Egypt timezone
  const egyptTimeStr = now.toLocaleString('en-US', {
    timeZone: 'Africa/Cairo',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })

  return NextResponse.json({
    time: egyptTimeStr,
    timestamp: now.getTime(),
  })
}
