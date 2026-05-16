import { randomUUID } from 'crypto';
import { existsSync, readFileSync } from 'fs';
import path from 'path';
import * as bcrypt from 'bcrypt';
import { Client } from 'pg';

import {
  buildInsuranceDemoSummary,
  DEMO_INSURANCE_PASSWORD,
  DEMO_INSURANCE_SCENARIOS,
  DEMO_INSURANCE_TAG,
  type DemoInsuranceInquiry,
  type DemoInsuranceScenario,
} from './lib/insurance-demo-seed-data';
import {
  applyEnvLayer,
  canReuseSeedVehicle,
  findStaleDemoEmails,
  isSeedOwnedText,
  parseEnvFileContents,
} from './lib/insurance-demo-seed-runtime';

type SeededAccount = {
  id: string;
  email: string;
};

type SeededVehicle = {
  id: string;
  label: string;
};

type SeededInquiry = {
  id: string;
  status: string;
  subject: string;
};

type NotificationSeed = {
  inquiryId: string;
  userId: string;
  title: string;
  message: string;
  dedupeKey: string;
  createdAt: Date;
};

const backendRoot = path.resolve(__dirname, '..');
const demoStaffEmail = 'demo.insurance.staff@example.com';
const demoStaffCode = 'DEMO-INS-SA';
const workflowNotificationCopyByKey = {
  'missing-documents': {
    title: 'Missing documents',
    message: 'Please upload the required insurance documents so we can continue your request.',
  },
  'payment-follow-up': {
    title: 'Payment pending',
    message: 'Your insurance request now needs payment action.',
  },
  'overdue-payment': {
    title: 'Payment overdue',
    message:
      'Your insurance request is overdue for payment. Upload proof after payment or contact staff for help.',
  },
  'renewal-workflow-upcoming': {
    title: 'Renewal follow-up',
    message: 'Your insurance renewal is coming up. Open your insurance request for the next step.',
  },
  'renewal-workflow-awaiting-customer': {
    title: 'Renewal waiting for you',
    message: 'Your insurance renewal needs your response to continue.',
  },
} as const;
const manualReminderCopyByType = {
  missing_documents: {
    title: 'Missing documents',
    message: 'Please upload the required insurance documents so we can continue your request.',
  },
  payment_pending: {
    title: 'Payment pending',
    message: 'Your insurance request now needs payment action.',
  },
  overdue_payment: {
    title: 'Payment overdue',
    message:
      'Your insurance request is overdue for payment. Upload proof after payment or contact staff for help.',
  },
  renewal_follow_up: {
    title: 'Renewal follow-up',
    message: 'Your insurance renewal is coming up. Open your insurance request for the next step.',
  },
} as const;

function loadEnvFile(filePath: string) {
  if (!existsSync(filePath)) {
    return {};
  }

  return parseEnvFileContents(readFileSync(filePath, 'utf8'));
}

function buildSeedVehicleNotes(scenario: DemoInsuranceScenario) {
  return `${DEMO_INSURANCE_TAG} | ${scenario.label}`;
}

function timestampFor(day: string, hour: number, minute = 0) {
  return new Date(`${day}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00+08:00`);
}

function maybeTimestampFor(day: string | undefined, hour: number, minute = 0) {
  if (!day) {
    return null;
  }

  return timestampFor(day, hour, minute);
}

function formatPlateNumber(plateNumber: string) {
  const letters = plateNumber.match(/[A-Z]+/g)?.join(' ') ?? plateNumber;
  const numbers = plateNumber.match(/\d+/g)?.join(' ') ?? '';
  return numbers ? `${letters} ${numbers}` : letters;
}

function buildVehicleLabel(scenario: DemoInsuranceScenario) {
  return `${scenario.vehicle.year} ${scenario.vehicle.make} ${scenario.vehicle.model} - ${formatPlateNumber(
    scenario.vehicle.plateNumber,
  )}`;
}

async function upsertUser(
  client: Client,
  passwordHash: string,
  input: {
    email: string;
    firstName: string;
    lastName: string;
    role: 'customer' | 'service_adviser';
    staffCode?: string | null;
    phone?: string | null;
  },
) {
  const userResult = await client.query<{ id: string; email: string }>(
    `
      insert into users (email, role, staff_code, is_active, deleted_email, deleted_at, updated_at)
      values ($1, $2, $3, true, null, null, now())
      on conflict (email)
      do update set
        role = excluded.role,
        staff_code = excluded.staff_code,
        is_active = true,
        deleted_email = null,
        deleted_at = null,
        updated_at = now()
      returning id, email
    `,
    [input.email, input.role, input.staffCode ?? null],
  );
  const user = userResult.rows[0];

  await client.query(
    `
      insert into user_profiles (user_id, first_name, last_name, phone)
      values ($1, $2, $3, $4)
      on conflict (user_id)
      do update set
        first_name = excluded.first_name,
        last_name = excluded.last_name,
        phone = excluded.phone,
        updated_at = now()
    `,
    [user.id, input.firstName, input.lastName, input.phone ?? null],
  );

  await client.query(
    `
      insert into auth_accounts (user_id, password_hash, is_active)
      values ($1, $2, true)
      on conflict (user_id)
      do update set
        password_hash = excluded.password_hash,
        is_active = true,
        updated_at = now()
    `,
    [user.id, passwordHash],
  );

  if (input.role === 'customer') {
    await client.query(
      `
        insert into notification_preferences (
          user_id,
          email_enabled,
          booking_reminders_enabled,
          insurance_updates_enabled,
          invoice_reminders_enabled,
          service_follow_up_enabled
        )
        values ($1, true, true, true, true, true)
        on conflict (user_id)
        do update set
          email_enabled = true,
          booking_reminders_enabled = true,
          insurance_updates_enabled = true,
          invoice_reminders_enabled = true,
          service_follow_up_enabled = true,
          updated_at = now()
      `,
      [user.id],
    );
  }

  return user;
}

async function upsertVehicle(client: Client, userId: string, scenario: DemoInsuranceScenario) {
  const seedVehicleNotes = buildSeedVehicleNotes(scenario);
  const existingVehicleResult = await client.query<{ id: string; notes: string | null }>(
    `
      select id, notes
      from vehicles
      where plate_number = $1
    `,
    [scenario.vehicle.plateNumber],
  );
  const existingVehicle = existingVehicleResult.rows[0];

  if (!existingVehicle) {
    const vehicleResult = await client.query<{ id: string }>(
      `
        insert into vehicles (
          user_id,
          plate_number,
          make,
          model,
          year,
          color,
          notes,
          updated_at
        )
        values ($1, $2, $3, $4, $5, $6, $7, now())
        returning id
      `,
      [
        userId,
        scenario.vehicle.plateNumber,
        scenario.vehicle.make,
        scenario.vehicle.model,
        scenario.vehicle.year,
        scenario.vehicle.color,
        seedVehicleNotes,
      ],
    );

    return {
      id: vehicleResult.rows[0].id,
      label: buildVehicleLabel(scenario),
    };
  }

  if (!canReuseSeedVehicle(existingVehicle.notes, DEMO_INSURANCE_TAG)) {
    throw new Error(
      `Vehicle plate ${scenario.vehicle.plateNumber} already belongs to a non-demo row. Refusing to overwrite local data.`,
    );
  }

  const vehicleResult = await client.query<{ id: string }>(
    `
      update vehicles
      set
        user_id = $2,
        make = $3,
        model = $4,
        year = $5,
        color = $6,
        notes = $7,
        updated_at = now()
      where id = $1
      returning id
    `,
    [
      existingVehicle.id,
      userId,
      scenario.vehicle.make,
      scenario.vehicle.model,
      scenario.vehicle.year,
      scenario.vehicle.color,
      seedVehicleNotes,
    ],
  );

  return {
    id: vehicleResult.rows[0].id,
    label: buildVehicleLabel(scenario),
  };
}

async function insertActivity(
  client: Client,
  input: {
    inquiryId: string;
    action: string;
    actorUserId?: string | null;
    documentType?: string | null;
    notes?: string | null;
    createdAt: Date;
  },
) {
  await client.query(
    `
      insert into insurance_activities (
        inquiry_id,
        action,
        actor_user_id,
        document_type,
        notes,
        created_at,
        updated_at
      )
      values ($1, $2, $3, $4, $5, $6, $6)
    `,
    [
      input.inquiryId,
      input.action,
      input.actorUserId ?? null,
      input.documentType ?? null,
      input.notes ?? null,
      input.createdAt,
    ],
  );
}

async function insertDocument(
  client: Client,
  input: {
    inquiryId: string;
    uploadedByUserId: string;
    documentType: string;
    fileName: string;
    fileUrl: string;
    notes: string;
    createdAt: Date;
  },
) {
  await client.query(
    `
      insert into insurance_documents (
        inquiry_id,
        file_name,
        file_url,
        document_type,
        notes,
        uploaded_by_user_id,
        created_at,
        updated_at
      )
      values ($1, $2, $3, $4, $5, $6, $7, $7)
    `,
    [
      input.inquiryId,
      input.fileName,
      input.fileUrl,
      input.documentType,
      input.notes,
      input.uploadedByUserId,
      input.createdAt,
    ],
  );

  await insertActivity(client, {
    inquiryId: input.inquiryId,
    action: 'document_uploaded',
    actorUserId: input.uploadedByUserId,
    documentType: input.documentType,
    notes: input.notes,
    createdAt: new Date(input.createdAt.getTime() + 5 * 60 * 1000),
  });
}

async function insertInsuranceUpdateNotification(
  client: Client,
  notification: NotificationSeed,
) {
  const notificationId = randomUUID();

  await client.query(
    `
      insert into notifications (
        id,
        user_id,
        category,
        channel,
        source_type,
        source_id,
        title,
        message,
        status,
        dedupe_key,
        delivered_at,
        created_at,
        updated_at
      )
      values (
        $1,
        $2,
        'insurance_update',
        'in_app',
        'insurance_inquiry',
        $3,
        $4,
        $5,
        'sent',
        $6,
        $7,
        $7,
        $7
      )
    `,
    [
      notificationId,
      notification.userId,
      notification.inquiryId,
      notification.title,
      notification.message,
      notification.dedupeKey,
      notification.createdAt,
    ],
  );

  await client.query(
    `
      insert into notification_delivery_attempts (
        notification_id,
        attempt_number,
        status,
        provider_message_id,
        attempted_at
      )
      values ($1, 1, 'sent', 'in_app', $2)
    `,
    [notificationId, notification.createdAt],
  );
}

async function upsertInsuranceRecord(
  client: Client,
  input: {
    inquiryId: string;
    userId: string;
    vehicleId: string;
    inquiryType: DemoInsuranceInquiry['inquiryType'];
    providerName?: string;
    policyNumber?: string;
    status: string;
    createdAt: Date;
  },
) {
  await client.query(
    `
      insert into insurance_records (
        inquiry_id,
        user_id,
        vehicle_id,
        inquiry_type,
        provider_name,
        policy_number,
        status,
        created_at,
        updated_at
      )
      values ($1, $2, $3, $4, $5, $6, $7, $8, $8)
      on conflict (inquiry_id)
      do update set
        user_id = excluded.user_id,
        vehicle_id = excluded.vehicle_id,
        inquiry_type = excluded.inquiry_type,
        provider_name = excluded.provider_name,
        policy_number = excluded.policy_number,
        status = excluded.status,
        updated_at = excluded.updated_at
    `,
    [
      input.inquiryId,
      input.userId,
      input.vehicleId,
      input.inquiryType,
      input.providerName ?? null,
      input.policyNumber ?? null,
      input.status,
      input.createdAt,
    ],
  );
}

function buildScenarioBaseDate(index: number) {
  return timestampFor(`2026-05-${String(7 + index).padStart(2, '0')}`, 9);
}

function buildNotificationSummaryNote(inquiries: SeededInquiry[]) {
  return `Main inquiries: ${inquiries.map((inquiry) => `${inquiry.id} (${inquiry.status})`).join(', ')}`;
}

async function insertInquiry(
  client: Client,
  input: {
    scenario: DemoInsuranceScenario;
    inquiry: DemoInsuranceInquiry;
    customerId: string;
    vehicleId: string;
    createdByUserId: string;
    assignedStaffId: string;
    reviewedByUserId: string;
    createdAt: Date;
    updatedAt: Date;
  },
) {
  const inquiryId = randomUUID();
  const reviewedAt =
    input.inquiry.status === 'submitted' && input.inquiry.documentStatus !== 'under_verification'
      ? null
      : input.updatedAt;

  await client.query(
    `
      insert into insurance_inquiries (
        id,
        user_id,
        vehicle_id,
        inquiry_type,
        purpose,
        subject,
        description,
        provider_name,
        policy_number,
        notes,
        status,
        document_status,
        payment_status,
        renewal_status,
        assigned_staff_id,
        payment_due_at,
        policy_expiry_at,
        renewal_due_at,
        review_notes,
        created_by_user_id,
        reviewed_by_user_id,
        reviewed_at,
        created_at,
        updated_at
      )
      values (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        $8,
        $9,
        $10,
        $11,
        $12,
        $13,
        $14,
        $15,
        $16,
        $17,
        $18,
        $19,
        $20,
        $21,
        $22,
        $23,
        $24
      )
    `,
    [
      inquiryId,
      input.customerId,
      input.vehicleId,
      input.inquiry.inquiryType,
      input.inquiry.purpose ?? 'quotation',
      input.inquiry.subject,
      input.inquiry.description,
      input.inquiry.providerName ?? null,
      input.inquiry.policyNumber ?? null,
      `${DEMO_INSURANCE_TAG} | ${input.scenario.key}`,
      input.inquiry.status,
      input.inquiry.documentStatus ?? 'incomplete',
      input.inquiry.paymentStatus ?? 'not_required',
      input.inquiry.renewalStatus ?? 'not_applicable',
      input.assignedStaffId,
      maybeTimestampFor(input.inquiry.paymentDueLabel, 10),
      maybeTimestampFor(input.inquiry.policyExpiryLabel, 11),
      'renewalDueLabel' in input.inquiry ? maybeTimestampFor(input.inquiry.renewalDueLabel, 9) : null,
      `${input.scenario.notes} [${DEMO_INSURANCE_TAG}]`,
      input.createdByUserId,
      reviewedAt ? input.reviewedByUserId : null,
      reviewedAt,
      input.createdAt,
      input.updatedAt,
    ],
  );

  await insertActivity(client, {
    inquiryId,
    action: 'inquiry_created',
    actorUserId: input.createdByUserId,
    notes: `${input.inquiry.subject} [${DEMO_INSURANCE_TAG}]`,
    createdAt: input.createdAt,
  });

  if (input.inquiry.status === 'under_review') {
    await insertActivity(client, {
      inquiryId,
      action: 'status_set_under_review',
      actorUserId: input.reviewedByUserId,
      notes: 'Customer submission is now under adviser review.',
      createdAt: new Date(input.createdAt.getTime() + 30 * 60 * 1000),
    });
  }

  if (input.inquiry.paymentDueLabel) {
    await insertActivity(client, {
      inquiryId,
      action: 'payment_due_date_updated',
      actorUserId: input.reviewedByUserId,
      notes: input.inquiry.paymentDueLabel,
      createdAt: new Date(input.updatedAt.getTime() - 15 * 60 * 1000),
    });
  }

  if (input.inquiry.paymentStatus === 'overdue') {
    await insertActivity(client, {
      inquiryId,
      action: 'payment_marked_overdue',
      actorUserId: input.reviewedByUserId,
      notes: `${DEMO_INSURANCE_TAG} overdue reminder seed`,
      createdAt: input.updatedAt,
    });
  }

  if ('renewalDueLabel' in input.inquiry && input.inquiry.renewalDueLabel) {
    await insertActivity(client, {
      inquiryId,
      action: 'renewal_follow_up_created',
      actorUserId: input.reviewedByUserId,
      notes: input.inquiry.renewalDueLabel,
      createdAt: new Date(input.createdAt.getTime() + 20 * 60 * 1000),
    });
  }

  if (input.inquiry.renewalStatus === 'awaiting_customer') {
    await insertActivity(client, {
      inquiryId,
      action: 'renewal_awaiting_customer',
      actorUserId: input.reviewedByUserId,
      notes: 'Renewal quotation already shared with customer.',
      createdAt: input.updatedAt,
    });
  }

  if (input.inquiry.status === 'closed' || input.inquiry.status === 'active') {
    await upsertInsuranceRecord(client, {
      inquiryId,
      userId: input.customerId,
      vehicleId: input.vehicleId,
      inquiryType: input.inquiry.inquiryType,
      providerName: input.inquiry.providerName,
      policyNumber: input.inquiry.policyNumber,
      status: input.inquiry.status,
      createdAt: input.updatedAt,
    });
  }

  return {
    id: inquiryId,
    status: input.inquiry.status,
    subject: input.inquiry.subject,
  };
}

async function seedScenario(
  client: Client,
  passwordHash: string,
  scenario: DemoInsuranceScenario,
  scenarioIndex: number,
  staffAccount: SeededAccount,
) {
  const customer = await upsertUser(client, passwordHash, {
    email: scenario.customerEmail,
    firstName: scenario.customerFirstName,
    lastName: scenario.customerLastName,
    role: 'customer',
    phone: `+63917${String(4100000 + scenarioIndex).padStart(7, '0')}`,
  });
  const vehicle = await upsertVehicle(client, customer.id, scenario);
  const baseDate = buildScenarioBaseDate(scenarioIndex);
  const seededInquiries: SeededInquiry[] = [];

  for (const [inquiryIndex, inquiry] of scenario.inquiries.entries()) {
    const createdAt = new Date(baseDate.getTime() + inquiryIndex * 2 * 60 * 60 * 1000);
    const updatedAt = new Date(createdAt.getTime() + 75 * 60 * 1000);
    const seededInquiry = await insertInquiry(client, {
      scenario,
      inquiry,
      customerId: customer.id,
      vehicleId: vehicle.id,
      createdByUserId: customer.id,
      assignedStaffId: staffAccount.id,
      reviewedByUserId: staffAccount.id,
      createdAt,
      updatedAt,
    });
    seededInquiries.push(seededInquiry);
  }

  await seedScenarioDocuments(client, scenario, customer.id, seededInquiries);
  await seedScenarioNotifications(client, scenario, customer.id, seededInquiries, staffAccount.id);

  return {
    customer,
    vehicle,
    inquiries: seededInquiries,
  };
}

async function seedScenarioDocuments(
  client: Client,
  scenario: DemoInsuranceScenario,
  customerId: string,
  seededInquiries: SeededInquiry[],
) {
  const inquiryBySubject = new Map(seededInquiries.map((inquiry) => [inquiry.subject, inquiry]));
  const docBaseDate = buildScenarioBaseDate(
    DEMO_INSURANCE_SCENARIOS.findIndex((candidate) => candidate.key === scenario.key),
  );

  const addDocument = async (
    subject: string,
    documentType: string,
    fileName: string,
    notes: string,
    hoursAfterBase: number,
  ) => {
    const inquiry = inquiryBySubject.get(subject);
    if (!inquiry) {
      return;
    }

    await insertDocument(client, {
      inquiryId: inquiry.id,
      uploadedByUserId: customerId,
      documentType,
      fileName,
      fileUrl: `https://demo.local/${inquiry.id}/${fileName}`,
      notes: `${notes} [${DEMO_INSURANCE_TAG}]`,
      createdAt: new Date(docBaseDate.getTime() + hoursAfterBase * 60 * 60 * 1000),
    });
  };

  if (scenario.key === 'review-queue') {
    await addDocument('DEMO_INS_review_under_review', 'or_cr', 'review-under-review-orcr.pdf', 'Submitted OR/CR copy.', 3);
    await addDocument('DEMO_INS_review_under_review', 'valid_id', 'review-under-review-id.pdf', 'Submitted valid ID.', 3.5);
  }

  if (scenario.key === 'missing-documents') {
    await addDocument('DEMO_INS_documents_missing', 'or_cr', 'missing-documents-orcr.pdf', 'OR/CR uploaded, valid ID still pending.', 2);
  }

  if (scenario.key === 'payment-follow-up') {
    await addDocument(
      'DEMO_INS_payment_proof_submitted',
      'proof_of_payment',
      'payment-proof-submitted.jpg',
      'Customer uploaded proof of payment for staff verification.',
      5,
    );
  }

  if (scenario.key === 'renewal-workflow') {
    await addDocument('DEMO_INS_renewal_due', 'policy', 'renewal-due-policy.pdf', 'Previous policy copy for renewal reference.', 2);
    await addDocument(
      'DEMO_INS_renewal_awaiting_customer',
      'policy',
      'renewal-awaiting-customer-policy.pdf',
      'Renewal quotation packet acknowledged by staff.',
      4,
    );
  }

  if (scenario.key === 'completed-history') {
    await addDocument('DEMO_INS_history_closed', 'policy', 'history-closed-policy.pdf', 'Issued policy document for completed insurance record.', 2);
  }
}

async function seedScenarioNotifications(
  client: Client,
  scenario: DemoInsuranceScenario,
  customerId: string,
  seededInquiries: SeededInquiry[],
  staffUserId: string,
) {
  const inquiryBySubject = new Map(seededInquiries.map((inquiry) => [inquiry.subject, inquiry]));
  const baseDate = buildScenarioBaseDate(
    DEMO_INSURANCE_SCENARIOS.findIndex((candidate) => candidate.key === scenario.key),
  );

  const addNotification = async (
    subject: string,
    notification: { title: string; message: string; dedupeKey: string; createdAt: Date },
  ) => {
    const inquiry = inquiryBySubject.get(subject);
    if (!inquiry) {
      return;
    }

    await insertInsuranceUpdateNotification(client, {
      inquiryId: inquiry.id,
      userId: customerId,
      title: notification.title,
      message: notification.message,
      dedupeKey: notification.dedupeKey,
      createdAt: notification.createdAt,
    });
  };

  const addManualReminder = async (
    subject: string,
    reminderType: keyof typeof manualReminderCopyByType,
    hoursAfterBase: number,
  ) => {
    const inquiry = inquiryBySubject.get(subject);
    if (!inquiry) {
      return;
    }

    const createdAt = new Date(baseDate.getTime() + hoursAfterBase * 60 * 60 * 1000);
    const copy = manualReminderCopyByType[reminderType];

    await insertInsuranceUpdateNotification(client, {
      inquiryId: inquiry.id,
      userId: customerId,
      title: copy.title,
      message: copy.message,
      dedupeKey: `notification:insurance.manual:${inquiry.id}:${reminderType}:${createdAt.toISOString()}`,
      createdAt,
    });

    await insertActivity(client, {
      inquiryId: inquiry.id,
      action: 'manual_reminder_sent',
      actorUserId: staffUserId,
      notes: reminderType,
      createdAt,
    });
  };

  const addBroadcast = async (subject: string, title: string, message: string, hoursAfterBase: number) => {
    const inquiry = inquiryBySubject.get(subject);
    if (!inquiry) {
      return;
    }

    const createdAt = new Date(baseDate.getTime() + hoursAfterBase * 60 * 60 * 1000);

    await insertInsuranceUpdateNotification(client, {
      inquiryId: inquiry.id,
      userId: customerId,
      title,
      message,
      dedupeKey: `notification:insurance.broadcast:${inquiry.id}:${createdAt.toISOString()}`,
      createdAt,
    });

    await insertActivity(client, {
      inquiryId: inquiry.id,
      action: 'manual_broadcast_sent',
      actorUserId: staffUserId,
      notes: title,
      createdAt,
    });
  };

  if (scenario.key === 'missing-documents') {
    const copy = workflowNotificationCopyByKey['missing-documents'];
    await addNotification('DEMO_INS_documents_missing', {
      ...copy,
      dedupeKey: `notification:insurance.reminder:DEMO_INS_documents_missing:needs_documents:${baseDate.toISOString()}`,
      createdAt: new Date(baseDate.getTime() + 3 * 60 * 60 * 1000),
    });
    await addManualReminder('DEMO_INS_documents_missing', 'missing_documents', 8);
  }

  if (scenario.key === 'payment-follow-up') {
    const copy = workflowNotificationCopyByKey['payment-follow-up'];
    await addNotification('DEMO_INS_payment_unpaid', {
      ...copy,
      dedupeKey: `notification:insurance.reminder:DEMO_INS_payment_unpaid:payment_pending:${baseDate.toISOString()}`,
      createdAt: new Date(baseDate.getTime() + 4 * 60 * 60 * 1000),
    });
    await addManualReminder('DEMO_INS_payment_proof_submitted', 'payment_pending', 9);
    await addBroadcast(
      'DEMO_INS_payment_unpaid',
      'Premium follow-up update',
      'Collections is ready to assist once payment proof is available.',
      10,
    );
  }

  if (scenario.key === 'overdue-payment') {
    const copy = workflowNotificationCopyByKey['overdue-payment'];
    await addNotification('DEMO_INS_payment_overdue', {
      ...copy,
      dedupeKey: `notification:insurance.reminder:DEMO_INS_payment_overdue:payment_overdue:${baseDate.toISOString()}`,
      createdAt: new Date(baseDate.getTime() + 4 * 60 * 60 * 1000),
    });
    await addManualReminder('DEMO_INS_payment_overdue', 'overdue_payment', 8);
  }

  if (scenario.key === 'renewal-workflow') {
    const upcomingCopy = workflowNotificationCopyByKey['renewal-workflow-upcoming'];
    const awaitingCopy = workflowNotificationCopyByKey['renewal-workflow-awaiting-customer'];
    await addNotification('DEMO_INS_renewal_due', {
      ...upcomingCopy,
      dedupeKey: `notification:insurance.reminder:DEMO_INS_renewal_due:for_renewal:${baseDate.toISOString()}`,
      createdAt: new Date(baseDate.getTime() + 2.5 * 60 * 60 * 1000),
    });
    await addNotification('DEMO_INS_renewal_awaiting_customer', {
      ...awaitingCopy,
      dedupeKey: `notification:insurance.reminder:DEMO_INS_renewal_awaiting_customer:renewal_awaiting_customer:${baseDate.toISOString()}`,
      createdAt: new Date(baseDate.getTime() + 5 * 60 * 60 * 1000),
    });
    await addManualReminder('DEMO_INS_renewal_awaiting_customer', 'renewal_follow_up', 9);
    await addBroadcast(
      'DEMO_INS_renewal_due',
      'Renewal season advisory',
      'Renewal quotes are ready for customers whose policies expire this month.',
      10,
    );
  }

  if (scenario.key === 'review-queue') {
    await addBroadcast(
      'DEMO_INS_review_under_review',
      'Insurance queue update',
      'Your request is in the active review queue and an adviser may contact you for clarifications.',
      7,
    );
  }
}

async function deleteExistingDemoData(client: Client) {
  const activeDemoEmails = new Set(
    [...DEMO_INSURANCE_SCENARIOS.map((scenario) => scenario.customerEmail), demoStaffEmail].map((email) =>
      email.trim().toLowerCase(),
    ),
  );
  const demoSubjects = DEMO_INSURANCE_SCENARIOS.flatMap((scenario) =>
    scenario.inquiries.map((inquiry) => inquiry.subject),
  );

  const inquiryIdResult = await client.query<{ id: string }>(
    `
      select id
      from insurance_inquiries
      where notes ilike $1
        or subject = any($2::varchar[])
    `,
    [`%${DEMO_INSURANCE_TAG}%`, demoSubjects],
  );
  const inquiryIds = inquiryIdResult.rows.map((row) => row.id);

  const vehicleIdResult = await client.query<{ id: string }>(
    `
      select id
      from vehicles
      where notes ilike $1
    `,
    [`%${DEMO_INSURANCE_TAG}%`],
  );
  const vehicleIds = vehicleIdResult.rows.map((row) => row.id);

  if (inquiryIds.length > 0) {
    await client.query(
      `
        delete from notification_delivery_attempts
        where notification_id in (
          select id
          from notifications
          where source_type = 'insurance_inquiry'
            and source_id = any($1::varchar[])
        )
      `,
      [inquiryIds],
    );

    await client.query(
      `
        delete from notifications
        where source_type = 'insurance_inquiry'
          and source_id = any($1::varchar[])
      `,
      [inquiryIds],
    );

    await client.query(
      `
        delete from insurance_activities
        where inquiry_id = any($1::uuid[])
      `,
      [inquiryIds],
    );

    await client.query(
      `
        delete from insurance_records
        where inquiry_id = any($1::uuid[])
      `,
      [inquiryIds],
    );

    await client.query(
      `
        delete from insurance_documents
        where inquiry_id = any($1::uuid[])
      `,
      [inquiryIds],
    );

    await client.query(
      `
        delete from reminder_rules
        where source_type = 'insurance_inquiry'
          and source_id = any($1::varchar[])
      `,
      [inquiryIds],
    );

    await client.query(
      `
        delete from insurance_inquiries
        where id = any($1::uuid[])
      `,
      [inquiryIds],
    );
  }

  if (vehicleIds.length > 0) {
    await client.query(
      `
        delete from vehicles
        where id = any($1::uuid[])
      `,
      [vehicleIds],
    );
  }

  const reservedDemoEmailResult = await client.query<{ id: string; email: string }>(
    `
      select id, email
      from users
      where lower(email) like 'demo.insurance.%@example.com'
    `,
  );
  const staleDemoEmails = new Set(
    findStaleDemoEmails(
      reservedDemoEmailResult.rows.map((row) => row.email),
      activeDemoEmails,
    ),
  );
  const staleDemoUsers = reservedDemoEmailResult.rows.filter((row) =>
    staleDemoEmails.has(row.email.trim().toLowerCase()),
  );

  for (const staleDemoUser of staleDemoUsers) {
    const blockerCountResult = await client.query<{ count: string }>(
      `
        select (
          (select count(*) from vehicles where user_id = $1) +
          (select count(*) from insurance_inquiries where user_id = $1) +
          (select count(*) from notifications where user_id = $1) +
          (select count(*) from reminder_rules where user_id = $1)
        )::text as count
      `,
      [staleDemoUser.id],
    );
    const blockerCount = Number(blockerCountResult.rows[0]?.count ?? '0');

    if (blockerCount > 0) {
      continue;
    }

    await client.query(
      `
        delete from auth_accounts
        where user_id = $1
      `,
      [staleDemoUser.id],
    );

    await client.query(
      `
        delete from user_profiles
        where user_id = $1
      `,
      [staleDemoUser.id],
    );

    await client.query(
      `
        delete from notification_preferences
        where user_id = $1
      `,
      [staleDemoUser.id],
    );

    await client.query(
      `
        delete from auth_otp_challenges
        where user_id = $1
      `,
      [staleDemoUser.id],
    );

    await client.query(
      `
        delete from refresh_tokens
        where user_id = $1
      `,
      [staleDemoUser.id],
    );

    await client.query(
      `
        delete from auth_google_identities
        where user_id = $1
      `,
      [staleDemoUser.id],
    );

    await client.query(
      `
        delete from users
        where id = $1
      `,
      [staleDemoUser.id],
    );
  }
}

async function main() {
  const exampleLoadedKeys = applyEnvLayer(
    process.env,
    loadEnvFile(path.join(backendRoot, '.env.example')),
  );
  applyEnvLayer(process.env, loadEnvFile(path.join(backendRoot, '.env')), {
    overwriteKeys: exampleLoadedKeys,
  });

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required to seed the insurance demo dataset.');
  }

  const client = new Client({ connectionString: databaseUrl });
  const passwordHash = await bcrypt.hash(DEMO_INSURANCE_PASSWORD, 10);

  await client.connect();

  try {
    await client.query('begin');

    await deleteExistingDemoData(client);

    const staffAccount = await upsertUser(client, passwordHash, {
      email: demoStaffEmail,
      firstName: 'Iris',
      lastName: 'Santiago',
      role: 'service_adviser',
      staffCode: demoStaffCode,
      phone: '+639179900001',
    });

    const seededResults = [];
    for (const [scenarioIndex, scenario] of DEMO_INSURANCE_SCENARIOS.entries()) {
      seededResults.push(await seedScenario(client, passwordHash, scenario, scenarioIndex, staffAccount));
    }

    await client.query('commit');

    const summary = buildInsuranceDemoSummary(
      seededResults.map((result, index) => ({
        email: result.customer.email,
        password: DEMO_INSURANCE_PASSWORD,
        vehicleLabel: result.vehicle.label,
        scenarioLabel: DEMO_INSURANCE_SCENARIOS[index].label,
        notes: `${DEMO_INSURANCE_SCENARIOS[index].notes} ${buildNotificationSummaryNote(result.inquiries)}`,
        inquiryStatuses: result.inquiries.map((inquiry) => inquiry.status),
      })),
    );

    console.log(
      [
        'Insurance demo seed complete.',
        `Tag: ${DEMO_INSURANCE_TAG}`,
        `Staff: ${demoStaffEmail} / ${DEMO_INSURANCE_PASSWORD}`,
        `Customers: ${seededResults.length}`,
        `Inquiries: ${seededResults.reduce((sum, result) => sum + result.inquiries.length, 0)}`,
        '',
        summary,
      ].join('\n'),
    );
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    await client.end();
  }
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
