import { getDocsJsonUrl, loadLocalEnv } from './swagger.shared';

const requiredPaths = [
  '/api/auth/register',
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

const requiredSchemas = [
  'CreateUserDto',
  'UpdateUserDto',
  'UpsertAddressDto',
  'UpdateAddressDto',
  'RegisterDto',
  'CreateStaffAccountDto',
  'LoginDto',
  'RefreshTokenDto',
  'UpdateStaffAccountStatusDto',
  'UserResponseDto',
  'AddressResponseDto',
  'UserProfileResponseDto',
  'AuthSessionResponseDto',
  'AuthenticatedUserResponseDto',
] as const;

async function main() {
  const env = loadLocalEnv();
  const response = await fetch(getDocsJsonUrl(env));

  if (!response.ok) {
    throw new Error(`OpenAPI endpoint returned ${response.status}`);
  }

  const document = (await response.json()) as {
    paths?: Record<string, unknown>;
    components?: {
      schemas?: Record<string, unknown>;
      securitySchemes?: Record<string, unknown>;
    };
  };

  const paths = document.paths ?? {};
  for (const path of requiredPaths) {
    if (!paths[path]) {
      throw new Error(`Missing required OpenAPI path: ${path}`);
    }
  }

  const schemas = document.components?.schemas ?? {};
  for (const schemaName of requiredSchemas) {
    if (!schemas[schemaName]) {
      throw new Error(`Missing required OpenAPI schema: ${schemaName}`);
    }
  }

  if (!document.components?.securitySchemes?.['access-token']) {
    throw new Error('Missing bearer security scheme: access-token');
  }

  const meOperation = (paths['/api/auth/me'] as { get?: { security?: unknown[] } } | undefined)?.get;
  if (!meOperation?.security?.length) {
    throw new Error('Expected /api/auth/me to require bearer auth in OpenAPI');
  }

  process.stdout.write('OpenAPI contract check passed.\n');
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exit(1);
});
