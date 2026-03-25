import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { AuthenticatedUserResponseDto } from '../dto/authenticated-user-response.dto';
import { AuthSessionResponseDto } from '../dto/auth-session-response.dto';
import { LoginDto } from '../dto/login.dto';
import { RefreshTokenDto } from '../dto/refresh-token.dto';
import { RegisterDto } from '../dto/register.dto';
import { AuthService } from '../services/auth.service';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
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

  @Post('login')
  @ApiOperation({ summary: 'Authenticate a user and issue access + refresh tokens.' })
  @ApiOkResponse({
    description: 'Login succeeded.',
    type: AuthSessionResponseDto,
  })
  @ApiBadRequestResponse({ description: 'The login payload is invalid.' })
  @ApiUnauthorizedResponse({ description: 'The credentials are invalid.' })
  login(@Body() loginDto: LoginDto, @Req() request: Request) {
    return this.authService.login(loginDto, request.ip);
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Refresh an existing auth session using a refresh token.' })
  @ApiOkResponse({
    description: 'A new access and refresh token pair was issued.',
    type: AuthSessionResponseDto,
  })
  @ApiBadRequestResponse({ description: 'The refresh token payload is invalid.' })
  @ApiUnauthorizedResponse({ description: 'The refresh token is invalid or expired.' })
  refresh(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refresh(refreshTokenDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
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
}
