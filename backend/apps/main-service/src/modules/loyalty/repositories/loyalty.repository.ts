import { Inject, Injectable } from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';

import { BaseRepository } from '@shared/base/base.repository';
import { DRIZZLE_DB } from '@shared/db/database.constants';
import { AppDatabase } from '@shared/db/database.types';
import { LoyaltyAccrualPlan } from '@shared/events/loyalty-accrual-planner.service';

import { CreateRewardDto } from '../dto/create-reward.dto';
import { UpdateRewardDto } from '../dto/update-reward.dto';
import { UpdateRewardStatusDto } from '../dto/update-reward-status.dto';
import {
  loyaltyAccounts,
  loyaltyTransactions,
  rewardCatalogAudits,
  RewardCatalogSnapshot,
  rewardRedemptions,
  rewards,
} from '../schemas/loyalty.schema';

type CreateRewardInput = CreateRewardDto & {
  actorUserId: string;
};

type UpdateRewardInput = UpdateRewardDto & {
  actorUserId: string;
};

type UpdateRewardStatusInput = UpdateRewardStatusDto & {
  actorUserId: string;
};

type ApplyLoyaltyAccrualInput = {
  plan: LoyaltyAccrualPlan;
  pointsAwarded: number;
  occurredAt?: Date;
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

  async createReward(payload: CreateRewardInput) {
    return this.db.transaction(async (tx) => {
      const [createdReward] = await tx
        .insert(rewards)
        .values({
          name: payload.name,
          description: payload.description ?? null,
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

  private toRewardSnapshot(reward: typeof rewards.$inferSelect): RewardCatalogSnapshot {
    return {
      name: reward.name,
      description: reward.description ?? null,
      rewardType: reward.rewardType,
      pointsCost: reward.pointsCost,
      discountPercent: reward.discountPercent ?? null,
      status: reward.status,
    };
  }
}
