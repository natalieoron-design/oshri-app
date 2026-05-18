'use client'
import { useEffect } from 'react'

export default function RecommendationsViewed({ patientId }: { patientId: string }) {
  useEffect(() => {
    fetch('/api/recommendations/mark-seen', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patient_id: patientId }),
    }).catch(() => {})
  }, [patientId])

  return null
}
