import { redirect } from 'next/navigation'

export default function Home() {
  // Middleware will handle redirecting authenticated users
  // This page just redirects unauthenticated users to login
  redirect('/login')
}
