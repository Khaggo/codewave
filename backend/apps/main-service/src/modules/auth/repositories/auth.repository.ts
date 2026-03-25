import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, isNull } from 'drizzle-orm';

import { BaseRepository } from '@shared/base/base.repository';
import { DRIZZLE_DB } from '@shared/db/database.constants';
import { AppDatabase } from '@shared/db/database.types';
import { users } from '@main-modules/users/schemas/users.schema';

import { authAccounts, loginAuditLogs, refreshTokens } from '../schemas/auth.schema';

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
}
