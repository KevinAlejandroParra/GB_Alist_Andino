'use client'

import { useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'

export default function AttraChecklistTypeRedirectPage() {
  const router = useRouter()
  const params = useParams()
  const { checklistTypeId } = params

  useEffect(() => {
    // Redirigir a la ruta correcta de attraction con el checklistTypeId
    router.replace(`/checklists/attraction/${checklistTypeId}`)
  }, [router, checklistTypeId])

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-6 flex items-center justify-center">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-500"></div>
    </div>
  )
}
