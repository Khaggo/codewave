type OpenApiOperation = {
  security?: unknown[];
};

type OpenApiDocument = {
  info?: {
    title?: string;
  };
  paths?: Record<string, Record<string, OpenApiOperation | undefined> | undefined>;
  components?: {
    schemas?: Record<string, unknown>;
    securitySchemes?: Record<string, unknown>;
  };
};

const baseRequiredPaths = [
  '/api/auth/register',
  '/api/auth/register/verify-email',
  '/api/auth/login',
  '/api/auth/refresh',
  '/api/auth/me',
  '/api/admin/staff-accounts',
  '/api/admin/staff-accounts/{id}/status',
  '/api/users',
  '/api/users/{id}',
  '/api/users/{id}/addresses',
  '/api/users/{id}/addresses/{addressId}',
] as const;

const expandedMainServicePaths = [
  '/api/services',
  '/api/time-slots',
  '/api/bookings',
  '/api/bookings/{id}',
  '/api/bookings/{id}/status',
  '/api/bookings/{id}/reschedule',
  '/api/bookings/daily-schedule',
  '/api/queue/current',
  '/api/job-orders',
  '/api/job-orders/{id}',
  '/api/job-orders/{id}/status',
  '/api/job-orders/{id}/progress',
  '/api/job-orders/{id}/photos',
  '/api/job-orders/{id}/finalize',
  '/api/insurance/inquiries',
  '/api/insurance/inquiries/{id}',
  '/api/insurance/inquiries/{id}/status',
  '/api/insurance/inquiries/{id}/documents',
  '/api/vehicles/{id}/insurance-records',
  '/api/job-orders/{jobOrderId}/qa',
  '/api/job-orders/{jobOrderId}/qa/override',
] as const;

const baseRequiredSchemas = [
  'CreateUserDto',
  'UpdateUserDto',
  'UpsertAddressDto',
  'UpdateAddressDto',
  'RegisterDto',
  'VerifyEmailOtpDto',
  'CreateStaffAccountDto',
  'LoginDto',
  'RefreshTokenDto',
  'UpdateStaffAccountStatusDto',
  'UserResponseDto',
  'AddressResponseDto',
  'UserProfileResponseDto',
  'AuthSessionResponseDto',
  'AuthenticatedUserResponseDto',
  'GoogleSignupStartResponseDto',
] as const;

const expandedMainServiceSchemas = [
  'CreateBookingDto',
  'UpdateBookingStatusDto',
  'RescheduleBookingDto',
  'BookingResponseDto',
  'DailyScheduleResponseDto',
  'QueueCurrentResponseDto',
  'ServiceResponseDto',
  'TimeSlotResponseDto',
  'CreateJobOrderDto',
  'CreateJobOrderItemDto',
  'UpdateJobOrderStatusDto',
  'AddJobOrderProgressDto',
  'AddJobOrderPhotoDto',
  'FinalizeJobOrderDto',
  'JobOrderResponseDto',
  'CreateInsuranceInquiryDto',
  'UpdateInsuranceInquiryStatusDto',
  'AddInsuranceDocumentDto',
  'InsuranceInquiryResponseDto',
  'InsuranceRecordResponseDto',
  'OverrideQualityGateDto',
  'JobOrderQualityGateResponseDto',
] as const;

const protectedOperations = [
  { path: '/api/auth/me', method: 'get' },
  { path: '/api/bookings/daily-schedule', method: 'get' },
  { path: '/api/job-orders/{id}', method: 'get' },
  { path: '/api/insurance/inquiries/{id}', method: 'get' },
  { path: '/api/job-orders/{jobOrderId}/qa', method: 'get' },
  { path: '/api/job-orders/{jobOrderId}/qa/override', method: 'patch' },
] as const;

const expectPath = (paths: NonNullable<OpenApiDocument['paths']>, path: string) => {
  if (!paths[path]) {
    throw new Error(`Missing required OpenAPI path: ${path}`);
  }
};

const expectSchema = (schemas: NonNullable<NonNullable<OpenApiDocument['components']>['schemas']>, schemaName: string) => {
  if (!schemas[schemaName]) {
    throw new Error(`Missing required OpenAPI schema: ${schemaName}`);
  }
};

const expectBearerSecurity = (
  paths: NonNullable<OpenApiDocument['paths']>,
  path: string,
  method: string,
) => {
  const operation = paths[path]?.[method] as OpenApiOperation | undefined;
  if (!operation?.security?.length) {
    throw new Error(`Expected ${method.toUpperCase()} ${path} to require bearer auth in OpenAPI`);
  }
};

export const validateMainServiceOpenApiDocument = (document: OpenApiDocument) => {
  const paths = document.paths ?? {};
  for (const path of [...baseRequiredPaths, ...expandedMainServicePaths]) {
    expectPath(paths, path);
  }

  const schemas = document.components?.schemas ?? {};
  for (const schemaName of [...baseRequiredSchemas, ...expandedMainServiceSchemas]) {
    expectSchema(schemas, schemaName);
  }

  if (!document.components?.securitySchemes?.['access-token']) {
    throw new Error('Missing bearer security scheme: access-token');
  }

  for (const operation of protectedOperations) {
    expectBearerSecurity(paths, operation.path, operation.method);
  }
};

