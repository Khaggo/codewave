import { ApiError } from './authClient'

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3000').replace(/\/$/, '')

const request = async (path, { accessToken, method = 'GET' } = {}) => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
  })
  const raw = await response.text()
  const data = raw ? JSON.parse(raw) : null

  if (!response.ok) {
    const message = Array.isArray(data?.message)
      ? data.message.join(' ')
      : data?.message || `Notification request failed with status ${response.status}`
    throw new ApiError(message, response.status, data)
  }

  return data
}

export const listStaffNotifications = ({ userId, accessToken }) =>
  request(`/api/users/${encodeURIComponent(userId)}/notifications`, { accessToken })

export const markStaffNotificationRead = ({ userId, notificationId, accessToken }) =>
  request(
    `/api/users/${encodeURIComponent(userId)}/notifications/${encodeURIComponent(notificationId)}/read`,
    { accessToken, method: 'PATCH' },
  )

export const markAllStaffNotificationsRead = ({ userId, accessToken }) =>
  request(`/api/users/${encodeURIComponent(userId)}/notifications/read-all`, {
    accessToken,
    method: 'POST',
  })

export const archiveStaffNotification = ({ userId, notificationId, accessToken }) =>
  request(
    `/api/users/${encodeURIComponent(userId)}/notifications/${encodeURIComponent(notificationId)}/archive`,
    { accessToken, method: 'PATCH' },
  )

export const archiveAllReadStaffNotifications = ({ userId, accessToken }) =>
  request(`/api/users/${encodeURIComponent(userId)}/notifications/archive-all-read`, {
    accessToken,
    method: 'POST',
  })
