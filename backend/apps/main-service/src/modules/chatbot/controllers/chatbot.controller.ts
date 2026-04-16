import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { Roles } from '@main-modules/auth/decorators/roles.decorator';
import { JwtAuthGuard } from '@main-modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@main-modules/auth/guards/roles.guard';

import { CreateChatbotEscalationDto } from '../dto/create-chatbot-escalation.dto';
import { CreateChatbotMessageDto } from '../dto/create-chatbot-message.dto';
import { ChatbotEscalationResponseDto } from '../dto/chatbot-escalation-response.dto';
import { ChatbotIntentResponseDto } from '../dto/chatbot-intent-response.dto';
import { ChatbotMessageResponseDto } from '../dto/chatbot-message-response.dto';
import { ChatbotService } from '../services/chatbot.service';

@ApiTags('chatbot')
@Controller()
export class ChatbotController {
  constructor(private readonly chatbotService: ChatbotService) {}

  @Post('chatbot/messages')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('customer', 'technician', 'service_adviser', 'super_admin')
  @ApiOperation({ summary: 'Route a chatbot prompt through deterministic FAQ and lookup rules.' })
  @ApiBearerAuth('access-token')
  @ApiCreatedResponse({
    description: 'The chatbot message was processed and recorded.',
    type: ChatbotMessageResponseDto,
  })
  @ApiBadRequestResponse({ description: 'The chatbot message payload is invalid.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  createMessage(@Body() payload: CreateChatbotMessageDto, @Req() request: Request) {
    return this.chatbotService.sendMessage(payload, request.user as { userId: string; role: string });
  }

  @Get('chatbot/intents')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('service_adviser', 'super_admin')
  @ApiOperation({ summary: 'List active chatbot intents and keyword rules for staff review.' })
  @ApiBearerAuth('access-token')
  @ApiOkResponse({
    description: 'The active deterministic chatbot intents.',
    type: ChatbotIntentResponseDto,
    isArray: true,
  })
  @ApiForbiddenResponse({ description: 'Only service advisers or super admins can review chatbot intents.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  listIntents(@Req() request: Request) {
    return this.chatbotService.listIntents(request.user as { userId: string; role: string });
  }

  @Post('chatbot/escalations')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('customer', 'technician', 'service_adviser', 'super_admin')
  @ApiOperation({ summary: 'Open a manual chatbot escalation for a prompt that needs staff follow-up.' })
  @ApiBearerAuth('access-token')
  @ApiCreatedResponse({
    description: 'The escalation was opened successfully.',
    type: ChatbotEscalationResponseDto,
  })
  @ApiBadRequestResponse({ description: 'The escalation payload is invalid.' })
  @ApiForbiddenResponse({ description: 'You can only escalate chatbot conversations that belong to your account.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  createEscalation(@Body() payload: CreateChatbotEscalationDto, @Req() request: Request) {
    return this.chatbotService.createEscalation(
      payload,
      request.user as { userId: string; role: string },
    );
  }
}
