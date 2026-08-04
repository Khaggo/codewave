import { ApiError } from './authClient'

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3000').replace(/\/$/, '')

async function request(path, { accessToken, body, headers, ...options } = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(headers ?? {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const rawText = await response.text()
  let data = null
  try {
    data = rawText ? JSON.parse(rawText) : null
  } catch {
    data = null
  }

  if (!response.ok) {
    const message = typeof data?.message === 'string'
      ? data.message
      : response.status >= 500
        ? 'The work queue is temporarily unavailable. Retry in a moment.'
        : 'The work queue request could not be completed. Refresh and try again.'
    throw new ApiError(message, response.status, data)
  }

  return data
}

export function listStaffWorkQueue({
  queueType,
  accessToken,
  view = 'team',
  search = '',
  cursor = '',
  limit = 25,
}) {
  const query = new URLSearchParams({
    view,
    limit: String(Math.min(Math.max(limit, 1), 50)),
  })
  if (search.trim()) query.set('search', search.trim())
  if (cursor) query.set('cursor', cursor)

  return request(`/api/staff-work-queues/${queueType}?${query}`, { accessToken })
}

export function updateStaffQueueAvailability({ queueType, available, accessToken }) {
  return request(`/api/staff-work-queues/${queueType}/session`, {
    method: 'PUT',
    accessToken,
    body: { available },
  })
}

export function dispatchStaffWork({ queueType, accessToken }) {
  return request(`/api/staff-work-queues/${queueType}/dispatch`, {
    method: 'POST',
    accessToken,
  })
}

export function claimStaffWork({ queueType, entityType, entityId, accessToken }) {
  return request(`/api/staff-work-queues/${queueType}/claims`, {
    method: 'POST',
    accessToken,
    body: { entityType, entityId },
  })
}

export function listStaffWorkPresence({ queueType, accessToken }) {
  return request(`/api/staff-work-queues/${queueType}/presence`, { accessToken })
}

export function heartbeatStaffWorkClaim({ claimId, accessToken }) {
  return request(`/api/staff-work-queues/claims/${claimId}/heartbeat`, {
    method: 'POST',
    accessToken,
  })
}

export function releaseStaffWorkClaim({ claimId, reason, accessToken }) {
  return request(`/api/staff-work-queues/claims/${claimId}/release`, {
    method: 'POST',
    accessToken,
    body: { reason },
  })
}

export function buildWorkClaimHeaders(claimId) {
  return claimId ? { 'X-Work-Claim-Id': claimId } : {}
}

export function requireWorkClaimHeaders(claimId) {
  const normalizedClaimId = String(claimId ?? '').trim()
  if (!normalizedClaimId) {
    throw new ApiError('Claim this work before making changes.', 409, {
      code: 'WORK_CLAIM_REQUIRED',
    })
  }

  return { 'X-Work-Claim-Id': normalizedClaimId }
}
