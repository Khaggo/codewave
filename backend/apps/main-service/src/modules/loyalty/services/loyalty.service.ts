import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { UsersService } from '@main-modules/users/services/users.service';
import {
  AnyCommerceEventEnvelope,
} from '@shared/events/contracts/commerce-events';
import {
  AnyServiceEventEnvelope,
  isServiceEventEnvelope,
} from '@shared/events/contracts/service-events';
import {
  LoyaltyAccrualPlan,
  LoyaltyAccrualPlannerService,
} from '@shared/events/loyalty-accrual-planner.service';

import { CreateEarningRuleDto } from '../dto/create-earning-rule.dto';
import { CreateRewardDto } from '../dto/create-reward.dto';
import { UpdateEarningRuleDto } from '../dto/update-earning-rule.dto';
import { UpdateEarningRuleStatusDto } from '../dto/update-earning-rule-status.dto';
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

  async listEarningRules(actor: LoyaltyActor) {
    await this.assertSuperAdminActor(actor.userId);
    return this.loyaltyRepository.listEarningRules({ includeInactive: true });
  }

  async createEarningRule(payload: CreateEarningRuleDto, actor: LoyaltyActor) {
    const resolvedActor = await this.assertSuperAdminActor(actor.userId);
    this.assertValidEarningRuleConfiguration(payload);
    return this.loyaltyRepository.createEarningRule({
      ...payload,
      actorUserId: resolvedActor.id,
    });
  }

  async updateEarningRule(id: string, payload: UpdateEarningRuleDto, actor: LoyaltyActor) {
    const resolvedActor = await this.assertSuperAdminActor(actor.userId);
    const existingRule = await this.loyaltyRepository.findEarningRuleById(id);
    this.assertValidEarningRuleConfiguration({
      ...existingRule,
      ...payload,
      activeFrom:
        payload.activeFrom !== undefined
          ? payload.activeFrom
          : existingRule.activeFrom?.toISOString() ?? undefined,
      activeUntil:
        payload.activeUntil !== undefined
          ? payload.activeUntil
          : existingRule.activeUntil?.toISOString() ?? undefined,
    });

    return this.loyaltyRepository.updateEarningRule(id, {
      ...payload,
      actorUserId: resolvedActor.id,
    });
  }

  async updateEarningRuleStatus(id: string, payload: UpdateEarningRuleStatusDto, actor: LoyaltyActor) {
    const resolvedActor = await this.assertSuperAdminActor(actor.userId);
    return this.loyaltyRepository.updateEarningRuleStatus(id, {
      ...payload,
      actorUserId: resolvedActor.id,
    });
  }

  async applyLoyaltyAccrual(
    trigger: AnyServiceEventEnvelope | AnyCommerceEventEnvelope | LoyaltyAccrualPlan,
  ) {
    const plan = this.isAccrualPlan(trigger)
      ? trigger
      : this.loyaltyAccrualPlanner.parseAndPlan(trigger);

    if (!plan) {
      return {
        account: await this.loyaltyRepository.getOrCreateAccount(this.getLoyaltyUserId(trigger)),
        transaction: null,
        wasDuplicate: false,
        wasAwarded: false,
        awardedPoints: 0,
        appliedRuleIds: [],
      };
    }

    const user = await this.usersService.findById(plan.loyaltyUserId);
    if (!user || !user.isActive) {
      throw new NotFoundException('Loyalty account user not found');
    }

    const ruleEvaluation = await this.evaluateEarningRules(plan);
    if (ruleEvaluation.pointsAwarded <= 0) {
      return {
        account: await this.loyaltyRepository.getOrCreateAccount(plan.loyaltyUserId),
        transaction: null,
        wasDuplicate: false,
        wasAwarded: false,
        awardedPoints: 0,
        appliedRuleIds: [],
      };
    }

    return this.loyaltyRepository.applyAccrual({
      plan,
      pointsAwarded: ruleEvaluation.pointsAwarded,
      occurredAt: this.getOccurredAt(trigger),
      metadata: {
        appliedRuleIds: ruleEvaluation.appliedRuleIds,
      },
    });
  }

  private async evaluateEarningRules(plan: LoyaltyAccrualPlan) {
    const rules = await this.loyaltyRepository.listActiveEarningRules(this.getOccurredAt(plan) ?? new Date());
    const appliedRuleIds: string[] = [];
    let pointsAwarded = 0;

    for (const rule of rules) {
      if (!this.ruleMatchesAccrual(rule, plan)) {
        continue;
      }

      const awardedByRule =
        rule.formulaType === 'flat_points'
          ? rule.flatPoints ?? 0
          : Math.floor(plan.pointsInput.amountCents / (rule.amountStepCents ?? Number.MAX_SAFE_INTEGER)) *
            (rule.pointsPerStep ?? 0);

      if (awardedByRule <= 0) {
        continue;
      }

      pointsAwarded += awardedByRule;
      appliedRuleIds.push(rule.id);
    }

    return {
      pointsAwarded,
      appliedRuleIds,
    };
  }

  private getOccurredAt(
    trigger: AnyServiceEventEnvelope | AnyCommerceEventEnvelope | LoyaltyAccrualPlan,
  ) {
    if (this.isAccrualPlan(trigger)) {
      return new Date(trigger.pointsInput.paidAt);
    }

    if (trigger.name === 'service.payment_recorded') {
      return new Date(trigger.payload.paidAt);
    }

    if (trigger.name === 'invoice.payment_recorded') {
      return new Date(trigger.payload.receivedAt);
    }

    throw new ConflictException(`Unsupported loyalty trigger: ${trigger.name}`);
  }

  private isAccrualPlan(value: unknown): value is LoyaltyAccrualPlan {
    return Boolean(
      value &&
        typeof value === 'object' &&
        'idempotencyKey' in value &&
        'sourceReference' in value &&
        'accrualKind' in value &&
        !isServiceEventEnvelope(value),
    );
  }

  private getLoyaltyUserId(
    trigger: AnyServiceEventEnvelope | AnyCommerceEventEnvelope | LoyaltyAccrualPlan,
  ) {
    if (this.isAccrualPlan(trigger)) {
      return trigger.loyaltyUserId;
    }

    return trigger.payload.customerUserId;
  }

  private ruleMatchesAccrual(
    rule: Awaited<ReturnType<LoyaltyRepository['findEarningRuleById']>>,
    plan: LoyaltyAccrualPlan,
  ) {
    if (!this.ruleMatchesAccrualSource(rule.accrualSource, plan.pointsInput.mode)) {
      return false;
    }

    if (
      rule.minimumAmountCents !== null &&
      rule.minimumAmountCents !== undefined &&
      plan.pointsInput.amountCents < rule.minimumAmountCents
    ) {
      return false;
    }

    if (plan.pointsInput.mode === 'service_payment') {
      return this.ruleMatchesServicePayment(rule, plan);
    }

    return this.ruleMatchesEcommercePayment(rule, plan);
  }

  private ruleMatchesAccrualSource(
    accrualSource: 'service' | 'ecommerce' | 'both',
    mode: LoyaltyAccrualPlan['pointsInput']['mode'],
  ) {
    if (accrualSource === 'both') {
      return true;
    }

    return (
      (accrualSource === 'service' && mode === 'service_payment') ||
      (accrualSource === 'ecommerce' && mode === 'ecommerce_payment')
    );
  }

  private ruleMatchesServicePayment(
    rule: Awaited<ReturnType<LoyaltyRepository['findEarningRuleById']>>,
    plan: LoyaltyAccrualPlan,
  ) {
    if (plan.pointsInput.mode !== 'service_payment') {
      throw new ConflictException('Service-payment loyalty plan is missing service payment details');
    }

    if (
      rule.eligibleServiceTypes.length > 0 &&
      (!plan.pointsInput.serviceTypeCode ||
        !rule.eligibleServiceTypes.includes(plan.pointsInput.serviceTypeCode))
    ) {
      return false;
    }

    if (
      rule.eligibleServiceCategories.length > 0 &&
      (!plan.pointsInput.serviceCategoryCode ||
        !rule.eligibleServiceCategories.includes(plan.pointsInput.serviceCategoryCode))
    ) {
      return false;
    }

    return true;
  }

  private ruleMatchesEcommercePayment(
    rule: Awaited<ReturnType<LoyaltyRepository['findEarningRuleById']>>,
    plan: LoyaltyAccrualPlan,
  ) {
    const pointsInput = plan.pointsInput;
    if (pointsInput.mode !== 'ecommerce_payment') {
      throw new ConflictException('Ecommerce loyalty plan is missing ecommerce payment details');
    }

    if (
      rule.eligibleProductIds.length > 0 &&
      !rule.eligibleProductIds.some((productId) => pointsInput.productIds.includes(productId))
    ) {
      return false;
    }

    if (
      rule.eligibleProductCategoryIds.length > 0 &&
      !rule.eligibleProductCategoryIds.some((categoryId) =>
        pointsInput.productCategoryIds.includes(categoryId),
      )
    ) {
      return false;
    }

    return true;
  }

  private assertValidEarningRuleConfiguration(payload: {
    formulaType: 'flat_points' | 'amount_ratio';
    flatPoints?: number | null;
    amountStepCents?: number | null;
    pointsPerStep?: number | null;
    activeFrom?: string | null;
    activeUntil?: string | null;
  }) {
    if (payload.formulaType === 'flat_points') {
      if (!payload.flatPoints || payload.flatPoints <= 0) {
        throw new ConflictException('Flat-point earning rules require a positive flatPoints value');
      }
    }

    if (payload.formulaType === 'amount_ratio') {
      if (!payload.amountStepCents || payload.amountStepCents <= 0) {
        throw new ConflictException('Amount-ratio earning rules require a positive amountStepCents value');
      }

      if (!payload.pointsPerStep || payload.pointsPerStep <= 0) {
        throw new ConflictException('Amount-ratio earning rules require a positive pointsPerStep value');
      }
    }

    if (payload.activeFrom && payload.activeUntil) {
      const activeFrom = new Date(payload.activeFrom);
      const activeUntil = new Date(payload.activeUntil);

      if (activeFrom.getTime() > activeUntil.getTime()) {
        throw new ConflictException('activeFrom cannot be later than activeUntil');
      }
    }
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
