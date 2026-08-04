import { Controller, Get } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { SchemaObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';

import { HealthReadinessService } from './health-readiness.service';

const readinessResponseSchema: SchemaObject = {
  type: 'object',
  required: ['service', 'version', 'status', 'dependencies'],
  properties: {
    service: {
      type: 'string',
      enum: ['main-service'],
    },
    version: {
      type: 'string',
      example: 'development',
    },
    status: {
      type: 'string',
      enum: ['ready', 'not_ready'],
    },
    dependencies: {
      type: 'object',
      required: ['database', 'schema'],
      properties: {
        database: {
          type: 'string',
          enum: ['ready', 'unavailable'],
        },
        schema: {
          type: 'string',
          enum: ['ready', 'outdated', 'unknown'],
        },
      },
    },
  },
};

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly healthReadinessService: HealthReadinessService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Check main-service process liveness.' })
  @ApiOkResponse({
    description: 'The main-service process is accepting HTTP requests.',
    schema: {
      example: {
        service: 'main-service',
        status: 'ok',
      },
    },
  })
  getHealth() {
    return {
      service: 'main-service',
      status: 'ok',
    };
  }

  @Get('ready')
  @ApiOperation({
    summary: 'Check main-service database and schema readiness.',
  })
  @ApiOkResponse({
    description: 'The main-service dependencies are ready.',
    schema: readinessResponseSchema,
  })
  @ApiServiceUnavailableResponse({
    description: 'The database is unavailable or its schema is outdated.',
    schema: readinessResponseSchema,
  })
  getReadiness() {
    return this.healthReadinessService.checkReadiness();
  }
}
