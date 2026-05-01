import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
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
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { Roles } from '@main-modules/auth/decorators/roles.decorator';
import { JwtAuthGuard } from '@main-modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@main-modules/auth/guards/roles.guard';

import { AddJobOrderPhotoDto } from '../dto/add-job-order-photo.dto';
import { AddJobOrderProgressDto } from '../dto/add-job-order-progress.dto';
import { CreateJobOrderDto } from '../dto/create-job-order.dto';
import { FinalizeJobOrderDto } from '../dto/finalize-job-order.dto';
import { JobOrderResponseDto } from '../dto/job-order-response.dto';
import { JobOrderWorkbenchSummaryResponseDto } from '../dto/job-order-workbench-summary-response.dto';
import { ListJobOrderWorkbenchQueryDto } from '../dto/list-job-order-workbench-query.dto';
import { RecordJobOrderInvoicePaymentDto } from '../dto/record-job-order-invoice-payment.dto';
import { UpdateJobOrderStatusDto } from '../dto/update-job-order-status.dto';
import { JobOrdersService } from '../services/job-orders.service';

@ApiTags('job-orders')
@Controller('job-orders')
export class JobOrdersController {
  constructor(private readonly jobOrdersService: JobOrdersService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('service_adviser', 'super_admin')
  @ApiOperation({ summary: 'Create a digital job order from approved operational intake.' })
  @ApiBearerAuth('access-token')
  @ApiCreatedResponse({
    description: 'The job order was created successfully.',
    type: JobOrderResponseDto,
  })
  @ApiBadRequestResponse({ description: 'The job-order payload is invalid.' })
  @ApiConflictResponse({ description: 'The source is not eligible or already has a job order.' })
  @ApiForbiddenResponse({ description: 'Only service advisers or super admins can create job orders.' })
  @ApiNotFoundResponse({ description: 'The source booking, customer, vehicle, or staff assignment was not found.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  create(@Body() payload: CreateJobOrderDto, @Req() request: Request) {
    return this.jobOrdersService.create(payload, request.user as { userId: string; role: string });
  }

  @Get('assigned')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('technician')
  @ApiOperation({ summary: 'List job orders assigned to the current technician.' })
  @ApiBearerAuth('access-token')
  @ApiOkResponse({
    description: 'Job orders assigned to the current technician, most recently updated first.',
    type: JobOrderResponseDto,
    isArray: true,
  })
  @ApiForbiddenResponse({ description: 'Only technicians can list their assigned job orders.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  listAssigned(@Req() request: Request) {
    return this.jobOrdersService.listAssignedToTechnician(
      request.user as { userId: string; role: string },
    );
  }

  @Get('workbench-summaries')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('technician', 'service_adviser', 'super_admin')
  @ApiOperation({ summary: 'List accessible job-order summary records for workbench date indicators and selectors.' })
  @ApiBearerAuth('access-token')
  @ApiQuery({
    name: 'month',
    required: false,
    description: 'Optional month filter in YYYY-MM format.',
    example: '2026-05',
  })
  @ApiOkResponse({
    description: 'Accessible job-order summaries used by the web workbench calendar and id selectors.',
    type: JobOrderWorkbenchSummaryResponseDto,
    isArray: true,
  })
  @ApiBadRequestResponse({ description: 'The month filter is invalid.' })
  @ApiForbiddenResponse({ description: 'Only staff workbench roles can read job-order summaries.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  listWorkbenchSummaries(
    @Query() query: ListJobOrderWorkbenchQueryDto,
    @Req() request: Request,
  ) {
    return this.jobOrdersService.listWorkbenchSummaries(
      request.user as { userId: string; role: string },
      query,
    );
  }

  @Get('workbench-calendar')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('technician', 'service_adviser', 'super_admin')
  @ApiOperation({ summary: 'List date markers for job orders and booking handoff queue visibility in one workbench month.' })
  @ApiBearerAuth('access-token')
  @ApiQuery({
    name: 'month',
    required: false,
    description: 'Optional month filter in YYYY-MM format.',
    example: '2026-05',
  })
  @ApiOkResponse({
    description: 'Date markers used by the web workbench calendar strip.',
  })
  listWorkbenchCalendar(
    @Query() query: ListJobOrderWorkbenchQueryDto,
    @Req() request: Request,
  ) {
    return this.jobOrdersService.listWorkbenchCalendar(
      request.user as { userId: string; role: string },
      query,
    );
  }

  @Get('vehicles/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('service_adviser', 'super_admin')
  @ApiOperation({ summary: 'List job orders attached to one vehicle for staff selectors.' })
  @ApiBearerAuth('access-token')
  @ApiParam({
    name: 'id',
    description: 'Vehicle identifier.',
    example: '7e5d3bc0-8e87-4a42-b6d5-59ae8d0eeb6d',
  })
  @ApiOkResponse({
    description: 'Job orders attached to the target vehicle.',
    type: JobOrderResponseDto,
    isArray: true,
  })
  findByVehicleId(@Param('id') id: string, @Req() request: Request) {
    return this.jobOrdersService.findByVehicleId(
      id,
      request.user as { userId: string; role: string },
    );
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('technician', 'service_adviser', 'super_admin')
  @ApiOperation({ summary: 'Get a job order by id for assigned staff visibility.' })
  @ApiBearerAuth('access-token')
  @ApiParam({
    name: 'id',
    description: 'Job-order identifier.',
    example: '7bc8926d-8eb7-4c97-85ab-4597a58e1f43',
  })
  @ApiOkResponse({
    description: 'The matching job order.',
    type: JobOrderResponseDto,
  })
  @ApiForbiddenResponse({ description: 'Only assigned technicians or staff reviewers can access this job order.' })
  @ApiNotFoundResponse({ description: 'Job order not found.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  findById(@Param('id') id: string, @Req() request: Request) {
    return this.jobOrdersService.findById(id, request.user as { userId: string; role: string });
  }

  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('technician', 'service_adviser', 'super_admin')
  @ApiOperation({ summary: 'Update job-order execution status using validated staff transitions.' })
  @ApiBearerAuth('access-token')
  @ApiParam({
    name: 'id',
    description: 'Job-order identifier.',
    example: '7bc8926d-8eb7-4c97-85ab-4597a58e1f43',
  })
  @ApiOkResponse({
    description: 'The updated job order after the status transition.',
    type: JobOrderResponseDto,
  })
  @ApiBadRequestResponse({ description: 'The job-order status payload is invalid.' })
  @ApiConflictResponse({ description: 'The requested job-order status transition is not allowed.' })
  @ApiForbiddenResponse({ description: 'Only the appropriate staff role can perform this transition.' })
  @ApiNotFoundResponse({ description: 'Job order not found.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  updateStatus(
    @Param('id') id: string,
    @Body() payload: UpdateJobOrderStatusDto,
    @Req() request: Request,
  ) {
    return this.jobOrdersService.updateStatus(id, payload, request.user as { userId: string; role: string });
  }

  @Post(':id/progress')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('technician', 'service_adviser', 'super_admin')
  @ApiOperation({ summary: 'Append a structured progress entry to a job order.' })
  @ApiBearerAuth('access-token')
  @ApiParam({
    name: 'id',
    description: 'Job-order identifier.',
    example: '7bc8926d-8eb7-4c97-85ab-4597a58e1f43',
  })
  @ApiOkResponse({
    description: 'The updated job order after the progress entry was appended.',
    type: JobOrderResponseDto,
  })
  @ApiBadRequestResponse({ description: 'The progress-entry payload is invalid.' })
  @ApiConflictResponse({ description: 'The job order cannot accept the supplied progress evidence.' })
  @ApiForbiddenResponse({ description: 'Only assigned technicians can append progress entries.' })
  @ApiNotFoundResponse({ description: 'Job order not found.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  addProgressEntry(
    @Param('id') id: string,
    @Body() payload: AddJobOrderProgressDto,
    @Req() request: Request,
  ) {
    return this.jobOrdersService.addProgressEntry(id, payload, request.user as { userId: string; role: string });
  }

  @Post(':id/photos')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('technician', 'service_adviser', 'super_admin')
  @ApiOperation({ summary: 'Attach work evidence photos to a job order.' })
  @ApiBearerAuth('access-token')
  @ApiParam({
    name: 'id',
    description: 'Job-order identifier.',
    example: '7bc8926d-8eb7-4c97-85ab-4597a58e1f43',
  })
  @ApiOkResponse({
    description: 'The updated job order after the photo evidence was linked.',
    type: JobOrderResponseDto,
  })
  @ApiBadRequestResponse({ description: 'The photo-evidence payload is invalid.' })
  @ApiConflictResponse({ description: 'The job order cannot accept the supplied photo evidence.' })
  @ApiForbiddenResponse({ description: 'Only assigned technicians or staff reviewers can add photo evidence.' })
  @ApiNotFoundResponse({ description: 'Job order not found.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  addPhoto(
    @Param('id') id: string,
    @Body() payload: AddJobOrderPhotoDto,
    @Req() request: Request,
  ) {
    return this.jobOrdersService.addPhoto(id, payload, request.user as { userId: string; role: string });
  }

  @Post(':id/finalize')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('service_adviser', 'super_admin')
  @ApiOperation({ summary: 'Generate an invoice-ready record after QA clears the job order.' })
  @ApiBearerAuth('access-token')
  @ApiParam({
    name: 'id',
    description: 'Job-order identifier.',
    example: '7bc8926d-8eb7-4c97-85ab-4597a58e1f43',
  })
  @ApiOkResponse({
    description: 'The updated job order with the generated invoice-ready record.',
    type: JobOrderResponseDto,
  })
  @ApiBadRequestResponse({ description: 'The finalize payload is invalid.' })
  @ApiConflictResponse({ description: 'The job order is not ready for invoice generation or QA release is still blocked.' })
  @ApiForbiddenResponse({ description: 'Only the responsible service adviser or a super admin can finalize the job order.' })
  @ApiNotFoundResponse({ description: 'Job order not found.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  finalize(@Param('id') id: string, @Body() payload: FinalizeJobOrderDto, @Req() request: Request) {
    return this.jobOrdersService.finalize(id, payload, request.user as { userId: string; role: string });
  }

  @Post(':id/invoice/payments')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('service_adviser', 'super_admin')
  @ApiOperation({ summary: 'Record the settlement of a finalized service invoice.' })
  @ApiBearerAuth('access-token')
  @ApiParam({
    name: 'id',
    description: 'Job-order identifier.',
    example: '7bc8926d-8eb7-4c97-85ab-4597a58e1f43',
  })
  @ApiOkResponse({
    description: 'The updated job order after invoice payment was recorded.',
    type: JobOrderResponseDto,
  })
  @ApiBadRequestResponse({ description: 'The invoice-payment payload is invalid.' })
  @ApiConflictResponse({ description: 'The job order is not finalized, is missing an invoice, or is already paid.' })
  @ApiForbiddenResponse({ description: 'Only the responsible service adviser or a super admin can record invoice settlement.' })
  @ApiNotFoundResponse({ description: 'Job order not found.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  recordInvoicePayment(
    @Param('id') id: string,
    @Body() payload: RecordJobOrderInvoicePaymentDto,
    @Req() request: Request,
  ) {
    return this.jobOrdersService.recordInvoicePayment(
      id,
      payload,
      request.user as { userId: string; role: string },
    );
  }
}
