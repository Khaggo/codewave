import { InsuranceRepository } from '../../src/modules/insurance/repositories/insurance.repository';
import { createMainServiceTestApp } from './main-service-test-app';

type TestApp = Awaited<ReturnType<typeof createMainServiceTestApp>>['app'];

export function seedInsuranceInquiryWorkflowState(
  app: TestApp,
  inquiryId: string,
  patch: Record<string, unknown>,
) {
  const insuranceRepository = app.get(InsuranceRepository) as {
    inquiries?: Map<string, Record<string, unknown>>;
  };
  const inquiry = insuranceRepository.inquiries?.get(inquiryId);

  if (!insuranceRepository.inquiries || !inquiry) {
    throw new Error(`Unable to seed insurance inquiry workflow state for ${inquiryId}`);
  }

  insuranceRepository.inquiries.set(inquiryId, {
    ...inquiry,
    ...patch,
    updatedAt: new Date(),
  });
}

export function failNextInsuranceUploadPersistence(app: TestApp) {
  const insuranceRepository = app.get(InsuranceRepository) as {
    failNextUploadedDocumentPersistence?: boolean;
  };
  insuranceRepository.failNextUploadedDocumentPersistence = true;
}

export function failNextInsuranceWorkflowPersistence(app: TestApp) {
  const insuranceRepository = app.get(InsuranceRepository) as {
    failNextWorkflowPersistence?: boolean;
  };
  insuranceRepository.failNextWorkflowPersistence = true;
}
