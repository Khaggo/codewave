import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { ConflictException, ForbiddenException } from '@nestjs/common';

import { InspectionsRepository } from '@main-modules/inspections/repositories/inspections.repository';
import { InspectionsService } from '@main-modules/inspections/services/inspections.service';
import { LoyaltyRepository } from '@main-modules/loyalty/repositories/loyalty.repository';
import { LoyaltyService } from '@main-modules/loyalty/services/loyalty.service';

const intakeData = {
  arrivalType: 'walk_in',
  visitType: 'regular_service',
  reasonForVisits: ['Preventive maintenance'],
  requestedServiceIds: ['service-1'],
  requestedServiceNames: ['Oil change'],
  serviceConcern: 'Routine service',
  currentOdometerKm: 12000,
  customerAcknowledged: true,
  stickerObservation: 'verified_present',
  requirementsChecklist: {
    customerContactConfirmed: true,
    authorizationAcknowledged: true,
    keysHandoffConfirmed: true,
  },
  arrivalInspectionItems: [
    'batteryCondition',
    'engineOilLevel',
    'coolantLevel',
    'tirePressure',
    'allLightsFunctional',
    'brakePedalFeel',
  ].map((key) => ({ key, status: 'ok' })),
};

const pendingInspection = {
  id: 'inspection-1',
  inspectionReference: 'INT-0001',
  vehicleId: 'vehicle-1',
  bookingId: null,
  inspectionType: 'intake',
  status: 'pending',
  version: 1,
  intakeDataVersion: 1,
  intakeData,
  notes: null,
};

const createHarness = (overrides: {
  verifierError?: Error;
  completionError?: Error;
  observationError?: Error;
} = {}) => {
  const state = { completed: false, observations: 0 };
  const tx = { name: 'shared-transaction' };
  const inspectionsRepository = {
    findById: jest.fn().mockResolvedValue(pendingInspection),
    withTransaction: jest.fn(async (work: (executor: unknown) => Promise<unknown>) => {
      const before = { ...state };
      try {
        return await work(tx);
      } catch (error) {
        Object.assign(state, before);
        throw error;
      }
    }),
    completeIntakeDraft: jest.fn(async () => {
      if (overrides.completionError) throw overrides.completionError;
      state.completed = true;
      return { ...pendingInspection, status: 'completed', version: 2, completedAt: new Date() };
    }),
  };
  const loyaltyService = {
    assertCanRecordVehicleStickerObservation: jest.fn(async () => {
      if (overrides.verifierError) throw overrides.verifierError;
    }),
    recordVehicleStickerObservation: jest.fn(async () => {
      if (overrides.observationError) throw overrides.observationError;
      state.observations += 1;
    }),
  };
  const service = new InspectionsService(
    inspectionsRepository as unknown as InspectionsRepository,
    { findById: jest.fn().mockResolvedValue({ id: 'vehicle-1', userId: 'customer-1' }) } as never,
    { findById: jest.fn() } as never,
    {} as never,
    loyaltyService as unknown as LoyaltyService,
  );
  return { inspectionsRepository, loyaltyService, service, state, tx };
};

describe('sticker observation atomic completion', () => {
  it('rolls back completion when observation persistence fails', async () => {
    const harness = createHarness({ observationError: new Error('observation failed') });

    await expect(
      harness.service.completeIntakeDraft('inspection-1', '"1"', {
        userId: 'adviser-1',
        role: 'service_adviser',
      }),
    ).rejects.toThrow('observation failed');

    expect(harness.state).toEqual({ completed: false, observations: 0 });
    expect(harness.inspectionsRepository.completeIntakeDraft).toHaveBeenCalledWith(
      'inspection-1',
      1,
      'adviser-1',
      expect.any(Date),
      harness.tx,
    );
    expect(harness.loyaltyService.recordVehicleStickerObservation).toHaveBeenCalledWith(
      expect.objectContaining({ inspectionId: 'inspection-1', vehicleId: 'vehicle-1' }),
      harness.tx,
      true,
    );
  });

  it('does not write an observation when completion fails', async () => {
    const harness = createHarness({ completionError: new Error('completion failed') });

    await expect(
      harness.service.completeIntakeDraft('inspection-1', '"1"', {
        userId: 'adviser-1',
        role: 'service_adviser',
      }),
    ).rejects.toThrow('completion failed');

    expect(harness.state).toEqual({ completed: false, observations: 0 });
    expect(harness.loyaltyService.recordVehicleStickerObservation).not.toHaveBeenCalled();
  });

  it('prevalidates the verifier and rejects the technician mismatch before a transaction', async () => {
    const harness = createHarness({
      verifierError: new ForbiddenException('Only authenticated intake staff can verify'),
    });

    await expect(
      harness.service.completeIntakeDraft('inspection-1', '"1"', {
        userId: 'technician-1',
        role: 'technician',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(harness.inspectionsRepository.withTransaction).not.toHaveBeenCalled();
  });
});

describe('sticker observation idempotency', () => {
  const payload = {
    vehicleId: 'vehicle-1',
    inspectionId: 'inspection-1',
    intakeReference: 'INT-0001',
    observation: 'not_present' as const,
    verifiedByUserId: 'adviser-1',
    observedAt: new Date('2026-08-11T00:00:00.000Z'),
    reason: 'Sticker not affixed',
  };

  const repositoryWithExisting = (existing: Record<string, unknown>) => {
    const returning = jest.fn().mockResolvedValue([]);
    const db = {
      insert: jest.fn(() => ({
        values: jest.fn(() => ({
          onConflictDoNothing: jest.fn(() => ({ returning })),
        })),
      })),
      query: {
        vehicleStickerObservations: {
          findFirst: jest.fn().mockResolvedValue(existing),
        },
      },
    };
    return new LoyaltyRepository(db as never);
  };

  it('reuses a semantically identical observation retry', async () => {
    const existing = { id: 'observation-1', ...payload, reason: 'Sticker not affixed' };
    await expect(repositoryWithExisting(existing).createVehicleStickerObservation(payload))
      .resolves.toEqual(existing);
  });

  it('rejects a conflicting observation retry', async () => {
    const repository = repositoryWithExisting({
      id: 'observation-1',
      ...payload,
      observation: 'verified_present',
    });
    await expect(repository.createVehicleStickerObservation(payload)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });
});

describe('Track 3 migration', () => {
  it('contains only the required additive sticker objects', () => {
    const sql = readFileSync(
      resolve(__dirname, '../../../drizzle/0008_acoustic_white_tiger.sql'),
      'utf8',
    );
    expect(sql).toContain('CREATE TYPE "public"."vehicle_sticker_observation"');
    expect(sql).toContain('CREATE TABLE "vehicle_sticker_observations"');
    expect(sql).toContain('vehicle_sticker_observations_inspection_idx');
    expect(sql).toContain('vehicle_sticker_observations_vehicle_latest_idx');
    expect(sql.match(/ALTER TABLE/g)).toHaveLength(3);
    expect(sql).not.toMatch(/DROP |TRUNCATE |DELETE FROM|ALTER TABLE "(?!vehicle_sticker_observations)/);
  });
});
