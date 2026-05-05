'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import { ApiError, listAdminCustomers } from '@/lib/authClient'
import { useUser } from '@/lib/userContext'

const buildOwnerName = (customer) =>
  customer?.displayName ||
  [customer?.profile?.firstName, customer?.profile?.lastName]
    .map((part) => String(part ?? '').trim())
    .filter(Boolean)
    .join(' ') ||
  customer?.email ||
  'Customer record'

const normalizeVehicleRecord = (vehicle, customer) => ({
  id: vehicle.id,
  owner: buildOwnerName(customer),
  ownerEmail: customer?.email ?? 'No email',
  plate: vehicle.plateNumber ?? 'No plate',
  model: [vehicle?.year, vehicle?.make, vehicle?.model]
    .map((part) => String(part ?? '').trim())
    .filter(Boolean)
    .join(' ') || 'Vehicle details pending',
  color: vehicle?.color?.trim() || 'Not provided',
  year: vehicle?.year ?? 'Unknown',
  notes: vehicle?.notes?.trim() || 'No notes',
  status: customer?.isActive === false ? 'inactive' : 'active',
})

export function useVehicles() {
  const user = useUser()
  const canReadVehicles = useMemo(
    () => ['service_adviser', 'super_admin'].includes(user?.role),
    [user?.role],
  )
  const [state, setState] = useState({
    vehicles: [],
    loading: true,
    error: '',
  })

  const loadVehicles = useCallback(async () => {
    if (!user?.accessToken) {
      setState({ vehicles: [], loading: false, error: 'Restore a valid staff session to load vehicle records.' })
      return
    }

    if (!canReadVehicles) {
      setState({
        vehicles: [],
        loading: false,
        error: 'Vehicle Records is available to service advisers and super admins only.',
      })
      return
    }

    setState((current) => ({ ...current, loading: true, error: '' }))

    try {
      const customers = await listAdminCustomers(user.accessToken)
      const vehicles = customers.flatMap((customer) =>
        Array.isArray(customer?.vehicles)
          ? customer.vehicles.map((vehicle) => normalizeVehicleRecord(vehicle, customer))
          : [],
      )

      setState({
        vehicles,
        loading: false,
        error: '',
      })
    } catch (error) {
      setState({
        vehicles: [],
        loading: false,
        error:
          error instanceof ApiError
            ? error.message
            : 'Unable to load live vehicle records right now.',
      })
    }
  }, [canReadVehicles, user?.accessToken])

  useEffect(() => {
    void loadVehicles()
  }, [loadVehicles])

  return {
    vehicles: state.vehicles,
    loading: state.loading,
    error: state.error,
    reload: loadVehicles,
    canReadVehicles,
  }
}
