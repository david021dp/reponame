import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  // HTTPS enforcement (production only)
  if (process.env.NODE_ENV === 'production') {
    const protocol = request.headers.get('x-forwarded-proto') || request.nextUrl.protocol
    const host = request.headers.get('host') || request.nextUrl.host
    
    // Redirect HTTP to HTTPS
    if (protocol === 'http:' || protocol === 'http') {
      const httpsUrl = new URL(request.url)
      httpsUrl.protocol = 'https:'
      return NextResponse.redirect(httpsUrl, 301) // Permanent redirect
    }
  }

  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Protect routes based on authentication and role
  const path = request.nextUrl.pathname

  // Allow API security endpoints without authentication (for logging failed logins)
  if (path.startsWith('/api/security/')) {
    return supabaseResponse
  }

  // Public routes
  if (path === '/login' || path === '/') {
    if (user) {
      // Get user role from users table
      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()

      // Redirect authenticated users away from login
      if (userData?.role === 'admin') {
        return NextResponse.redirect(new URL('/admin/dashboard', request.url))
      } else if (userData?.role === 'client') {
        return NextResponse.redirect(new URL('/client/schedule', request.url))
      }
    }
    return supabaseResponse
  }

  // Protected routes - require authentication
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Get user role
  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  // Admin routes protection (admin or head_admin)
  if (path.startsWith('/admin')) {
    if (userData?.role !== 'admin' && userData?.role !== 'head_admin') {
      return NextResponse.redirect(new URL('/client/schedule', request.url))
    }
  }

  // Client routes protection
  if (path.startsWith('/client')) {
    if (userData?.role !== 'client') {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url))
    }
  }

  return supabaseResponse
}

