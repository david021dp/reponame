/**
 * Client-side CSRF token utilities
 */

let csrfTokenCache: string | null = null

/**
 * Fetch CSRF token from server
 */
export async function fetchCsrfToken(): Promise<string | null> {
  try {
    const response = await fetch('/api/csrf-token', {
      method: 'GET',
      credentials: 'include', // Include cookies
    })

    if (!response.ok) {
      console.error(`[CSRF Client] Failed to fetch CSRF token: ${response.status} ${response.statusText}`)
      return null
    }

    const data = await response.json()
    if (!data.token) {
      console.error('[CSRF Client] No token in response:', data)
      return null
    }
    
    csrfTokenCache = data.token
    console.log('[CSRF Client] Token fetched and cached successfully')
    return data.token
  } catch (error) {
    console.error('[CSRF Client] Error fetching CSRF token:', error)
    return null
  }
}

/**
 * Get CSRF token (from cache or fetch new)
 */
export async function getCsrfToken(): Promise<string | null> {
  if (csrfTokenCache) {
    console.log('[CSRF Client] Using cached token')
    return csrfTokenCache
  }
  console.log('[CSRF Client] No cached token, fetching new token...')
  return await fetchCsrfToken()
}

/**
 * Clear CSRF token cache (useful after logout)
 */
export function clearCsrfToken() {
  csrfTokenCache = null
}

/**
 * Get CSRF header name
 */
export const CSRF_HEADER_NAME = 'x-csrf-token'

