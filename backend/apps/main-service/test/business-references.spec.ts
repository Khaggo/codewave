import { UpdateBackJobStatusDto } from '@main-modules/back-jobs/dto/update-back-job-status.dto';
import { UpdateInsuranceInquiryStatusDto } from '@main-modules/insurance/dto/update-insurance-inquiry-status.dto';
import { UpdateInsuranceInquiryWorkflowDto } from '@main-modules/insurance/dto/update-insurance-inquiry-workflow.dto';
import { UpdateJobOrderStatusDto } from '@main-modules/job-orders/dto/update-job-order-status.dto';
import { UpdateJobOrderWorkshopStageDto } from '@main-modules/job-orders/dto/update-job-order-workshop-stage.dto';
import { buildBackJobReadableReference, buildJobOrderReadableReference, REFERENCE_UNAVAILABLE } from '@main-modules/job-orders/services/job-order-reference';
import { UpdateVehicleDto } from '@main-modules/vehicles/dto/update-vehicle.dto';

describe('immutable business references', () => {
  it('never recreates an internal-id or timestamp reference for legacy rows', () => {
    expect(buildBackJobReadableReference({ createdAt: new Date('2026-07-27T10:11:12Z') })).toBeNull();
    expect(buildJobOrderReadableReference({ createdAt: new Date('2026-07-27T10:11:12Z') })).toBe(
      REFERENCE_UNAVAILABLE,
    );
  });

  it('does not expose reference fields through normal update DTOs', () => {
    const updateDtos = [
      new UpdateVehicleDto(),
      new UpdateJobOrderStatusDto(),
      new UpdateJobOrderWorkshopStageDto(),
      new UpdateInsuranceInquiryStatusDto(),
      new UpdateInsuranceInquiryWorkflowDto(),
      new UpdateBackJobStatusDto(),
    ];

    for (const dto of updateDtos) {
      expect(Object.prototype.hasOwnProperty.call(dto, 'publicReference')).toBe(false);
      expect(Object.prototype.hasOwnProperty.call(dto, 'jobOrderReference')).toBe(false);
      expect(Object.prototype.hasOwnProperty.call(dto, 'inquiryReference')).toBe(false);
      expect(Object.prototype.hasOwnProperty.call(dto, 'backJobReference')).toBe(false);
    }
  });
});
