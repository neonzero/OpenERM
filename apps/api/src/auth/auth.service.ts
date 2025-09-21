import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../common/prisma/prisma.service';
import { randomBytes, randomUUID } from 'crypto';

import { hash, verify } from 'argon2';
import { addMinutes, addDays } from 'date-fns';
import { z } from 'zod';

const tokenExchangeSchema = z.object({
  refreshToken: z.string().min(10)
});

const refreshTokenPartsSchema = z.object({
  tokenId: z.string().uuid(),
  tokenSecret: z.string().min(10)
});


@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService
  ) {}

  async issueTokens(
    tenantId: string,
    userId: string,
    roles: string[],
    options: { rotatedFrom?: string } = {}
  ): Promise<{

    accessToken: string;
    refreshToken: string;
    expiresAt: Date;
  }> {
    const payload = {
      sub: userId,
      tenantId,
      roles
    };

    const issuedAt = new Date();
    const expiresAt = addMinutes(issuedAt, 5);
    const accessToken = await this.jwtService.signAsync(payload, { expiresIn: '5m' });

    const tokenId = randomUUID();
    const tokenSecret = randomBytes(48).toString('base64url');
    const refreshToken = `${tokenId}.${tokenSecret}`;
    const refreshTokenHash = await hash(tokenSecret);

    await this.prisma.refreshToken.create({
      data: {
        id: tokenId,
        tenantId,
        userId,
        tokenHash: refreshTokenHash,
        expiresAt: addDays(issuedAt, 7),
        metadata: {
          issuedAt: issuedAt.toISOString(),
          roles,
          rotatedFrom: options.rotatedFrom ?? null
        }
      }
    });

    return { accessToken, refreshToken, expiresAt };

  }

  async rotateRefreshToken(payload: unknown) {
    const parsed = tokenExchangeSchema.safeParse(payload);
    if (!parsed.success) {
      throw new UnauthorizedException('Invalid refresh token payload');
    }

    const { tokenId, tokenSecret } = this.parseRefreshToken(parsed.data.refreshToken);

    const existing = await this.prisma.refreshToken.findUnique({
      where: { id: tokenId }

    });

    if (!existing) {
      throw new UnauthorizedException('Refresh token not found');
    }

    if (existing.revokedAt || existing.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token is expired');
    }

    const isValid = await verify(existing.tokenHash, tokenSecret).catch(() => false);

    if (!isValid || existing.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token is expired');
    }

    const revokedAt = new Date();
    const previousMetadata = this.normalizeMetadata(existing.metadata);
    await this.prisma.refreshToken.update({
      where: { id: existing.id },
      data: {
        revokedAt,
        metadata: {
          ...previousMetadata,
          revokedAt: revokedAt.toISOString(),
          rotatedBy: 'self'
        }
      }

    });

    const user = await this.prisma.user.findUnique({
      where: { id: existing.userId },
      select: { roles: true }

    });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    const roles = user?.roles ?? [];


    return this.issueTokens(existing.tenantId, existing.userId, roles, { rotatedFrom: existing.id });
  }

  private parseRefreshToken(refreshToken: string) {
    const [tokenId, tokenSecret] = refreshToken.split('.');
    const parsed = refreshTokenPartsSchema.safeParse({ tokenId, tokenSecret });
    if (!parsed.success) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    return parsed.data;
  }

  private normalizeMetadata(metadata: unknown): Record<string, unknown> {
    if (metadata && typeof metadata === 'object' && !Array.isArray(metadata)) {
      return metadata as Record<string, unknown>;
    }

    return {};

  }
}
