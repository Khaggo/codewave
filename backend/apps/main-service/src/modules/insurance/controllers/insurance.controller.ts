import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { Roles } from '@main-modules/auth/decorators/roles.decorator';
import { JwtAuthGuard } from '@main-modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@main-modules/auth/guards/roles.guard';

import { AddInsuranceDocumentDto } from '../dto/add-insurance-document.dto';
import { CreateInsuranceInquiryDto } from '../dto/create-insurance-inquiry.dto';
import { InsuranceInquiryResponseDto } from '../dto/insurance-inquiry-response.dto';
import { InsuranceRecordResponseDto } from '../dto/insurance-record-response.dto';
import { UpdateInsuranceInquiryStatusDto } from '../dto/update-insurance-inquiry-status.dto';
import { InsuranceService } from '../services/insurance.service';

@ApiTags('insurance')
@Controller()
export class InsuranceController {
  constructor(private readonly insuranceService: InsuranceService) {}

  @Post('insurance/inquiries')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('customer', 'service_adviser', 'super_admin')
  @ApiOperation({ summary: 'Create an internal insurance inquiry for CTPL or comprehensive workflow tracking.' })
  @ApiBearerAuth('access-token')
  @ApiCreatedResponse({
    description: 'The insurance inquiry was created successfully.',
    type: InsuranceInquiryResponseDto,
  })
  @ApiBadRequestResponse({ description: 'The insurance inquiry payload is invalid.' })
  @ApiConflictResponse({ description: 'The submitted customer and vehicle lineage is invalid.' })
  @ApiForbiddenResponse({ description: 'Only the owning customer or authorized staff can create inquiries.' })
  @ApiNotFoundResponse({ description: 'Customer or vehicle not found.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  create(@Body() payload: CreateInsuranceInquiryDto, @Req() request: Request) {
    return this.insuranceService.create(payload, request.user as { userId: string; role: string });
  }

  @Get('insurance/inquiries/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('customer', 'service_adviser', 'super_admin')
  @ApiOperation({ summary: 'Get an insurance inquiry by id.' })
  @ApiBearerAuth('access-token')
  @ApiParam({
    name: 'id',
    description: 'Insurance inquiry identifier.',
    example: '4c559c0b-4d1b-492f-a11f-e61271f4a32d',
  })
  @ApiOkResponse({
    description: 'The matching insurance inquiry.',
    type: InsuranceInquiryResponseDto,
  })
  @ApiForbiddenResponse({ description: 'Customers can only access their own insurance inquiries.' })
  @ApiNotFoundResponse({ description: 'Insurance inquiry not found.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  findById(@Param('id') id: string, @Req() request: Request) {
    return this.insuranceService.findById(id, request.user as { userId: string; role: string });
  }

  @Get('users/:id/insurance-inquiries')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('service_adviser', 'super_admin')
  @ApiOperation({ summary: 'List insurance inquiries for one customer account.' })
  @ApiBearerAuth('access-token')
  @ApiParam({
    name: 'id',
    description: 'Customer identifier.',
    example: '55555555-5555-4555-8555-555555555555',
  })
  @ApiOkResponse({
    description: 'Insurance inquiries attached to the target customer.',
    type: InsuranceInquiryResponseDto,
    isArray: true,
  })
  @ApiForbiddenResponse({ description: 'Only service advisers or super admins can list customer insurance inquiries.' })
  @ApiNotFoundResponse({ description: 'Customer not found.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  findByUserId(@Param('id') id: string, @Req() request: Request) {
    return this.insuranceService.findByUserId(id, request.user as { userId: string; role: string });
  }

  @Patch('insurance/inquiries/:id/status')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('service_adviser', 'super_admin')
  @ApiOperation({ summary: 'Advance insurance inquiry review status and optional record creation.' })
  @ApiBearerAuth('access-token')
  @ApiParam({
    name: 'id',
    description: 'Insurance inquiry identifier.',
    example: '4c559c0b-4d1b-492f-a11f-e61271f4a32d',
  })
  @ApiOkResponse({
    description: 'The updated insurance inquiry.',
    type: InsuranceInquiryResponseDto,
  })
  @ApiBadRequestResponse({ description: 'The insurance status payload is invalid.' })
  @ApiConflictResponse({ description: 'The requested insurance inquiry transition is not allowed.' })
  @ApiForbiddenResponse({ description: 'Only service advisers or super admins can review insurance inquiries.' })
  @ApiNotFoundResponse({ description: 'Insurance inquiry not found.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  updateStatus(
    @Param('id') id: string,
    @Body() payload: UpdateInsuranceInquiryStatusDto,
    @Req() request: Request,
  ) {
    return this.insuranceService.updateStatus(id, payload, request.user as { userId: string; role: string });
  }

  @Post('insurance/inquiries/:id/documents')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('customer', 'service_adviser', 'super_admin')
  @ApiOperation({ summary: 'Attach supporting documents to an insurance inquiry.' })
  @ApiBearerAuth('access-token')
  @ApiParam({
    name: 'id',
    description: 'Insurance inquiry identifier.',
    example: '4c559c0b-4d1b-492f-a11f-e61271f4a32d',
  })
  @ApiOkResponse({
    description: 'The updated insurance inquiry with the new supporting document.',
    type: InsuranceInquiryResponseDto,
  })
  @ApiBadRequestResponse({ description: 'The insurance document payload is invalid.' })
  @ApiConflictResponse({ description: 'Closed or rejected inquiries cannot accept more documents.' })
  @ApiForbiddenResponse({ description: 'Customers can only upload documents to their own inquiries.' })
  @ApiNotFoundResponse({ description: 'Insurance inquiry not found.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  addDocument(@Param('id') id: string, @Body() payload: AddInsuranceDocumentDto, @Req() request: Request) {
    return this.insuranceService.addDocument(id, payload, request.user as { userId: string; role: string });
  }

  @Get('vehicles/:id/insurance-records')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('customer', 'service_adviser', 'super_admin')
  @ApiOperation({ summary: 'List tracked insurance records for a vehicle.' })
  @ApiBearerAuth('access-token')
  @ApiParam({
    name: 'id',
    description: 'Vehicle identifier.',
    example: '7e5d3bc0-8e87-4a42-b6d5-59ae8d0eeb6d',
  })
  @ApiOkResponse({
    description: 'Insurance records attached to the vehicle.',
    type: InsuranceRecordResponseDto,
    isArray: true,
  })
  @ApiForbiddenResponse({ description: 'Customers can only access insurance records for their own vehicle.' })
  @ApiNotFoundResponse({ description: 'Vehicle not found.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  findRecordsByVehicleId(@Param('id') id: string, @Req() request: Request) {
    return this.insuranceService.findRecordsByVehicleId(id, request.user as { userId: string; role: string });
  }
}
