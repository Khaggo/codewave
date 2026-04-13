'use client'

import { useState, useEffect } from 'react'
import { timelineEvents as mockEvents } from '@/lib/mockData'

/**
 * Returns service timeline events, sorted newest-first.
 * Pass vehicleId to scope to one vehicle.
 */
export function useTimeline(vehicleId) {
  const [events, setEvents]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  useEffect(() => {
    setLoading(true)
    const timer = setTimeout(() => {
      try {
        const filtered = vehicleId
          ? mockEvents.filter(e => e.vehicleId === vehicleId)
          : mockEvents
        const sorted = [...filtered].sort((a, b) => new Date(b.date) - new Date(a.date))
        setEvents(sorted)
      } catch (e) {
        setError(e)
      } finally {
        setLoading(false)
      }
    }, 250)

    return () => clearTimeout(timer)
  }, [vehicleId])

  return { events, loading, error }
}
