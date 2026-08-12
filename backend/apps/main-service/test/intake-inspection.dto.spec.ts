import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { SaveIntakeInspectionDraftDto } from '@main-modules/inspections/dto/intake-inspection.dto';

describe('SaveIntakeInspectionDraftDto', () => {
  it('accepts and normalizes the redesigned structured intake fields', async () => {
    const dto = plainToInstance(SaveIntakeInspectionDraftDto, {
      intakeData: {
        arrivalType: 'walk_in',
        visitType: 'regular_service',
        reasonForVisits: [' Brake concern ', 'Brake concern'],
        requestedServiceIds: [' svc-1 ', 'svc-1'],
        requestedServiceNames: [' Brake inspection ', 'Brake inspection'],
        customerConcerns: [
          { id: ' concern-1 ', text: ' Brake vibration at speed. ' },
          { id: 'concern-2', text: ' Noise over bumps. ' },
        ],
        arrivalInspectionItems: [
          {
            key: 'brakePedalFeel',
            status: 'issue',
            issue: { location: ' Front pedal ', severity: 'high', notes: ' Soft feel. ' },
          },
        ],
      },
    });

    const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });
    expect(errors).toHaveLength(0);
    expect(dto.intakeData.reasonForVisits).toEqual(['Brake concern']);
    expect(dto.intakeData.requestedServiceIds).toEqual(['svc-1']);
    expect(dto.intakeData.requestedServiceNames).toEqual(['Brake inspection']);
    expect(dto.intakeData.customerConcerns).toEqual([
      { id: 'concern-1', text: 'Brake vibration at speed.' },
      { id: 'concern-2', text: 'Noise over bumps.' },
    ]);
    expect(dto.intakeData.arrivalInspectionItems?.[0].issue).toEqual({
      location: 'Front pedal',
      severity: 'high',
      notes: 'Soft feel.',
    });
  });

  it('rejects more than 10 concerns and concern text beyond 500 characters', async () => {
    const tooMany = plainToInstance(SaveIntakeInspectionDraftDto, {
      intakeData: {
        arrivalType: 'walk_in',
        visitType: 'regular_service',
        customerConcerns: Array.from({ length: 11 }, (_, index) => ({ id: `concern-${index}`, text: 'Concern' })),
      },
    });
    const tooLong = plainToInstance(SaveIntakeInspectionDraftDto, {
      intakeData: {
        arrivalType: 'walk_in',
        visitType: 'regular_service',
        customerConcerns: [{ id: 'concern-1', text: 'x'.repeat(501) }],
      },
    });

    expect(await validate(tooMany.intakeData)).not.toHaveLength(0);
    expect(await validate(tooLong.intakeData)).not.toHaveLength(0);
  });

  it('rejects arrays beyond the documented bounds', async () => {
    const dto = plainToInstance(SaveIntakeInspectionDraftDto, {
      intakeData: {
        arrivalType: 'walk_in',
        visitType: 'regular_service',
        reasonForVisits: Array.from({ length: 9 }, (_, index) => `reason-${index}`),
      },
    });

    const errors = await validate(dto.intakeData);
    expect(errors.flatMap((error) => Object.values(error.constraints ?? {}))).toEqual(
      expect.arrayContaining([expect.stringContaining('must contain no more than 8 elements')]),
    );
  });
});
