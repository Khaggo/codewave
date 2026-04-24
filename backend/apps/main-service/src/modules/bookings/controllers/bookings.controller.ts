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
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { Roles } from '@main-modules/auth/decorators/roles.decorator';
import { JwtAuthGuard } from '@main-modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@main-modules/auth/guards/roles.guard';

import { BookingAvailabilityQueryDto } from '../dto/booking-availability-query.dto';
import { BookingAvailabilityResponseDto } from '../dto/booking-availability-response.dto';
import { BookingResponseDto } from '../dto/booking-response.dto';
import { CreateBookingDto } from '../dto/create-booking.dto';
import { CreateTimeSlotDto } from '../dto/create-time-slot.dto';
import { DailyScheduleQueryDto } from '../dto/daily-schedule-query.dto';
import { DailyScheduleResponseDto } from '../dto/daily-schedule-response.dto';
import { QueueCurrentQueryDto } from '../dto/queue-current-query.dto';
import { QueueCurrentResponseDto } from '../dto/queue-current-response.dto';
import { RescheduleBookingDto } from '../dto/reschedule-booking.dto';
import { ServiceResponseDto } from '../dto/service-response.dto';
import { TimeSlotResponseDto } from '../dto/time-slot-response.dto';
import { UpdateTimeSlotDto } from '../dto/update-time-slot.dto';
import { UpdateBookingStatusDto } from '../dto/update-booking-status.dto';
import { BookingsService } from '../services/bookings.service';

@ApiTags('bookings')
@Controller()
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Get('services')
  @ApiOperation({ summary: 'List available service offerings for bookings.' })
  @ApiOkResponse({
    description: 'The available services that can be attached to a booking.',
    type: ServiceResponseDto,
    isArray: true,
  })
  listServices() {
    return this.bookingsService.listServices();
  }

  @Get('time-slots')
  @ApiOperation({ summary: 'List available booking time slot definitions.' })
  @ApiOkResponse({
    description: 'Configured time slot definitions.',
    type: TimeSlotResponseDto,
    isArray: true,
  })
  listTimeSlots() {
    return this.bookingsService.listTimeSlots();
  }

  @Get('bookings/availability')
  @ApiOperation({ summary: 'Read bounded booking-date availability derived from active slot definitions and booking capacity.' })
  @ApiOkResponse({
    description: 'Availability window derived from booking-owned date and slot-capacity truth.',
    type: BookingAvailabilityResponseDto,
  })
  @ApiBadRequestResponse({ description: 'The requested availability window is invalid or too large.' })
  @ApiForbiddenResponse({
    description: 'Only customers, service advisers, or super admins can read booking availability.',
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('customer', 'service_adviser', 'super_admin')
  getAvailability(@Query() query: BookingAvailabilityQueryDto) {
    return this.bookingsService.getAvailability(query);
  }

  @Post('time-slots')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a booking time slot definition for staff operations.' })
  @ApiCreatedResponse({
    description: 'The created time slot definition.',
    type: TimeSlotResponseDto,
  })
  @ApiBadRequestResponse({ description: 'The submitted time slot payload is invalid.' })
  @ApiForbiddenResponse({ description: 'Only service advisers or super admins can manage time slots.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('service_adviser', 'super_admin')
  createTimeSlot(@Body() payload: CreateTimeSlotDto, @Req() request: Request) {
    return this.bookingsService.createTimeSlot(
      payload,
      (request.user as { userId: string }).userId,
    );
  }

  @Patch('time-slots/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a booking time slot definition for staff operations.' })
  @ApiParam({
    name: 'id',
    description: 'Time slot identifier.',
    example: 'e7318032-2fe0-4f40-b3d4-5ba2a8c94320',
  })
  @ApiOkResponse({
    description: 'The updated time slot definition.',
    type: TimeSlotResponseDto,
  })
  @ApiBadRequestResponse({ description: 'The submitted time slot payload is invalid.' })
  @ApiNotFoundResponse({ description: 'Time slot not found.' })
  @ApiForbiddenResponse({ description: 'Only service advisers or super admins can manage time slots.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('service_adviser', 'super_admin')
  updateTimeSlot(@Param('id') id: string, @Body() payload: UpdateTimeSlotDto, @Req() request: Request) {
    return this.bookingsService.updateTimeSlot(
      id,
      payload,
      (request.user as { userId: string }).userId,
    );
  }

  @Post('bookings')
  @ApiOperation({ summary: 'Create a booking for a user, vehicle, services, and slot.' })
  @ApiCreatedResponse({
    description: 'The booking was created successfully.',
    type: BookingResponseDto,
  })
  @ApiBadRequestResponse({ description: 'The submitted booking payload is invalid.' })
  @ApiNotFoundResponse({ description: 'The user, owned vehicle, time slot, or service was not found.' })
  @ApiConflictResponse({ description: 'The selected slot is unavailable or another booking conflict exists.' })
  create(@Body() createBookingDto: CreateBookingDto) {
    return this.bookingsService.create(createBookingDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('service_adviser', 'super_admin')
  @Get('bookings/daily-schedule')
  @ApiOperation({ summary: 'Read the daily booking schedule for service-adviser operations.' })
  @ApiBearerAuth('access-token')
  @ApiOkResponse({
    description: 'Grouped schedule view for the requested date.',
    type: DailyScheduleResponseDto,
  })
  @ApiBadRequestResponse({ description: 'The schedule query is invalid.' })
  @ApiForbiddenResponse({ description: 'Only service advisers or super admins can read the schedule view.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  getDailySchedule(@Query() query: DailyScheduleQueryDto) {
    return this.bookingsService.getDailySchedule(query);
  }

  @Get('bookings/:id')
  @ApiOperation({ summary: 'Get a booking by id.' })
  @ApiParam({
    name: 'id',
    description: 'Booking identifier.',
    example: 'b520dba5-5bfb-4d34-a931-70bd811f7725',
  })
  @ApiOkResponse({
    description: 'The matching booking record.',
    type: BookingResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Booking not found.' })
  findById(@Param('id') id: string) {
    return this.bookingsService.findById(id);
  }

  @Patch('bookings/:id/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update booking status using validated transitions.' })
  @ApiParam({
    name: 'id',
    description: 'Booking identifier.',
    example: 'b520dba5-5bfb-4d34-a931-70bd811f7725',
  })
  @ApiOkResponse({
    description: 'The updated booking after the status transition.',
    type: BookingResponseDto,
  })
  @ApiBadRequestResponse({ description: 'The status payload is invalid or unchanged.' })
  @ApiConflictResponse({ description: 'The requested status transition is not allowed.' })
  @ApiNotFoundResponse({ description: 'Booking not found.' })
  @ApiForbiddenResponse({ description: 'Only service advisers or super admins can manage booking state.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('service_adviser', 'super_admin')
  updateStatus(@Param('id') id: string, @Body() payload: UpdateBookingStatusDto, @Req() request: Request) {
    return this.bookingsService.updateStatus(
      id,
      payload,
      (request.user as { userId: string }).userId,
    );
  }

  @Post('bookings/:id/reschedule')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reschedule a booking to a new slot and date.' })
  @ApiParam({
    name: 'id',
    description: 'Booking identifier.',
    example: 'b520dba5-5bfb-4d34-a931-70bd811f7725',
  })
  @ApiOkResponse({
    description: 'The booking after rescheduling.',
    type: BookingResponseDto,
  })
  @ApiBadRequestResponse({ description: 'The reschedule payload is invalid.' })
  @ApiNotFoundResponse({ description: 'Booking or time slot not found.' })
  @ApiConflictResponse({ description: 'The booking cannot be rescheduled or the slot is full.' })
  @ApiForbiddenResponse({ description: 'Only service advisers or super admins can reschedule bookings.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('service_adviser', 'super_admin')
  reschedule(@Param('id') id: string, @Body() payload: RescheduleBookingDto, @Req() request: Request) {
    return this.bookingsService.reschedule(
      id,
      payload,
      (request.user as { userId: string }).userId,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('service_adviser', 'super_admin')
  @Get('queue/current')
  @ApiOperation({ summary: 'Read the current appointment queue for live staff visibility.' })
  @ApiBearerAuth('access-token')
  @ApiOkResponse({
    description: 'Queue snapshot derived from confirmed and rescheduled bookings.',
    type: QueueCurrentResponseDto,
  })
  @ApiBadRequestResponse({ description: 'The queue query is invalid.' })
  @ApiForbiddenResponse({ description: 'Only service advisers or super admins can read queue visibility.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  getQueueCurrent(@Query() query: QueueCurrentQueryDto) {
    return this.bookingsService.getQueueCurrent(query);
  }

  @Get('users/:id/bookings')
  @ApiOperation({ summary: 'List bookings created under a specific user.' })
  @ApiParam({
    name: 'id',
    description: 'User identifier.',
    example: 'a3cce1f2-a6eb-4fdd-bf11-8b17d3ddfc17',
  })
  @ApiOkResponse({
    description: 'Bookings belonging to the target user.',
    type: BookingResponseDto,
    isArray: true,
  })
  @ApiNotFoundResponse({ description: 'User not found.' })
  findByUserId(@Param('id') id: string) {
    return this.bookingsService.findByUserId(id);
  }
}
