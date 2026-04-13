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

import { Roles } from '../decorators/roles.decorator';
import { CreateStaffAccountDto } from '../dto/create-staff-account.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { AuthenticatedUserResponseDto } from '../dto/authenticated-user-response.dto';
import { AuthSessionResponseDto } from '../dto/auth-session-response.dto';
import { GoogleSignupStartDto } from '../dto/google-signup-start.dto';
import { GoogleSignupStartResponseDto } from '../dto/google-signup-start-response.dto';
import { LoginDto } from '../dto/login.dto';
import { RefreshTokenDto } from '../dto/refresh-token.dto';
import { RegisterDto } from '../dto/register.dto';
import { UpdateStaffAccountStatusDto } from '../dto/update-staff-account-status.dto';
import { VerifyEmailOtpDto } from '../dto/verify-email-otp.dto';
import { AuthService } from '../services/auth.service';
import { UserResponseDto } from '@main-modules/users/dto/user-response.dto';

@ApiTags('auth')
@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('auth/register')
  @ApiOperation({ summary: 'Register a customer account and issue an auth session.' })
  @ApiCreatedResponse({
    description: 'Registration succeeded and a new auth session was created.',
    type: AuthSessionResponseDto,
  })
  @ApiBadRequestResponse({ description: 'The registration payload is invalid.' })
  @ApiConflictResponse({ description: 'The email is already registered.' })
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('auth/google/signup/start')
  @ApiOperation({ summary: 'Start customer signup with Google verification and email OTP delivery.' })
  @ApiCreatedResponse({
    description: 'The enrollment was created and an OTP was sent.',
    type: GoogleSignupStartResponseDto,
  })
  @ApiBadRequestResponse({ description: 'The signup payload is invalid.' })
  @ApiConflictResponse({ description: 'The email or Google identity is already registered.' })
  startGoogleSignup(@Body() payload: GoogleSignupStartDto) {
    return this.authService.startGoogleSignup(payload);
  }

  @Post('auth/google/signup/verify-email')
  @ApiOperation({ summary: 'Verify the email OTP and activate the customer account.' })
  @ApiOkResponse({
    description: 'The account was activated and an auth session was created.',
    type: AuthSessionResponseDto,
  })
  @ApiBadRequestResponse({ description: 'The OTP payload is invalid or expired.' })
  @ApiConflictResponse({ description: 'The OTP has already been used.' })
  @ApiNotFoundResponse({ description: 'OTP enrollment not found.' })
  @HttpCode(HttpStatus.OK)
  verifyEmail(@Body() payload: VerifyEmailOtpDto) {
    return this.authService.verifyEmailOtp(payload);
  }

  @Post('auth/staff-activation/google/start')
  @ApiOperation({ summary: 'Start staff activation with Google verification and email OTP delivery.' })
  @ApiCreatedResponse({
    description: 'The staff activation enrollment was created and an OTP was sent.',
    type: GoogleSignupStartResponseDto,
  })
  @ApiBadRequestResponse({ description: 'The staff activation payload is invalid.' })
  @ApiConflictResponse({ description: 'The Google identity is already linked to another account.' })
  @ApiNotFoundResponse({ description: 'Staff account not found.' })
  startStaffActivation(@Body() payload: GoogleSignupStartDto) {
    return this.authService.startStaffActivation(payload);
  }

  @Post('auth/staff-activation/verify-email')
  @ApiOperation({ summary: 'Verify the email OTP and activate the staff account.' })
  @ApiOkResponse({
    description: 'The staff account was activated and an auth session was created.',
    type: AuthSessionResponseDto,
  })
  @ApiBadRequestResponse({ description: 'The OTP payload is invalid or expired.' })
  @ApiConflictResponse({ description: 'The OTP has already been used.' })
  @ApiNotFoundResponse({ description: 'OTP enrollment not found.' })
  @HttpCode(HttpStatus.OK)
  verifyStaffEmail(@Body() payload: VerifyEmailOtpDto) {
    return this.authService.verifyStaffEmailOtp(payload);
  }

  @Post('auth/login')
  @ApiOperation({ summary: 'Authenticate a user and issue access + refresh tokens.' })
  @ApiOkResponse({
    description: 'Login succeeded.',
    type: AuthSessionResponseDto,
  })
  @ApiBadRequestResponse({ description: 'The login payload is invalid.' })
  @ApiUnauthorizedResponse({ description: 'The credentials are invalid.' })
  @HttpCode(HttpStatus.OK)
  login(@Body() loginDto: LoginDto, @Req() request: Request) {
    return this.authService.login(loginDto, request.ip);
  }

  @Post('auth/refresh')
  @ApiOperation({ summary: 'Refresh an existing auth session using a refresh token.' })
  @ApiOkResponse({
    description: 'A new access and refresh token pair was issued.',
    type: AuthSessionResponseDto,
  })
  @ApiBadRequestResponse({ description: 'The refresh token payload is invalid.' })
  @ApiUnauthorizedResponse({ description: 'The refresh token is invalid or expired.' })
  @HttpCode(HttpStatus.OK)
  refresh(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refresh(refreshTokenDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('auth/me')
  @ApiOperation({ summary: 'Get the currently authenticated user from the bearer token.' })
  @ApiBearerAuth('access-token')
  @ApiOkResponse({
    description: 'The authenticated user identity extracted from the JWT.',
    type: AuthenticatedUserResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  me(@Req() request: Request) {
    return request.user;
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin')
  @Post('admin/staff-accounts')
  @ApiOperation({ summary: 'Provision a new staff identity and credential pair.' })
  @ApiBearerAuth('access-token')
  @ApiCreatedResponse({
    description: 'The staff account was provisioned successfully.',
    type: UserResponseDto,
  })
  @ApiBadRequestResponse({ description: 'The staff payload is invalid.' })
  @ApiConflictResponse({ description: 'The email or staff code already exists.' })
  @ApiForbiddenResponse({ description: 'Only super admins can provision staff accounts.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  createStaffAccount(@Body() payload: CreateStaffAccountDto) {
    return this.authService.provisionStaffAccount(payload);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin')
  @Patch('admin/staff-accounts/:id/status')
  @ApiOperation({ summary: 'Activate or deactivate a staff account without deleting its history.' })
  @ApiBearerAuth('access-token')
  @ApiParam({
    name: 'id',
    description: 'User identifier for the staff account being managed.',
    example: 'a3cce1f2-a6eb-4fdd-bf11-8b17d3ddfc17',
  })
  @ApiOkResponse({
    description: 'The updated staff identity record.',
    type: UserResponseDto,
  })
  @ApiBadRequestResponse({ description: 'The target user is not a staff account or the payload is invalid.' })
  @ApiForbiddenResponse({ description: 'Only super admins can change staff account status.' })
  @ApiNotFoundResponse({ description: 'User not found.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  updateStaffAccountStatus(
    @Param('id') userId: string,
    @Body() payload: UpdateStaffAccountStatusDto,
  ) {
    return this.authService.updateStaffAccountStatus(userId, payload);
  }
}
