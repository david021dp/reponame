import DOMPurify from 'isomorphic-dompurify'

/**
 * Sanitize HTML content to prevent XSS attacks
 * Allows only safe text content - strips all HTML tags
 */
export function sanitizeHtml(dirty: string | null | undefined): string {
  if (!dirty) return ''
  
  // Strip all HTML tags, only allow plain text
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true, // Keep text content but remove tags
  })
}

/**
 * Sanitize text content (escape HTML entities)
 * Use this for displaying user input as plain text
 */
export function sanitizeText(input: string | null | undefined): string {
  if (!input) return ''
  
  // Convert to plain text and escape HTML entities
  const text = DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  })
  
  return text
}

