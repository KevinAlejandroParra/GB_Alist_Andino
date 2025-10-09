'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AttraRedirectPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirigir a la ruta correcta de attraction
    router.replace('/checklists/attraction')
  }, [router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-6 flex items-center justify-center">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-500"></div>
    </div>
  )
}
