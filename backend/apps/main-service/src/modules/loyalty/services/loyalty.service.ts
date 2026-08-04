import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { UsersService } from '@main-modules/users/services/users.service';
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

type LoyaltyTransactionRecord = Awaited<
  ReturnType<LoyaltyRepository['listTransactionsByUserId']>
>[number];
type LoyaltyEarningRuleRecord = Awaited<
  ReturnType<LoyaltyRepository['listEarningRules']>
>[number];

const DEFAULT_SERVICE_PAYMENT_RULE_PROMO_LABEL = 'SYSTEM_DEFAULT_SERVICE_PAYMENT_V1';
const DEFAULT_SERVICE_PAYMENT_RULE_REASON =
  'Automatically provisioned default service-payment loyalty rule.';
const CURRENT_LOYALTY_SOURCE_TYPES = new Set([
  'service_payment',
  'service_invoice',
  'reward_redemption',
  'manual_adjustment',
  'service_reversal',
]);

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
    const transactions = await this.loyaltyRepository.listTransactionsByUserId(userId);
    return transactions.map((transaction) => this.toCurrentTransaction(transaction));
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
    const rules = await this.loyaltyRepository.listEarningRules({ includeInactive: true });
    return rules.map((rule) => this.toServiceEarningRule(rule));
  }

  async createEarningRule(payload: CreateEarningRuleDto, actor: LoyaltyActor) {
    const resolvedActor = await this.assertSuperAdminActor(actor.userId);
    this.assertValidEarningRuleConfiguration(payload);
    const rule = await this.loyaltyRepository.createEarningRule({
      ...payload,
      actorUserId: resolvedActor.id,
    });
    return this.toServiceEarningRule(rule);
  }

  async updateEarningRule(id: string, payload: UpdateEarningRuleDto, actor: LoyaltyActor) {
    const resolvedActor = await this.assertSuperAdminActor(actor.userId);
    const existingRule = await this.loyaltyRepository.findEarningRuleById(id);
    if (existingRule.accrualSource !== 'service') {
      throw new NotFoundException('Earning rule not found');
    }
    this.assertValidEarningRuleConfiguration({
      ...existingRule,
      ...payload,
      accrualSource: payload.accrualSource ?? 'service',
      activeFrom:
        payload.activeFrom !== undefined
          ? payload.activeFrom
          : existingRule.activeFrom?.toISOString() ?? undefined,
      activeUntil:
        payload.activeUntil !== undefined
          ? payload.activeUntil
          : existingRule.activeUntil?.toISOString() ?? undefined,
    });

    const rule = await this.loyaltyRepository.updateEarningRule(id, {
      ...payload,
      actorUserId: resolvedActor.id,
    });
    return this.toServiceEarningRule(rule);
  }

  async updateEarningRuleStatus(id: string, payload: UpdateEarningRuleStatusDto, actor: LoyaltyActor) {
    const resolvedActor = await this.assertSuperAdminActor(actor.userId);
    const rule = await this.loyaltyRepository.updateEarningRuleStatus(id, {
      ...payload,
      actorUserId: resolvedActor.id,
    });
    return this.toServiceEarningRule(rule);
  }

  async ensureDefaultServicePaymentRule(actor: LoyaltyActor) {
    const resolvedActor = await this.assertSuperAdminActor(actor.userId);
    const existingRules = await this.loyaltyRepository.listEarningRules({ includeInactive: true });
    const defaultRule = existingRules.find(
      (rule) => rule.promoLabel === DEFAULT_SERVICE_PAYMENT_RULE_PROMO_LABEL,
    );

    const defaultPayload = {
      name: 'Default service payment points',
      description: 'Automatically award 1 point for every PHP100 on paid service invoices.',
      accrualSource: 'service' as const,
      formulaType: 'amount_ratio' as const,
      amountStepCents: 10_000,
      pointsPerStep: 1,
      minimumAmountCents: undefined,
      eligibleServiceTypes: [] as string[],
      eligibleServiceCategories: [] as string[],
      promoLabel: DEFAULT_SERVICE_PAYMENT_RULE_PROMO_LABEL,
      activeFrom: undefined,
      activeUntil: undefined,
      status: 'active' as const,
      reason: DEFAULT_SERVICE_PAYMENT_RULE_REASON,
    };

    if (!defaultRule) {
      const createdRule = await this.loyaltyRepository.createEarningRule({
        ...defaultPayload,
        actorUserId: resolvedActor.id,
      });
      return this.toServiceEarningRule(createdRule);
    }

    const updatedRule = await this.loyaltyRepository.updateEarningRule(defaultRule.id, {
      ...defaultPayload,
      actorUserId: resolvedActor.id,
    });

    if (updatedRule.status !== 'active') {
      const activeRule = await this.loyaltyRepository.updateEarningRuleStatus(defaultRule.id, {
        status: 'active',
        reason: DEFAULT_SERVICE_PAYMENT_RULE_REASON,
        actorUserId: resolvedActor.id,
      });
      return this.toServiceEarningRule(activeRule);
    }

    return this.toServiceEarningRule(updatedRule);
  }

  async applyLoyaltyAccrual(
    trigger: AnyServiceEventEnvelope | LoyaltyAccrualPlan,
  ) {
    const plan = this.isAccrualPlan(trigger)
      ? trigger
      : this.loyaltyAccrualPlanner.parseAndPlan(trigger);

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
    trigger: AnyServiceEventEnvelope | LoyaltyAccrualPlan,
  ) {
    if (this.isAccrualPlan(trigger)) {
      return new Date(trigger.pointsInput.paidAt);
    }

    if (trigger.name === 'service.payment_recorded') {
      return new Date(trigger.payload.paidAt);
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

    return this.ruleMatchesServicePayment(rule, plan);
  }

  private ruleMatchesAccrualSource(
    accrualSource: LoyaltyEarningRuleRecord['accrualSource'],
    _mode: LoyaltyAccrualPlan['pointsInput']['mode'],
  ) {
    return accrualSource === 'service';
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

  private assertValidEarningRuleConfiguration(payload: {
    accrualSource: 'service';
    formulaType: 'flat_points' | 'amount_ratio';
    flatPoints?: number | null;
    amountStepCents?: number | null;
    pointsPerStep?: number | null;
    activeFrom?: string | null;
    activeUntil?: string | null;
  }) {
    if (payload.accrualSource !== 'service') {
      throw new ConflictException('Only service-payment loyalty rules are supported');
    }

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

  private toCurrentTransaction(transaction: LoyaltyTransactionRecord) {
    if (CURRENT_LOYALTY_SOURCE_TYPES.has(transaction.sourceType)) {
      return transaction;
    }

    return {
      ...transaction,
      sourceType: 'manual_adjustment' as const,
      idempotencyKey: null,
      policyKey: null,
      metadata: { migratedLegacyAccrual: true },
    };
  }

  private toServiceEarningRule(rule: LoyaltyEarningRuleRecord) {
    return {
      id: rule.id,
      name: rule.name,
      description: rule.description,
      accrualSource: 'service' as const,
      formulaType: rule.formulaType,
      flatPoints: rule.flatPoints,
      amountStepCents: rule.amountStepCents,
      pointsPerStep: rule.pointsPerStep,
      minimumAmountCents: rule.minimumAmountCents,
      eligibleServiceTypes: rule.eligibleServiceTypes,
      eligibleServiceCategories: rule.eligibleServiceCategories,
      promoLabel: rule.promoLabel,
      manualBenefitNote: rule.manualBenefitNote,
      activeFrom: rule.activeFrom,
      activeUntil: rule.activeUntil,
      status: rule.status,
      createdByUserId: rule.createdByUserId,
      updatedByUserId: rule.updatedByUserId,
      createdAt: rule.createdAt,
      updatedAt: rule.updatedAt,
      audits: (rule.audits ?? []).map((audit) => ({
        id: audit.id,
        earningRuleId: audit.earningRuleId,
        actorUserId: audit.actorUserId,
        action: audit.action,
        reason: audit.reason,
        snapshot: {
          name: audit.snapshot.name,
          description: audit.snapshot.description,
          accrualSource: 'service' as const,
          formulaType: audit.snapshot.formulaType,
          flatPoints: audit.snapshot.flatPoints,
          amountStepCents: audit.snapshot.amountStepCents,
          pointsPerStep: audit.snapshot.pointsPerStep,
          minimumAmountCents: audit.snapshot.minimumAmountCents,
          eligibleServiceTypes: audit.snapshot.eligibleServiceTypes,
          eligibleServiceCategories: audit.snapshot.eligibleServiceCategories,
          promoLabel: audit.snapshot.promoLabel,
          manualBenefitNote: audit.snapshot.manualBenefitNote,
          activeFrom: audit.snapshot.activeFrom,
          activeUntil: audit.snapshot.activeUntil,
          status: audit.snapshot.status,
        },
        createdAt: audit.createdAt,
      })),
    };
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
