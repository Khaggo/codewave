import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { UsersService } from '@main-modules/users/services/users.service';
import {
  AnyCommerceEventEnvelope,
  isCommerceEventEnvelope,
} from '@shared/events/contracts/commerce-events';
import {
  AnyServiceEventEnvelope,
  isServiceEventEnvelope,
} from '@shared/events/contracts/service-events';
import {
  LoyaltyAccrualPlan,
  LoyaltyAccrualPlannerService,
} from '@shared/events/loyalty-accrual-planner.service';

import { CreateRewardDto } from '../dto/create-reward.dto';
import { RedeemRewardDto } from '../dto/redeem-reward.dto';
import { UpdateRewardDto } from '../dto/update-reward.dto';
import { UpdateRewardStatusDto } from '../dto/update-reward-status.dto';
import { LoyaltyRepository } from '../repositories/loyalty.repository';

type LoyaltyActor = {
  userId: string;
  role: string;
};

@Injectable()
export class LoyaltyService {
  constructor(
    private readonly loyaltyRepository: LoyaltyRepository,
    private readonly usersService: UsersService,
    private readonly loyaltyAccrualPlanner: LoyaltyAccrualPlannerService,
  ) {}

  async getAccount(userId: string, actor: LoyaltyActor) {
    await this.assertCanAccessAccount(userId, actor);
    return this.loyaltyRepository.getOrCreateAccount(userId);
  }

  async listTransactions(userId: string, actor: LoyaltyActor) {
    await this.assertCanAccessAccount(userId, actor);
    return this.loyaltyRepository.listTransactionsByUserId(userId);
  }

  async listRewards(actor: LoyaltyActor) {
    const resolvedActor = await this.assertActiveActor(actor.userId);
    const rewards = await this.loyaltyRepository.listRewards({
      includeInactive: resolvedActor.role === 'super_admin',
    });

    if (resolvedActor.role === 'super_admin') {
      return rewards;
    }

    return rewards.map(({ audits: _audits, ...reward }) => reward);
  }

  async redeemReward(payload: RedeemRewardDto, actor: LoyaltyActor) {
    await this.assertRedemptionActor(payload.userId, actor);
    const reward = await this.loyaltyRepository.findRewardById(payload.rewardId);
    if (reward.status !== 'active') {
      throw new ConflictException('Only active rewards can be redeemed');
    }

    const account = await this.loyaltyRepository.getOrCreateAccount(payload.userId);
    if (account.pointsBalance < reward.pointsCost) {
      throw new ConflictException('Insufficient loyalty points for this reward');
    }

    const redemption = await this.loyaltyRepository.createRedemption({
      userId: payload.userId,
      rewardId: payload.rewardId,
      redeemedByUserId: actor.userId,
      note: payload.note ?? null,
    });

    return {
      ...redemption,
      userId: payload.userId,
      pointsBalanceAfter: redemption.transaction.resultingBalance,
    };
  }

  async createReward(payload: CreateRewardDto, actor: LoyaltyActor) {
    const resolvedActor = await this.assertSuperAdminActor(actor.userId);
    return this.loyaltyRepository.createReward({
      ...payload,
      actorUserId: resolvedActor.id,
    });
  }

  async updateReward(id: string, payload: UpdateRewardDto, actor: LoyaltyActor) {
    const resolvedActor = await this.assertSuperAdminActor(actor.userId);
    return this.loyaltyRepository.updateReward(id, {
      ...payload,
      actorUserId: resolvedActor.id,
    });
  }

  async updateRewardStatus(id: string, payload: UpdateRewardStatusDto, actor: LoyaltyActor) {
    const resolvedActor = await this.assertSuperAdminActor(actor.userId);
    return this.loyaltyRepository.updateRewardStatus(id, {
      ...payload,
      actorUserId: resolvedActor.id,
    });
  }

  async applyLoyaltyAccrual(trigger: AnyServiceEventEnvelope | AnyCommerceEventEnvelope | LoyaltyAccrualPlan) {
    const plan = this.isAccrualPlan(trigger)
      ? trigger
      : this.loyaltyAccrualPlanner.parseAndPlan(trigger);

    const user = await this.usersService.findById(plan.loyaltyUserId);
    if (!user || !user.isActive) {
      throw new NotFoundException('Loyalty account user not found');
    }

    return this.loyaltyRepository.applyAccrual({
      plan,
      pointsAwarded: this.calculateAwardedPoints(plan),
      occurredAt: this.getOccurredAt(trigger),
    });
  }

  private calculateAwardedPoints(plan: LoyaltyAccrualPlan) {
    if (plan.accrualKind === 'service_invoice') {
      return 100;
    }

    if (plan.pointsInput.mode !== 'payment_amount') {
      throw new ConflictException('Purchase accrual plan is missing payment amount details');
    }

    return Math.max(1, Math.floor(plan.pointsInput.amountCents / 5000));
  }

  private getOccurredAt(
    trigger: AnyServiceEventEnvelope | AnyCommerceEventEnvelope | LoyaltyAccrualPlan,
  ) {
    if (this.isAccrualPlan(trigger)) {
      return undefined;
    }

    return new Date(trigger.occurredAt);
  }

  private isAccrualPlan(value: unknown): value is LoyaltyAccrualPlan {
    return Boolean(
      value &&
        typeof value === 'object' &&
        'idempotencyKey' in value &&
        'sourceReference' in value &&
        'accrualKind' in value &&
        !isServiceEventEnvelope(value) &&
        !isCommerceEventEnvelope(value),
    );
  }

  private async assertCanAccessAccount(userId: string, actor: LoyaltyActor) {
    const resolvedActor = await this.assertActiveActor(actor.userId);
    const targetUser = await this.usersService.findById(userId);

    if (!targetUser || !targetUser.isActive) {
      throw new NotFoundException('Loyalty account user not found');
    }

    if (resolvedActor.role === 'customer' && resolvedActor.id !== targetUser.id) {
      throw new ForbiddenException('Customers can only access their own loyalty account');
    }

    if (!['customer', 'service_adviser', 'super_admin'].includes(resolvedActor.role)) {
      throw new ForbiddenException('Only customers, service advisers, or super admins can access loyalty accounts');
    }

    return targetUser;
  }

  private async assertRedemptionActor(userId: string, actor: LoyaltyActor) {
    const resolvedActor = await this.assertActiveActor(actor.userId);
    const targetUser = await this.usersService.findById(userId);

    if (!targetUser || !targetUser.isActive) {
      throw new NotFoundException('Loyalty account user not found');
    }

    if (!['customer', 'service_adviser', 'super_admin'].includes(resolvedActor.role)) {
      throw new ForbiddenException('Only customers, service advisers, or super admins can redeem rewards');
    }

    if (resolvedActor.role === 'customer' && resolvedActor.id !== userId) {
      throw new ForbiddenException('Customers can only redeem rewards for their own account');
    }

    return targetUser;
  }

  private async assertSuperAdminActor(userId: string) {
    const actor = await this.assertActiveActor(userId);
    if (actor.role !== 'super_admin') {
      throw new ForbiddenException('Only super admins can manage the reward catalog');
    }

    return actor;
  }

  private async assertActiveActor(userId: string) {
    const actor = await this.usersService.findById(userId);
    if (!actor || !actor.isActive) {
      throw new NotFoundException('Loyalty actor not found');
    }

    return actor;
  }
}
