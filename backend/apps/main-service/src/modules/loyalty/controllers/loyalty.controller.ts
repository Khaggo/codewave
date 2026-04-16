import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { Roles } from '@main-modules/auth/decorators/roles.decorator';
import { JwtAuthGuard } from '@main-modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@main-modules/auth/guards/roles.guard';

import { CreateRewardDto } from '../dto/create-reward.dto';
import { LoyaltyAccountResponseDto } from '../dto/loyalty-account-response.dto';
import { LoyaltyTransactionResponseDto } from '../dto/loyalty-transaction-response.dto';
import { RedeemRewardDto } from '../dto/redeem-reward.dto';
import { RewardRedemptionResponseDto } from '../dto/reward-redemption-response.dto';
import { RewardResponseDto } from '../dto/reward-response.dto';
import { UpdateRewardDto } from '../dto/update-reward.dto';
import { UpdateRewardStatusDto } from '../dto/update-reward-status.dto';
import { LoyaltyService } from '../services/loyalty.service';

@ApiTags('loyalty')
@Controller()
export class LoyaltyController {
  constructor(private readonly loyaltyService: LoyaltyService) {}

  @Get('loyalty/accounts/:userId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('customer', 'service_adviser', 'super_admin')
  @ApiOperation({ summary: 'Read the current loyalty balance for a user.' })
  @ApiBearerAuth('access-token')
  @ApiParam({
    name: 'userId',
    description: 'User identifier.',
    example: 'a3cce1f2-a6eb-4fdd-bf11-8b17d3ddfc17',
  })
  @ApiOkResponse({
    description: 'The current loyalty account state.',
    type: LoyaltyAccountResponseDto,
  })
  @ApiForbiddenResponse({ description: 'Customers can only access their own loyalty account.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  getAccount(@Param('userId') userId: string, @Req() request: Request) {
    return this.loyaltyService.getAccount(userId, request.user as { userId: string; role: string });
  }

  @Get('loyalty/accounts/:userId/transactions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('customer', 'service_adviser', 'super_admin')
  @ApiOperation({ summary: 'List loyalty ledger transactions for a user.' })
  @ApiBearerAuth('access-token')
  @ApiParam({
    name: 'userId',
    description: 'User identifier.',
    example: 'a3cce1f2-a6eb-4fdd-bf11-8b17d3ddfc17',
  })
  @ApiOkResponse({
    description: 'Ordered loyalty transactions for the account.',
    type: LoyaltyTransactionResponseDto,
    isArray: true,
  })
  @ApiForbiddenResponse({ description: 'Customers can only access their own loyalty transactions.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  listTransactions(@Param('userId') userId: string, @Req() request: Request) {
    return this.loyaltyService.listTransactions(
      userId,
      request.user as { userId: string; role: string },
    );
  }

  @Get('loyalty/rewards')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('customer', 'technician', 'service_adviser', 'super_admin')
  @ApiOperation({ summary: 'List the visible loyalty reward catalog.' })
  @ApiBearerAuth('access-token')
  @ApiOkResponse({
    description: 'Rewards visible to the current actor.',
    type: RewardResponseDto,
    isArray: true,
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  listRewards(@Req() request: Request) {
    return this.loyaltyService.listRewards(request.user as { userId: string; role: string });
  }

  @Post('loyalty/redemptions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('customer', 'service_adviser', 'super_admin')
  @ApiOperation({ summary: 'Redeem a reward against a loyalty balance.' })
  @ApiBearerAuth('access-token')
  @ApiCreatedResponse({
    description: 'Reward redemption was recorded successfully.',
    type: RewardRedemptionResponseDto,
  })
  @ApiBadRequestResponse({ description: 'The submitted redemption payload is invalid.' })
  @ApiConflictResponse({ description: 'Reward is inactive or points are insufficient.' })
  @ApiForbiddenResponse({ description: 'Customers can only redeem rewards for their own account.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  redeemReward(@Body() payload: RedeemRewardDto, @Req() request: Request) {
    return this.loyaltyService.redeemReward(payload, request.user as { userId: string; role: string });
  }

  @Post('admin/loyalty/rewards')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin')
  @ApiOperation({ summary: 'Create a reward catalog entry.' })
  @ApiBearerAuth('access-token')
  @ApiCreatedResponse({
    description: 'Reward catalog entry was created successfully.',
    type: RewardResponseDto,
  })
  @ApiBadRequestResponse({ description: 'The submitted reward payload is invalid.' })
  @ApiForbiddenResponse({ description: 'Only super admins can manage reward catalog entries.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  createReward(@Body() payload: CreateRewardDto, @Req() request: Request) {
    return this.loyaltyService.createReward(payload, request.user as { userId: string; role: string });
  }

  @Patch('admin/loyalty/rewards/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin')
  @ApiOperation({ summary: 'Update reward catalog details without rewriting ledger history.' })
  @ApiBearerAuth('access-token')
  @ApiParam({
    name: 'id',
    description: 'Reward identifier.',
    example: '5ec0acb3-d4ed-4378-b0f9-a6fe4c4a741a',
  })
  @ApiOkResponse({
    description: 'The updated reward catalog entry.',
    type: RewardResponseDto,
  })
  @ApiBadRequestResponse({ description: 'The submitted reward update is invalid.' })
  @ApiForbiddenResponse({ description: 'Only super admins can manage reward catalog entries.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  updateReward(
    @Param('id') id: string,
    @Body() payload: UpdateRewardDto,
    @Req() request: Request,
  ) {
    return this.loyaltyService.updateReward(id, payload, request.user as { userId: string; role: string });
  }

  @Patch('admin/loyalty/rewards/:id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin')
  @ApiOperation({ summary: 'Activate or deactivate a reward catalog entry with audit trail.' })
  @ApiBearerAuth('access-token')
  @ApiParam({
    name: 'id',
    description: 'Reward identifier.',
    example: '5ec0acb3-d4ed-4378-b0f9-a6fe4c4a741a',
  })
  @ApiOkResponse({
    description: 'The reward catalog entry with updated activation state.',
    type: RewardResponseDto,
  })
  @ApiBadRequestResponse({ description: 'The submitted reward status payload is invalid.' })
  @ApiForbiddenResponse({ description: 'Only super admins can manage reward catalog entries.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  updateRewardStatus(
    @Param('id') id: string,
    @Body() payload: UpdateRewardStatusDto,
    @Req() request: Request,
  ) {
    return this.loyaltyService.updateRewardStatus(
      id,
      payload,
      request.user as { userId: string; role: string },
    );
  }
}
