import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, isNull } from 'drizzle-orm';

import { BaseRepository } from '@shared/base/base.repository';
import { DRIZZLE_DB } from '@shared/db/database.constants';
import { AppDatabase } from '@shared/db/database.types';
import { users } from '@main-modules/users/schemas/users.schema';

import {
  authAccounts,
  authGoogleIdentities,
  authOtpChallenges,
  loginAuditLogs,
  refreshTokens,
  staffAdminAuditLogs,
} from '../schemas/auth.schema';

@Injectable()
export class AuthRepository extends BaseRepository {
  constructor(@Inject(DRIZZLE_DB) private readonly db: AppDatabase) {
    super();
  }

  async createAccount(userId: string, passwordHash: string) {
    const [account] = await this.db
      .insert(authAccounts)
      .values({ userId, passwordHash })
      .returning();

    return account;
  }

  async findAccountByUserId(userId: string) {
    return this.db.query.authAccounts.findFirst({
      where: eq(authAccounts.userId, userId),
    });
  }

  async updateAccountStatus(userId: string, isActive: boolean) {
    const [account] = await this.db
      .update(authAccounts)
      .set({
        isActive,
        updatedAt: new Date(),
      })
      .where(eq(authAccounts.userId, userId))
      .returning();

    return account ?? null;
  }

  async findAccountWithUserByEmail(email: string) {
    const account = await this.db
      .select()
      .from(authAccounts)
      .innerJoin(users, eq(authAccounts.userId, users.id))
      .where(eq(users.email, email))
      .limit(1);

    return account[0] ?? null;
  }

  async storeRefreshToken(userId: string, tokenHash: string, expiresAt: Date) {
    await this.db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(and(eq(refreshTokens.userId, userId), isNull(refreshTokens.revokedAt)));

    const [token] = await this.db
      .insert(refreshTokens)
      .values({
        userId,
        tokenHash,
        expiresAt,
      })
      .returning();

    return token;
  }

  async revokeActiveRefreshTokens(userId: string) {
    await this.db
      .update(refreshTokens)
      .set({
        revokedAt: new Date(),
      })
      .where(and(eq(refreshTokens.userId, userId), isNull(refreshTokens.revokedAt)));
  }

  async findLatestActiveRefreshToken(userId: string) {
    return this.db.query.refreshTokens.findFirst({
      where: and(eq(refreshTokens.userId, userId), isNull(refreshTokens.revokedAt)),
      orderBy: desc(refreshTokens.createdAt),
    });
  }

  async logLoginAttempt(payload: {
    userId?: string;
    email: string;
    ipAddress?: string;
    wasSuccessful: boolean;
  }) {
    await this.db.insert(loginAuditLogs).values(payload);
  }

  async findGoogleIdentityByProviderUserId(providerUserId: string) {
    return this.db.query.authGoogleIdentities.findFirst({
      where: eq(authGoogleIdentities.providerUserId, providerUserId),
    });
  }

  async findGoogleIdentityByEmail(email: string) {
    return this.db.query.authGoogleIdentities.findFirst({
      where: eq(authGoogleIdentities.email, email),
    });
  }

  async createGoogleIdentity(payload: { userId: string; providerUserId: string; email: string }) {
    const [identity] = await this.db
      .insert(authGoogleIdentities)
      .values({
        userId: payload.userId,
        providerUserId: payload.providerUserId,
        email: payload.email,
      })
      .returning();

    return this.assertFound(identity, 'Google identity not found');
  }

  async createOtpChallenge(payload: {
    userId: string;
    purpose: 'customer_signup' | 'staff_activation' | 'account_delete';
    email: string;
    otpHash: string;
    expiresAt: Date;
  }) {
    const [challenge] = await this.db
      .insert(authOtpChallenges)
      .values({
        userId: payload.userId,
        purpose: payload.purpose,
        email: payload.email,
        otpHash: payload.otpHash,
        expiresAt: payload.expiresAt,
      })
      .returning();

    return this.assertFound(challenge, 'OTP challenge not found');
  }

  async findOtpChallengeById(id: string) {
    return this.db.query.authOtpChallenges.findFirst({
      where: eq(authOtpChallenges.id, id),
    });
  }

  async incrementOtpAttempts(id: string, attempts: number) {
    const [challenge] = await this.db
      .update(authOtpChallenges)
      .set({
        attempts,
      })
      .where(eq(authOtpChallenges.id, id))
      .returning();

    return challenge ?? null;
  }

  async consumeOtpChallenge(id: string) {
    const [challenge] = await this.db
      .update(authOtpChallenges)
      .set({
        consumedAt: new Date(),
      })
      .where(eq(authOtpChallenges.id, id))
      .returning();

    return challenge ?? null;
  }

  async createStaffAdminAuditLog(payload: {
    action: 'staff_account_provisioned' | 'staff_account_status_changed';
    actorUserId: string;
    actorRole: 'super_admin';
    targetUserId: string;
    targetRole: 'technician' | 'service_adviser' | 'super_admin';
    targetEmail: string;
    targetStaffCode?: string | null;
    previousIsActive?: boolean | null;
    nextIsActive?: boolean | null;
    reason?: string | null;
  }) {
    const [auditLog] = await this.db
      .insert(staffAdminAuditLogs)
      .values({
        action: payload.action,
        actorUserId: payload.actorUserId,
        actorRole: payload.actorRole,
        targetUserId: payload.targetUserId,
        targetRole: payload.targetRole,
        targetEmail: payload.targetEmail,
        targetStaffCode: payload.targetStaffCode ?? null,
        previousIsActive: payload.previousIsActive ?? null,
        nextIsActive: payload.nextIsActive ?? null,
        reason: payload.reason ?? null,
      })
      .returning();

    return this.assertFound(auditLog, 'Staff admin audit log not found');
  }

  async listStaffAdminAuditLogsForAnalytics() {
    return this.db.query.staffAdminAuditLogs.findMany({
      orderBy: desc(staffAdminAuditLogs.createdAt),
    });
  }

  async softDeleteUserAccount(payload: { userId: string; email: string }) {
    return this.db.transaction(async (tx) => {
      const archivedAt = new Date();
      const archivedEmail = `deleted+${payload.userId}@autocare.local`;

      await tx
        .update(users)
        .set({
          email: archivedEmail,
          deletedEmail: payload.email,
          isActive: false,
          deletedAt: archivedAt,
          updatedAt: archivedAt,
        })
        .where(eq(users.id, payload.userId));

      await tx
        .update(authAccounts)
        .set({
          isActive: false,
          updatedAt: archivedAt,
        })
        .where(eq(authAccounts.userId, payload.userId));

      await tx
        .update(refreshTokens)
        .set({
          revokedAt: archivedAt,
        })
        .where(and(eq(refreshTokens.userId, payload.userId), isNull(refreshTokens.revokedAt)));

      await tx.delete(authGoogleIdentities).where(eq(authGoogleIdentities.userId, payload.userId));
    });
  }
}
