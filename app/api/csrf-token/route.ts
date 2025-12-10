import { NextResponse } from 'next/server'
import { generateCsrfToken } from '@/lib/csrf/token'

/**
 * GET endpoint to retrieve CSRF token
 * This should be called before making state-changing requests
 */
export async function GET() {
  try {
    const token = await generateCsrfToken()
    return NextResponse.json({ token })
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to generate CSRF token' },
      { status: 500 }
    )
  }
}

