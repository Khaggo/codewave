import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
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

import { NotificationPreferencesResponseDto } from '../dto/notification-preferences-response.dto';
import { NotificationResponseDto } from '../dto/notification-response.dto';
import { UpdateNotificationPreferencesDto } from '../dto/update-notification-preferences.dto';
import { NotificationsService } from '../services/notifications.service';

@ApiTags('notifications')
@Controller()
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('users/:id/notification-preferences')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('customer', 'service_adviser', 'super_admin')
  @ApiOperation({ summary: 'Read notification channel and reminder preferences for a user.' })
  @ApiBearerAuth('access-token')
  @ApiParam({
    name: 'id',
    description: 'User identifier.',
    example: 'a3cce1f2-a6eb-4fdd-bf11-8b17d3ddfc17',
  })
  @ApiOkResponse({
    description: 'The current notification preferences for the user.',
    type: NotificationPreferencesResponseDto,
  })
  @ApiForbiddenResponse({ description: 'Customers can only access their own notification preferences.' })
  @ApiNotFoundResponse({ description: 'User not found.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  getPreferences(@Param('id') id: string, @Req() request: Request) {
    return this.notificationsService.getPreferences(id, request.user as { userId: string; role: string });
  }

  @Patch('users/:id/notification-preferences')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('customer', 'service_adviser', 'super_admin')
  @ApiOperation({ summary: 'Update notification channel and reminder preferences for a user.' })
  @ApiBearerAuth('access-token')
  @ApiParam({
    name: 'id',
    description: 'User identifier.',
    example: 'a3cce1f2-a6eb-4fdd-bf11-8b17d3ddfc17',
  })
  @ApiOkResponse({
    description: 'The updated notification preferences for the user.',
    type: NotificationPreferencesResponseDto,
  })
  @ApiBadRequestResponse({ description: 'The submitted preference payload is invalid.' })
  @ApiForbiddenResponse({ description: 'Customers can only manage their own notification preferences.' })
  @ApiNotFoundResponse({ description: 'User not found.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  updatePreferences(
    @Param('id') id: string,
    @Body() payload: UpdateNotificationPreferencesDto,
    @Req() request: Request,
  ) {
    return this.notificationsService.updatePreferences(
      id,
      payload,
      request.user as { userId: string; role: string },
    );
  }

  @Get('users/:id/notifications')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('customer', 'service_adviser', 'super_admin')
  @ApiOperation({ summary: 'List operational notifications for a user.' })
  @ApiBearerAuth('access-token')
  @ApiParam({
    name: 'id',
    description: 'User identifier.',
    example: 'a3cce1f2-a6eb-4fdd-bf11-8b17d3ddfc17',
  })
  @ApiOkResponse({
    description: 'Notifications attached to the user account.',
    type: NotificationResponseDto,
    isArray: true,
  })
  @ApiForbiddenResponse({ description: 'Customers can only access their own notification history.' })
  @ApiNotFoundResponse({ description: 'User not found.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  listNotifications(@Param('id') id: string, @Req() request: Request) {
    return this.notificationsService.listNotifications(id, request.user as { userId: string; role: string });
  }

  @Patch('users/:id/notifications/:notificationId/read')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('customer', 'service_adviser', 'super_admin')
  @ApiOperation({ summary: 'Mark one notification as read.' })
  @ApiBearerAuth('access-token')
  markNotificationRead(
    @Param('id') id: string,
    @Param('notificationId') notificationId: string,
    @Req() request: Request,
  ) {
    return this.notificationsService.markNotificationRead(
      id,
      notificationId,
      request.user as { userId: string; role: string },
    );
  }

  @Post('users/:id/notifications/read-all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('customer', 'service_adviser', 'super_admin')
  @ApiOperation({ summary: 'Mark all notifications as read.' })
  @ApiBearerAuth('access-token')
  markAllNotificationsRead(@Param('id') id: string, @Req() request: Request) {
    return this.notificationsService.markAllNotificationsRead(
      id,
      request.user as { userId: string; role: string },
    );
  }

  @Patch('users/:id/notifications/:notificationId/archive')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('customer', 'service_adviser', 'super_admin')
  @ApiOperation({ summary: 'Archive one notification without changing its read state.' })
  @ApiBearerAuth('access-token')
  archiveNotification(
    @Param('id') id: string,
    @Param('notificationId') notificationId: string,
    @Req() request: Request,
  ) {
    return this.notificationsService.archiveNotification(
      id,
      notificationId,
      request.user as { userId: string; role: string },
    );
  }

  @Post('users/:id/notifications/archive-all-read')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('customer', 'service_adviser', 'super_admin')
  @ApiOperation({ summary: 'Archive all read notifications without changing read timestamps.' })
  @ApiBearerAuth('access-token')
  archiveAllReadNotifications(@Param('id') id: string, @Req() request: Request) {
    return this.notificationsService.archiveAllReadNotifications(
      id,
      request.user as { userId: string; role: string },
    );
  }
}
