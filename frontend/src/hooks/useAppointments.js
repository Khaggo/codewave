'use client'

import { useState, useEffect } from 'react'
import { getAppointments, subscribeAppointments } from '@/lib/appointmentStore'

export function useAppointments(vehicleId) {
  const [appointments, setAppointments] = useState([])
  const [loading,      setLoading]      = useState(true)

  useEffect(() => {
    function applyFilter(all) {
      return vehicleId ? all.filter(a => a.vehicleId === vehicleId) : all
    }

    const timer = setTimeout(() => {
      setAppointments(applyFilter(getAppointments()))
      setLoading(false)
    }, 250)

    const unsub = subscribeAppointments(all => setAppointments(applyFilter(all)))

    return () => {
      clearTimeout(timer)
      unsub()
    }
  }, [vehicleId])

  return { appointments, loading, error: null }
}
