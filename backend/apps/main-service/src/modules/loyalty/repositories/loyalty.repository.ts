import { and, desc, eq, gte, isNull, lte, or } from 'drizzle-orm';
import { Inject, Injectable } from '@nestjs/common';

import { BaseRepository } from '@shared/base/base.repository';
import { DRIZZLE_DB } from '@shared/db/database.constants';
import { AppDatabase } from '@shared/db/database.types';
import { LoyaltyAccrualPlan } from '@shared/events/loyalty-accrual-planner.service';

import { CreateEarningRuleDto } from '../dto/create-earning-rule.dto';
import { CreateRewardDto } from '../dto/create-reward.dto';
import { UpdateRewardDto } from '../dto/update-reward.dto';
import { UpdateRewardStatusDto } from '../dto/update-reward-status.dto';
import { UpdateEarningRuleDto } from '../dto/update-earning-rule.dto';
import { UpdateEarningRuleStatusDto } from '../dto/update-earning-rule-status.dto';
import {
  loyaltyEarningRuleAudits,
  loyaltyEarningRules,
  loyaltyAccounts,
  loyaltyTransactions,
  LoyaltyEarningRuleSnapshot,
  rewardCatalogAudits,
  RewardCatalogSnapshot,
  rewardRedemptions,
  rewards,
} from '../schemas/loyalty.schema';

type CreateRewardInput = CreateRewardDto & {
  actorUserId: string;
};

type CreateEarningRuleInput = CreateEarningRuleDto & {
  actorUserId: string;
};

type UpdateRewardInput = UpdateRewardDto & {
  actorUserId: string;
};

type UpdateEarningRuleInput = UpdateEarningRuleDto & {
  actorUserId: string;
};

type UpdateRewardStatusInput = UpdateRewardStatusDto & {
  actorUserId: string;
};

type UpdateEarningRuleStatusInput = UpdateEarningRuleStatusDto & {
  actorUserId: string;
};

type ApplyLoyaltyAccrualInput = {
  plan: LoyaltyAccrualPlan;
  pointsAwarded: number;
  occurredAt?: Date;
  metadata?: Record<string, unknown>;
};

type CreateRedemptionInput = {
  userId: string;
  rewardId: string;
  redeemedByUserId: string;
  note?: string | null;
};

@Injectable()
export class LoyaltyRepository extends BaseRepository {
  constructor(@Inject(DRIZZLE_DB) private readonly db: AppDatabase) {
    super();
  }

  async findAccountById(accountId: string, db: AppDatabase = this.db) {
    const account = await db.query.loyaltyAccounts.findFirst({
      where: eq(loyaltyAccounts.id, accountId),
    });

    return this.assertFound(account, 'Loyalty account not found');
  }

  async findAccountByUserId(userId: string, db: AppDatabase = this.db) {
    return (
      (await db.query.loyaltyAccounts.findFirst({
        where: eq(loyaltyAccounts.userId, userId),
      })) ?? null
    );
  }

  async getOrCreateAccount(userId: string, db: AppDatabase = this.db) {
    const existingAccount = await this.findAccountByUserId(userId, db);
    if (existingAccount) {
      return existingAccount;
    }

    const [createdAccount] = await db
      .insert(loyaltyAccounts)
      .values({
        userId,
      })
      .returning();

    return this.findAccountById(this.assertFound(createdAccount, 'Loyalty account not found').id, db);
  }

  async listTransactionsByUserId(userId: string) {
    const account = await this.getOrCreateAccount(userId);
    return this.db.query.loyaltyTransactions.findMany({
      where: eq(loyaltyTransactions.loyaltyAccountId, account.id),
      orderBy: [desc(loyaltyTransactions.createdAt), desc(loyaltyTransactions.id)],
    });
  }

  async listAccountsForAnalytics() {
    return this.db.query.loyaltyAccounts.findMany({
      orderBy: [desc(loyaltyAccounts.updatedAt), desc(loyaltyAccounts.id)],
    });
  }

  async listTransactionsForAnalytics() {
    return this.db.query.loyaltyTransactions.findMany({
      orderBy: [desc(loyaltyTransactions.createdAt), desc(loyaltyTransactions.id)],
    });
  }

  async listRewardRedemptionsForAnalytics() {
    return this.db.query.rewardRedemptions.findMany({
      orderBy: [desc(rewardRedemptions.createdAt), desc(rewardRedemptions.id)],
    });
  }

  async listRewards(options?: { includeInactive?: boolean }) {
    return this.db.query.rewards.findMany({
      where: options?.includeInactive ? undefined : eq(rewards.status, 'active'),
      orderBy: [desc(rewards.updatedAt), desc(rewards.id)],
      with: {
        audits: {
          orderBy: [desc(rewardCatalogAudits.createdAt), desc(rewardCatalogAudits.id)],
        },
      },
    });
  }

  async listEarningRules(options?: { includeInactive?: boolean }) {
    return this.db.query.loyaltyEarningRules.findMany({
      where: options?.includeInactive ? undefined : eq(loyaltyEarningRules.status, 'active'),
      orderBy: [desc(loyaltyEarningRules.updatedAt), desc(loyaltyEarningRules.id)],
      with: {
        audits: {
          orderBy: [desc(loyaltyEarningRuleAudits.createdAt), desc(loyaltyEarningRuleAudits.id)],
        },
      },
    });
  }

  async listActiveEarningRules(at: Date = new Date()) {
    return this.db.query.loyaltyEarningRules.findMany({
      where: and(
        eq(loyaltyEarningRules.status, 'active'),
        or(
          isNull(loyaltyEarningRules.activeFrom),
          lte(loyaltyEarningRules.activeFrom, at),
        ),
        or(
          isNull(loyaltyEarningRules.activeUntil),
          gte(loyaltyEarningRules.activeUntil, at),
        ),
      ),
      orderBy: [desc(loyaltyEarningRules.updatedAt), desc(loyaltyEarningRules.id)],
      with: {
        audits: {
          orderBy: [desc(loyaltyEarningRuleAudits.createdAt), desc(loyaltyEarningRuleAudits.id)],
        },
      },
    });
  }

  async findRewardById(id: string, db: AppDatabase = this.db) {
    const reward = await db.query.rewards.findFirst({
      where: eq(rewards.id, id),
      with: {
        audits: {
          orderBy: [desc(rewardCatalogAudits.createdAt), desc(rewardCatalogAudits.id)],
        },
      },
    });

    return this.assertFound(reward, 'Reward not found');
  }

  async findEarningRuleById(id: string, db: AppDatabase = this.db) {
    const earningRule = await db.query.loyaltyEarningRules.findFirst({
      where: eq(loyaltyEarningRules.id, id),
      with: {
        audits: {
          orderBy: [desc(loyaltyEarningRuleAudits.createdAt), desc(loyaltyEarningRuleAudits.id)],
        },
      },
    });

    return this.assertFound(earningRule, 'Earning rule not found');
  }

  async createReward(payload: CreateRewardInput) {
    return this.db.transaction(async (tx) => {
      const [createdReward] = await tx
        .insert(rewards)
        .values({
          name: payload.name,
          description: payload.description ?? null,
          fulfillmentNote: payload.fulfillmentNote ?? null,
          rewardType: payload.rewardType,
          pointsCost: payload.pointsCost,
          discountPercent: payload.discountPercent ?? null,
          status: payload.status ?? 'active',
          createdByUserId: payload.actorUserId,
          updatedByUserId: payload.actorUserId,
        })
        .returning();

      const reward = this.assertFound(createdReward, 'Reward not found');
      await this.insertRewardAudit(tx, {
        rewardId: reward.id,
        actorUserId: payload.actorUserId,
        action: 'created',
        reason: payload.reason ?? null,
        snapshot: this.toRewardSnapshot(reward),
      });

      return this.findRewardById(reward.id, tx);
    });
  }

  async updateReward(id: string, payload: UpdateRewardInput) {
    return this.db.transaction(async (tx) => {
      const existingReward = await this.findRewardById(id, tx);
      const [updatedReward] = await tx
        .update(rewards)
        .set({
          name: payload.name ?? existingReward.name,
          description: payload.description ?? existingReward.description ?? null,
          fulfillmentNote:
            payload.fulfillmentNote !== undefined
              ? payload.fulfillmentNote
              : existingReward.fulfillmentNote ?? null,
          rewardType: payload.rewardType ?? existingReward.rewardType,
          pointsCost: payload.pointsCost ?? existingReward.pointsCost,
          discountPercent:
            payload.discountPercent !== undefined
              ? payload.discountPercent
              : existingReward.discountPercent ?? null,
          updatedByUserId: payload.actorUserId,
          updatedAt: new Date(),
        })
        .where(eq(rewards.id, id))
        .returning();

      const reward = this.assertFound(updatedReward, 'Reward not found');
      await this.insertRewardAudit(tx, {
        rewardId: reward.id,
        actorUserId: payload.actorUserId,
        action: 'updated',
        reason: payload.reason ?? null,
        snapshot: this.toRewardSnapshot(reward),
      });

      return this.findRewardById(reward.id, tx);
    });
  }

  async updateRewardStatus(id: string, payload: UpdateRewardStatusInput) {
    return this.db.transaction(async (tx) => {
      const existingReward = await this.findRewardById(id, tx);
      const [updatedReward] = await tx
        .update(rewards)
        .set({
          status: payload.status,
          updatedByUserId: payload.actorUserId,
          updatedAt: new Date(),
        })
        .where(eq(rewards.id, id))
        .returning();

      const reward = this.assertFound(updatedReward, 'Reward not found');
      await this.insertRewardAudit(tx, {
        rewardId: reward.id,
        actorUserId: payload.actorUserId,
        action: payload.status === 'active' ? 'activated' : 'deactivated',
        reason: payload.reason,
        snapshot: this.toRewardSnapshot(reward),
      });

      return this.findRewardById(reward.id, tx);
    });
  }

  async createEarningRule(payload: CreateEarningRuleInput) {
    return this.db.transaction(async (tx) => {
      const [createdRule] = await tx
        .insert(loyaltyEarningRules)
        .values({
          name: payload.name,
          description: payload.description ?? null,
          accrualSource: payload.accrualSource,
          formulaType: payload.formulaType,
          flatPoints: payload.flatPoints ?? null,
          amountStepCents: payload.amountStepCents ?? null,
          pointsPerStep: payload.pointsPerStep ?? null,
          minimumAmountCents: payload.minimumAmountCents ?? null,
          eligibleServiceTypes: payload.eligibleServiceTypes ?? [],
          eligibleServiceCategories: payload.eligibleServiceCategories ?? [],
          eligibleProductIds: payload.eligibleProductIds ?? [],
          eligibleProductCategoryIds: payload.eligibleProductCategoryIds ?? [],
          promoLabel: payload.promoLabel ?? null,
          manualBenefitNote: payload.manualBenefitNote ?? null,
          activeFrom: payload.activeFrom ? new Date(payload.activeFrom) : null,
          activeUntil: payload.activeUntil ? new Date(payload.activeUntil) : null,
          status: payload.status ?? 'inactive',
          createdByUserId: payload.actorUserId,
          updatedByUserId: payload.actorUserId,
        })
        .returning();

      const earningRule = this.assertFound(createdRule, 'Earning rule not found');
      await this.insertEarningRuleAudit(tx, {
        earningRuleId: earningRule.id,
        actorUserId: payload.actorUserId,
        action: 'created',
        reason: payload.reason ?? null,
        snapshot: this.toEarningRuleSnapshot(earningRule),
      });

      return this.findEarningRuleById(earningRule.id, tx);
    });
  }

  async updateEarningRule(id: string, payload: UpdateEarningRuleInput) {
    return this.db.transaction(async (tx) => {
      const existingRule = await this.findEarningRuleById(id, tx);
      const [updatedRule] = await tx
        .update(loyaltyEarningRules)
        .set({
          name: payload.name ?? existingRule.name,
          description:
            payload.description !== undefined ? payload.description : existingRule.description ?? null,
          accrualSource: payload.accrualSource ?? existingRule.accrualSource,
          formulaType: payload.formulaType ?? existingRule.formulaType,
          flatPoints:
            payload.flatPoints !== undefined ? payload.flatPoints : existingRule.flatPoints ?? null,
          amountStepCents:
            payload.amountStepCents !== undefined
              ? payload.amountStepCents
              : existingRule.amountStepCents ?? null,
          pointsPerStep:
            payload.pointsPerStep !== undefined
              ? payload.pointsPerStep
              : existingRule.pointsPerStep ?? null,
          minimumAmountCents:
            payload.minimumAmountCents !== undefined
              ? payload.minimumAmountCents
              : existingRule.minimumAmountCents ?? null,
          eligibleServiceTypes:
            payload.eligibleServiceTypes !== undefined
              ? payload.eligibleServiceTypes
              : existingRule.eligibleServiceTypes,
          eligibleServiceCategories:
            payload.eligibleServiceCategories !== undefined
              ? payload.eligibleServiceCategories
              : existingRule.eligibleServiceCategories,
          eligibleProductIds:
            payload.eligibleProductIds !== undefined
              ? payload.eligibleProductIds
              : existingRule.eligibleProductIds,
          eligibleProductCategoryIds:
            payload.eligibleProductCategoryIds !== undefined
              ? payload.eligibleProductCategoryIds
              : existingRule.eligibleProductCategoryIds,
          promoLabel: payload.promoLabel !== undefined ? payload.promoLabel : existingRule.promoLabel ?? null,
          manualBenefitNote:
            payload.manualBenefitNote !== undefined
              ? payload.manualBenefitNote
              : existingRule.manualBenefitNote ?? null,
          activeFrom:
            payload.activeFrom !== undefined
              ? payload.activeFrom
                ? new Date(payload.activeFrom)
                : null
              : existingRule.activeFrom,
          activeUntil:
            payload.activeUntil !== undefined
              ? payload.activeUntil
                ? new Date(payload.activeUntil)
                : null
              : existingRule.activeUntil,
          updatedByUserId: payload.actorUserId,
          updatedAt: new Date(),
        })
        .where(eq(loyaltyEarningRules.id, id))
        .returning();

      const earningRule = this.assertFound(updatedRule, 'Earning rule not found');
      await this.insertEarningRuleAudit(tx, {
        earningRuleId: earningRule.id,
        actorUserId: payload.actorUserId,
        action: 'updated',
        reason: payload.reason ?? null,
        snapshot: this.toEarningRuleSnapshot(earningRule),
      });

      return this.findEarningRuleById(earningRule.id, tx);
    });
  }

  async updateEarningRuleStatus(id: string, payload: UpdateEarningRuleStatusInput) {
    return this.db.transaction(async (tx) => {
      const existingRule = await this.findEarningRuleById(id, tx);
      const [updatedRule] = await tx
        .update(loyaltyEarningRules)
        .set({
          status: payload.status,
          updatedByUserId: payload.actorUserId,
          updatedAt: new Date(),
        })
        .where(eq(loyaltyEarningRules.id, id))
        .returning();

      const earningRule = this.assertFound(updatedRule, 'Earning rule not found');
      await this.insertEarningRuleAudit(tx, {
        earningRuleId: earningRule.id,
        actorUserId: payload.actorUserId,
        action: payload.status === 'active' ? 'activated' : 'deactivated',
        reason: payload.reason,
        snapshot: this.toEarningRuleSnapshot(earningRule),
      });

      return this.findEarningRuleById(earningRule.id, tx);
    });
  }

  async applyAccrual(payload: ApplyLoyaltyAccrualInput) {
    return this.db.transaction(async (tx) => {
      const account = await this.getOrCreateAccount(payload.plan.loyaltyUserId, tx);

      const existingTransaction = await tx.query.loyaltyTransactions.findFirst({
        where: eq(loyaltyTransactions.idempotencyKey, payload.plan.idempotencyKey),
      });

      if (existingTransaction) {
        return {
          account: await this.findAccountById(account.id, tx),
          transaction: existingTransaction,
          wasDuplicate: true,
        };
      }

      const nextBalance = account.pointsBalance + payload.pointsAwarded;
      await tx
        .update(loyaltyAccounts)
        .set({
          pointsBalance: nextBalance,
          lifetimePointsEarned: account.lifetimePointsEarned + payload.pointsAwarded,
          lastAccruedAt: payload.occurredAt ?? new Date(),
          updatedAt: new Date(),
        })
        .where(eq(loyaltyAccounts.id, account.id));

      const [createdTransaction] = await tx
        .insert(loyaltyTransactions)
        .values({
          loyaltyAccountId: account.id,
          transactionType: 'accrual',
          sourceType: payload.plan.accrualKind,
          sourceReference: payload.plan.sourceReference,
          idempotencyKey: payload.plan.idempotencyKey,
          policyKey: payload.plan.policyKey,
          pointsDelta: payload.pointsAwarded,
          resultingBalance: nextBalance,
          metadata: {
            triggerName: payload.plan.triggerName,
            sourceDomain: payload.plan.sourceDomain,
            duplicateStrategy: payload.plan.duplicateStrategy,
            reversalStrategy: payload.plan.reversalStrategy,
            pointsInput: payload.plan.pointsInput as Record<string, unknown>,
            ...(payload.metadata ?? {}),
          },
          createdAt: payload.occurredAt ?? new Date(),
        })
        .returning();

      return {
        account: await this.findAccountById(account.id, tx),
        transaction: this.assertFound(createdTransaction, 'Loyalty transaction not found'),
        wasDuplicate: false,
      };
    });
  }

  async createRedemption(payload: CreateRedemptionInput) {
    return this.db.transaction(async (tx) => {
      const account = await this.getOrCreateAccount(payload.userId, tx);
      const reward = await this.findRewardById(payload.rewardId, tx);
      const nextBalance = account.pointsBalance - reward.pointsCost;

      await tx
        .update(loyaltyAccounts)
        .set({
          pointsBalance: nextBalance,
          lifetimePointsRedeemed: account.lifetimePointsRedeemed + reward.pointsCost,
          updatedAt: new Date(),
        })
        .where(eq(loyaltyAccounts.id, account.id));

      const [createdTransaction] = await tx
        .insert(loyaltyTransactions)
        .values({
          loyaltyAccountId: account.id,
          transactionType: 'redemption',
          sourceType: 'reward_redemption',
          sourceReference: reward.id,
          policyKey: 'loyalty.reward_redemption.v1',
          pointsDelta: reward.pointsCost * -1,
          resultingBalance: nextBalance,
          metadata: {
            rewardNameSnapshot: reward.name,
            redeemedByUserId: payload.redeemedByUserId,
            note: payload.note ?? null,
          },
        })
        .returning();

      const transaction = this.assertFound(createdTransaction, 'Loyalty transaction not found');

      const [createdRedemption] = await tx
        .insert(rewardRedemptions)
        .values({
          loyaltyAccountId: account.id,
          rewardId: reward.id,
          transactionId: transaction.id,
          redeemedByUserId: payload.redeemedByUserId,
          rewardNameSnapshot: reward.name,
          pointsCostSnapshot: reward.pointsCost,
          note: payload.note ?? null,
        })
        .returning();

      return this.findRedemptionById(
        this.assertFound(createdRedemption, 'Reward redemption not found').id,
        tx,
      );
    });
  }

  async findRedemptionById(id: string, db: AppDatabase = this.db) {
    const redemption = await db.query.rewardRedemptions.findFirst({
      where: eq(rewardRedemptions.id, id),
      with: {
        transaction: true,
      },
    });

    return this.assertFound(redemption, 'Reward redemption not found');
  }

  private async insertRewardAudit(
    db: AppDatabase,
    payload: {
      rewardId: string;
      actorUserId: string;
      action: 'created' | 'updated' | 'activated' | 'deactivated';
      reason?: string | null;
      snapshot: RewardCatalogSnapshot;
    },
  ) {
    const [audit] = await db
      .insert(rewardCatalogAudits)
      .values({
        rewardId: payload.rewardId,
        actorUserId: payload.actorUserId,
        action: payload.action,
        reason: payload.reason ?? null,
        snapshot: payload.snapshot,
      })
      .returning();

    return this.assertFound(audit, 'Reward catalog audit not found');
  }

  private async insertEarningRuleAudit(
    db: AppDatabase,
    payload: {
      earningRuleId: string;
      actorUserId: string;
      action: 'created' | 'updated' | 'activated' | 'deactivated';
      reason?: string | null;
      snapshot: LoyaltyEarningRuleSnapshot;
    },
  ) {
    const [audit] = await db
      .insert(loyaltyEarningRuleAudits)
      .values({
        earningRuleId: payload.earningRuleId,
        actorUserId: payload.actorUserId,
        action: payload.action,
        reason: payload.reason ?? null,
        snapshot: payload.snapshot,
      })
      .returning();

    return this.assertFound(audit, 'Earning rule audit not found');
  }

  private toRewardSnapshot(reward: typeof rewards.$inferSelect): RewardCatalogSnapshot {
    return {
      name: reward.name,
      description: reward.description ?? null,
      fulfillmentNote: reward.fulfillmentNote ?? null,
      rewardType: reward.rewardType,
      pointsCost: reward.pointsCost,
      discountPercent: reward.discountPercent ?? null,
      status: reward.status,
    };
  }

  private toEarningRuleSnapshot(
    earningRule: typeof loyaltyEarningRules.$inferSelect,
  ): LoyaltyEarningRuleSnapshot {
    return {
      name: earningRule.name,
      description: earningRule.description ?? null,
      accrualSource: earningRule.accrualSource,
      formulaType: earningRule.formulaType,
      flatPoints: earningRule.flatPoints ?? null,
      amountStepCents: earningRule.amountStepCents ?? null,
      pointsPerStep: earningRule.pointsPerStep ?? null,
      minimumAmountCents: earningRule.minimumAmountCents ?? null,
      eligibleServiceTypes: earningRule.eligibleServiceTypes ?? [],
      eligibleServiceCategories: earningRule.eligibleServiceCategories ?? [],
      eligibleProductIds: earningRule.eligibleProductIds ?? [],
      eligibleProductCategoryIds: earningRule.eligibleProductCategoryIds ?? [],
      promoLabel: earningRule.promoLabel ?? null,
      manualBenefitNote: earningRule.manualBenefitNote ?? null,
      activeFrom: earningRule.activeFrom ? earningRule.activeFrom.toISOString() : null,
      activeUntil: earningRule.activeUntil ? earningRule.activeUntil.toISOString() : null,
      status: earningRule.status,
    };
  }
}
