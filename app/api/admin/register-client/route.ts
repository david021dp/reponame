import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logAdminActivity } from '@/lib/queries/admin-logs'
import { rateLimit, getRateLimitIdentifier, RATE_LIMITS } from '@/lib/middleware/rate-limit'
import { createRateLimitResponse } from '@/lib/middleware/rate-limit-response'
import { validateRegisterClient } from '@/lib/validation/appointment'
import { requireCsrfToken } from '@/lib/csrf/middleware'
import { checkRequestSize, REQUEST_SIZE_LIMITS } from '@/lib/middleware/request-size-limit'

export async function POST(request: Request) {
  // Request size check
  const req = new NextRequest(request)
  const sizeCheck = checkRequestSize(req, REQUEST_SIZE_LIMITS.registration)
  if (!sizeCheck.valid) {
    return sizeCheck.response!
  }

  // CSRF protection
  const csrfCheck = await requireCsrfToken(req)
  if (!csrfCheck.valid) {
    return csrfCheck.response!
  }

  // Rate limiting for registration
  const identifier = getRateLimitIdentifier(req)
  const limitResult = rateLimit(identifier, RATE_LIMITS.registration.maxRequests, RATE_LIMITS.registration.windowMs)
  if (!limitResult.allowed) {
    return createRateLimitResponse(limitResult, req)
  }

  try {
    const supabase = await createClient()
    
    // Verify user is authenticated and is an admin
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user is admin
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userData?.role !== 'admin' && userData?.role !== 'head_admin') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    const rawBody = await request.json()
    
    // Validate input
    let validatedData
    try {
      validatedData = validateRegisterClient(rawBody)
    } catch (error: any) {
      if (error.errors) {
        return NextResponse.json(
          { error: 'Validation failed', details: error.errors },
          { status: 400 }
        )
      }
      return NextResponse.json(
        { error: `Validation failed: ${error.message}` },
        { status: 400 }
      )
    }

    const { email, password, first_name, last_name, phone, admin_id } = validatedData

    // Create auth user using Supabase Admin API
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: false, // Require email confirmation
      user_metadata: {
        first_name,
        last_name,
        phone,
      },
    })

    if (authError) {
      console.error('Error creating auth user:', authError)
      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      )
    }

    // Create user entry in users table
    const { data: newUser, error: userError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email,
        role: 'client',
        first_name,
        last_name,
        phone: phone || null,
      })
      .select()
      .single()

    if (userError) {
      console.error('Error creating user record:', userError)
      // Clean up auth user if users table insert fails
      await supabase.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json(
        { error: userError.message },
        { status: 400 }
      )
    }

    // Log admin activity
    await logAdminActivity(admin_id, 'register_client', {
      client_id: authData.user.id,
      client_email: email,
      client_name: `${first_name} ${last_name}`,
    })

    return NextResponse.json(
      { 
        success: true,
        user: newUser,
        message: 'Client registered successfully. Verification email sent.'
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Error in POST /api/admin/register-client:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

