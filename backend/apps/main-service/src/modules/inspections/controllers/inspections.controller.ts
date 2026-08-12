import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { Request } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiConsumes,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';

import { Roles } from '@main-modules/auth/decorators/roles.decorator';
import { JwtAuthGuard } from '@main-modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@main-modules/auth/guards/roles.guard';
import { CreateInspectionDto } from '../dto/create-inspection.dto';
import { InspectionResponseDto } from '../dto/inspection-response.dto';
import {
  InspectionHistoryQueryDto,
  SaveIntakeInspectionDraftDto,
} from '../dto/intake-inspection.dto';
import { UploadInspectionPhotoDto } from '../dto/upload-inspection-photo.dto';
import { UploadInspectionPhotoResponseDto } from '../dto/upload-inspection-photo-response.dto';
import { InspectionUploadFile, InspectionsService } from '../services/inspections.service';

const INSPECTION_UPLOAD_MAX_BYTES = 5 * 1024 * 1024;

@ApiTags('inspections')
@Controller()
export class InspectionsController {
  constructor(private readonly inspectionsService: InspectionsService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('technician', 'head_technician', 'service_adviser', 'super_admin')
  @Post('vehicles/:id/inspections')
  @ApiOperation({ summary: 'Create an inspection record for a vehicle.' })
  @ApiParam({
    name: 'id',
    description: 'Vehicle identifier.',
    example: '7e5d3bc0-8e87-4a42-b6d5-59ae8d0eeb6d',
  })
  @ApiCreatedResponse({
    description: 'The inspection was recorded successfully.',
    type: InspectionResponseDto,
  })
  @ApiBadRequestResponse({ description: 'The inspection payload is invalid.' })
  @ApiNotFoundResponse({ description: 'Vehicle or booking not found.' })
  @ApiConflictResponse({ description: 'The submitted booking reference is not valid for the vehicle.' })
  create(@Param('id') id: string, @Body() payload: CreateInspectionDto, @Req() request: Request) {
    return this.inspectionsService.create(
      id,
      payload,
      request.user as { userId: string; role: string },
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('technician', 'head_technician', 'service_adviser', 'super_admin')
  @Post('vehicles/:id/inspections/photos/upload')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: INSPECTION_UPLOAD_MAX_BYTES,
      },
    }),
  )
  @ApiOperation({ summary: 'Upload a vehicle inspection photo and receive an attachment reference.' })
  @ApiConsumes('multipart/form-data')
  @ApiParam({
    name: 'id',
    description: 'Vehicle identifier.',
    example: '7e5d3bc0-8e87-4a42-b6d5-59ae8d0eeb6d',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        slot: { type: 'string', maxLength: 40 },
      },
      required: ['file'],
    },
  })
  @ApiOkResponse({
    description: 'Inspection upload reference created successfully.',
    type: UploadInspectionPhotoResponseDto,
  })
  @ApiBadRequestResponse({ description: 'The inspection photo upload payload is invalid.' })
  @ApiNotFoundResponse({ description: 'Vehicle not found.' })
  uploadPhoto(
    @Param('id') id: string,
    @Body() payload: UploadInspectionPhotoDto,
    @UploadedFile() file: InspectionUploadFile,
    @Req() request: Request,
  ) {
    return this.inspectionsService.uploadPhoto(
      id,
      payload,
      file,
      request.user as { userId: string; role: string },
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('technician', 'head_technician', 'service_adviser', 'super_admin')
  @Get('vehicles/:id/inspections')
  @ApiOperation({ summary: 'List inspections recorded for a vehicle.' })
  @ApiParam({
    name: 'id',
    description: 'Vehicle identifier.',
    example: '7e5d3bc0-8e87-4a42-b6d5-59ae8d0eeb6d',
  })
  @ApiOkResponse({
    description: 'Bounded keyset page of inspections attached to the vehicle.',
  })
  @ApiNotFoundResponse({ description: 'Vehicle not found.' })
  findByVehicleId(
    @Param('id') id: string,
    @Query() query: InspectionHistoryQueryDto,
    @Req() request: Request,
  ) {
    return this.inspectionsService.findHistoryPage(
      id,
      query,
      request.user as { userId: string; role: string },
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('service_adviser', 'super_admin')
  @Post('vehicles/:id/intake-inspections/drafts')
  @ApiOperation({ summary: 'Create a resumable structured intake draft.' })
  @ApiCreatedResponse({ type: InspectionResponseDto })
  createIntakeDraft(
    @Param('id') vehicleId: string,
    @Body() payload: SaveIntakeInspectionDraftDto,
    @Req() request: Request,
  ) {
    return this.inspectionsService.createIntakeDraft(
      vehicleId,
      payload,
      request.user as { userId: string; role: string },
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('service_adviser', 'super_admin')
  @Get('intake-inspections/drafts')
  @ApiOperation({ summary: 'Recover a pending booked intake draft.' })
  findIntakeDrafts(
    @Query('bookingId') bookingId: string | undefined,
    @Req() request: Request,
  ) {
    return this.inspectionsService.findDrafts(
      bookingId,
      request.user as { userId: string; role: string },
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('service_adviser', 'super_admin')
  @Patch('intake-inspections/:id')
  @ApiOperation({ summary: 'Update a pending intake draft using optimistic concurrency.' })
  @ApiOkResponse({ type: InspectionResponseDto })
  updateIntakeDraft(
    @Param('id') inspectionId: string,
    @Headers('if-match') ifMatch: string | undefined,
    @Body() payload: SaveIntakeInspectionDraftDto,
    @Req() request: Request,
  ) {
    return this.inspectionsService.updateIntakeDraft(
      inspectionId,
      payload,
      ifMatch,
      request.user as { userId: string; role: string },
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('service_adviser', 'super_admin')
  @Post('intake-inspections/:id/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Validate and complete a structured intake draft.' })
  @ApiOkResponse({ type: InspectionResponseDto })
  completeIntakeDraft(
    @Param('id') inspectionId: string,
    @Headers('if-match') ifMatch: string | undefined,
    @Req() request: Request,
  ) {
    return this.inspectionsService.completeIntakeDraft(
      inspectionId,
      ifMatch,
      request.user as { userId: string; role: string },
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('technician', 'head_technician', 'service_adviser', 'super_admin')
  @Get('vehicles/:id/inspection-history')
  @ApiOperation({ summary: 'List a bounded keyset page of vehicle inspection history.' })
  findHistoryPage(
    @Param('id') vehicleId: string,
    @Query() query: InspectionHistoryQueryDto,
    @Req() request: Request,
  ) {
    return this.inspectionsService.findHistoryPage(
      vehicleId,
      query,
      request.user as { userId: string; role: string },
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('technician', 'head_technician', 'service_adviser', 'super_admin')
  @Post('intake-inspections/:id/evidence')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: INSPECTION_UPLOAD_MAX_BYTES },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Attach authenticated image evidence to an inspection.' })
  @ApiOkResponse({ type: UploadInspectionPhotoResponseDto })
  uploadEvidence(
    @Param('id') inspectionId: string,
    @Body() payload: UploadInspectionPhotoDto,
    @UploadedFile() file: InspectionUploadFile,
    @Req() request: Request,
  ) {
    return this.inspectionsService.uploadEvidence(
      inspectionId,
      payload,
      file,
      request.user as { userId: string; role: string },
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('technician', 'head_technician', 'service_adviser', 'super_admin')
  @Get('intake-inspections/:id/evidence/:evidenceId/file')
  @ApiOperation({ summary: 'Stream authorized inspection evidence.' })
  async readEvidence(
    @Param('id') inspectionId: string,
    @Param('evidenceId') evidenceId: string,
    @Req() request: Request,
  ) {
    const evidence = await this.inspectionsService.readEvidence(
      inspectionId,
      evidenceId,
      request.user as { userId: string; role: string },
    );
    const safeFileName = evidence.fileName.replace(/[\"\r\n]/g, '-');
    return new StreamableFile(evidence.stream, {
      type: evidence.mimeType,
      disposition: `inline; filename=\"${safeFileName}\"`,
      length: evidence.byteSize,
    });
  }
}
