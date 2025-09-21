import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../common/prisma/prisma.service';
import { randomBytes } from 'crypto';
import { hash, verify } from 'argon2';
import { addMinutes, addDays } from 'date-fns';
import { z } from 'zod';

const tokenExchangeSchema = z.object({
  refreshToken: z.string().min(10)
});

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService
  ) {}

  async issueTokens(tenantId: string, userId: string, roles: string[]): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresAt: Date;
  }> {
    const payload = {
      sub: userId,
      tenantId,
      roles
    };

    const expiresAt = addMinutes(new Date(), 5);
    const accessToken = await this.jwtService.signAsync(payload, { expiresIn: '5m' });

    const refreshTokenRaw = randomBytes(48).toString('base64url');
    const refreshTokenHash = await hash(refreshTokenRaw);
    await this.prisma.refreshToken.create({
      data: {
        tenantId,
        userId,
        tokenHash: refreshTokenHash,
        expiresAt: addDays(new Date(), 7)
      }
    });

    return { accessToken, refreshToken: refreshTokenRaw, expiresAt };
  }

  async rotateRefreshToken(payload: unknown) {
    const parsed = tokenExchangeSchema.safeParse(payload);
    if (!parsed.success) {
      throw new UnauthorizedException('Invalid refresh token payload');
    }

    const existing = await this.prisma.refreshToken.findFirst({
      where: { revokedAt: null },
      orderBy: { createdAt: 'desc' }
    });

    if (!existing) {
      throw new UnauthorizedException('Refresh token not found');
    }

    const isValid = await verify(existing.tokenHash, parsed.data.refreshToken).catch(() => false);
    if (!isValid || existing.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token is expired');
    }

    await this.prisma.refreshToken.update({
      where: { id: existing.id },
      data: { revokedAt: new Date(), metadata: { rotatedAt: new Date().toISOString() } }
    });

    const user = await this.prisma.user.findUnique({
      where: { id: existing.userId },
      include: { roles: true }
    });
    const roles = user?.roles.map((role) => role.role) ?? [];

    return this.issueTokens(existing.tenantId, existing.userId, roles);
  }
}
