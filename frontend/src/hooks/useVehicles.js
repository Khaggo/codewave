'use client'

import { useState, useEffect } from 'react'
import { getVehicles, subscribeVehicles } from '@/lib/vehicleStore'

export function useVehicles() {
  const [vehicles, setVehicles] = useState([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    // Simulate async load on first mount
    const timer = setTimeout(() => {
      setVehicles(getVehicles())
      setLoading(false)
    }, 250)

    // Subscribe to future additions (addVehicle calls)
    const unsub = subscribeVehicles(all => setVehicles(all))

    return () => {
      clearTimeout(timer)
      unsub()
    }
  }, [])

  return { vehicles, loading, error: null }
}
