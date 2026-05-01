import { ApiError } from './authClient'

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3000').replace(/\/$/, '')

const request = async (path, options = {}) => {
  const { body, headers, ...rest } = options
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(headers ?? {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  const rawText = await response.text()
  const data = rawText ? JSON.parse(rawText) : null

  if (!response.ok) {
    const message =
      data?.message && typeof data.message === 'string'
        ? data.message
        : `Request failed with status ${response.status}`

    throw new ApiError(message, response.status, data)
  }

  return data
}

const withAuthorization = (accessToken) => ({
  Authorization: `Bearer ${accessToken}`,
})

export const listBookingServices = async () => {
  const services = await request('/api/services', { method: 'GET' })
  return Array.isArray(services) ? services : []
}

export const listBookingServiceCategories = async () => {
  const categories = await request('/api/service-categories', { method: 'GET' })
  return Array.isArray(categories) ? categories : []
}

export const createBookingServiceCategory = async ({ name, description }, accessToken) =>
  request('/api/service-categories', {
    method: 'POST',
    headers: withAuthorization(accessToken),
    body: {
      name,
      description: description || undefined,
    },
  })

export const createBookingService = async (payload, accessToken) =>
  request('/api/services', {
    method: 'POST',
    headers: withAuthorization(accessToken),
    body: {
      ...payload,
      categoryId: payload.categoryId || undefined,
      description: payload.description || undefined,
    },
  })
