import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
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

import { CreateInspectionDto } from '../dto/create-inspection.dto';
import { InspectionResponseDto } from '../dto/inspection-response.dto';
import { UploadInspectionPhotoDto } from '../dto/upload-inspection-photo.dto';
import { UploadInspectionPhotoResponseDto } from '../dto/upload-inspection-photo-response.dto';
import { InspectionUploadFile, InspectionsService } from '../services/inspections.service';

@ApiTags('inspections')
@Controller()
export class InspectionsController {
  constructor(private readonly inspectionsService: InspectionsService) {}

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
  create(@Param('id') id: string, @Body() payload: CreateInspectionDto) {
    return this.inspectionsService.create(id, payload);
  }

  @Post('vehicles/:id/inspections/photos/upload')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
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
  ) {
    return this.inspectionsService.uploadPhoto(id, payload, file);
  }

  @Get('vehicles/:id/inspections')
  @ApiOperation({ summary: 'List inspections recorded for a vehicle.' })
  @ApiParam({
    name: 'id',
    description: 'Vehicle identifier.',
    example: '7e5d3bc0-8e87-4a42-b6d5-59ae8d0eeb6d',
  })
  @ApiOkResponse({
    description: 'Inspections attached to the vehicle.',
    type: InspectionResponseDto,
    isArray: true,
  })
  @ApiNotFoundResponse({ description: 'Vehicle not found.' })
  findByVehicleId(@Param('id') id: string) {
    return this.inspectionsService.findByVehicleId(id);
  }
}
