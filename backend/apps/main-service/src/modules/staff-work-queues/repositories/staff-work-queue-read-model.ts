import { sql } from 'drizzle-orm';

import { AppDatabase } from '@shared/db/database.types';

type StaffWorkQueueType = 'job_order' | 'qa';
export type QueueRow = Record<string, unknown>;

export function rowsFromResult(result: unknown): QueueRow[] {
  if (Array.isArray(result)) return result as QueueRow[];
  const rows = (result as { rows?: unknown[] } | null)?.rows;
  return Array.isArray(rows) ? (rows as QueueRow[]) : [];
}

export async function getStaffWorkQueueSummary(
  db: AppDatabase,
  queueType: StaffWorkQueueType,
  actorUserId: string,
) {
  const result = queueType === 'qa'
    ? await db.execute(sql`
        SELECT
           COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE claim.id IS NULL)::int AS unassigned,
           COUNT(*) FILTER (WHERE claim.id IS NOT NULL)::int AS assigned,
           COUNT(*) FILTER (WHERE claim.owner_user_id = ${actorUserId})::int AS mine,
           0::int AS blocked,
           COUNT(*) FILTER (
             WHERE COALESCE(gate.last_audit_completed_at, gate.created_at) <= NOW() - INTERVAL '2 hours'
           )::int AS overdue,
           COALESCE(EXTRACT(EPOCH FROM (NOW() - MIN(COALESCE(gate.last_audit_completed_at, gate.created_at))))::int, 0) AS oldest_wait_seconds
        FROM job_orders job
        JOIN job_order_quality_gates gate ON gate.job_order_id = job.id
        LEFT JOIN staff_work_claims claim
          ON claim.queue_type = 'qa'
          AND claim.entity_type = 'job_order'
          AND claim.entity_id = job.id
          AND claim.status = 'active'
        WHERE job.status = 'ready_for_qa'
          AND gate.reviewer_verdict = 'pending'
          AND gate.pre_check_status IN ('completed', 'unavailable')
      `)
    : await db.execute(sql`
        WITH candidates AS (
          SELECT
            job.id,
            'job_order'::text AS entity_type,
            job.updated_at AS entered_at,
            job.status::text AS status,
            booking.scheduled_date
          FROM job_orders job
          LEFT JOIN bookings booking
            ON job.source_type = 'booking' AND booking.id = job.source_id
          LEFT JOIN job_order_quality_gates gate ON gate.job_order_id = job.id
          WHERE (
            job.status IN ('draft', 'assigned', 'in_progress', 'blocked')
            OR (
              job.status = 'ready_for_qa'
              AND gate.status IN ('passed', 'overridden')
              AND gate.reviewer_verdict = 'passed'
            )
          )
          UNION ALL
          SELECT
            booking.id,
            'booking_handoff'::text AS entity_type,
            booking.updated_at AS entered_at,
            booking.status::text AS status,
            booking.scheduled_date
          FROM bookings booking
          WHERE booking.status IN ('confirmed', 'in_service')
            AND NOT EXISTS (
              SELECT 1 FROM job_orders existing
              WHERE existing.source_type = 'booking' AND existing.source_id = booking.id
            )
        )
        SELECT
           COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE claim.id IS NULL)::int AS unassigned,
           COUNT(*) FILTER (WHERE claim.id IS NOT NULL)::int AS assigned,
           COUNT(*) FILTER (WHERE claim.owner_user_id = ${actorUserId})::int AS mine,
           COUNT(*) FILTER (WHERE candidate.status = 'blocked')::int AS blocked,
           COUNT(*) FILTER (WHERE candidate.scheduled_date < CURRENT_DATE)::int AS overdue,
           COALESCE(EXTRACT(EPOCH FROM (NOW() - MIN(candidate.entered_at)))::int, 0) AS oldest_wait_seconds
        FROM candidates candidate
        LEFT JOIN staff_work_claims claim
          ON claim.queue_type = 'job_order'
          AND claim.entity_type::text = candidate.entity_type
          AND claim.entity_id = candidate.id
          AND claim.status = 'active'
      `);

  const row = rowsFromResult(result)[0] ?? {};
  return {
    total: Number(row.total ?? 0),
    unassigned: Number(row.unassigned ?? 0),
    assigned: Number(row.assigned ?? 0),
    mine: Number(row.mine ?? 0),
    blocked: Number(row.blocked ?? 0),
    overdue: Number(row.overdue ?? 0),
    oldestWaitSeconds: Number(row.oldest_wait_seconds ?? 0),
  };
}

export function mapStaffWorkQueueRow(row: QueueRow, actorUserId: string) {
  const ownerUserId = row.owner_user_id ? String(row.owner_user_id) : null;
  return {
    entityId: String(row.entity_id),
    entityType: String(row.entity_type),
    jobOrderId: row.job_order_id ? String(row.job_order_id) : null,
    bookingId: row.booking_id ? String(row.booking_id) : null,
    reference: String(row.reference ?? ''),
    status: String(row.status ?? ''),
    riskScore: Number(row.risk_score ?? 0),
    blockingReason: row.blocking_reason ? String(row.blocking_reason) : null,
    priorityReason: row.priority_reason ? String(row.priority_reason) : null,
    queueEnteredAt: new Date(String(row.queue_entered_at)).toISOString(),
    customerName: String(row.customer_name ?? '').trim() || null,
    vehicleName: String(row.vehicle_name ?? '').trim() || null,
    plateNumber: row.plate_number ? String(row.plate_number) : null,
    claim: row.claim_id
      ? {
          id: String(row.claim_id),
          ownerUserId,
          ownerName: String(row.owner_name ?? '').trim() || 'Assigned staff',
          leaseExpiresAt: new Date(String(row.lease_expires_at)).toISOString(),
          isMine: ownerUserId === actorUserId,
        }
      : null,
  };
}
