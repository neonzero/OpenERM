import { describe, expect, it, jest } from '@jest/globals';
import { AuthService } from '../src/auth/auth.service';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { hash } from 'argon2';
import { UnauthorizedException } from '@nestjs/common';

const createService = () => {
  const jwtMock = {
    signAsync: jest.fn()
  } as unknown as JwtService;

  const refreshTokenMock = {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn()
  };

  const userMock = {
    findUnique: jest.fn()
  };

  const prismaMock = {
    refreshToken: refreshTokenMock,
    user: userMock
  } as unknown as PrismaService;

  const service = new AuthService(jwtMock, prismaMock);

  return { service, jwtMock, refreshTokenMock, userMock };
};

describe('AuthService', () => {
  it('rotates refresh tokens by token identifier and revokes the previous token', async () => {
    const { service, jwtMock, refreshTokenMock, userMock } = createService();

    const secret = 'super-secure-secret';
    const hashedSecret = await hash(secret);

    (refreshTokenMock.findUnique as jest.Mock).mockResolvedValue({
      id: 'token-id',
      tenantId: 'tenant-1',
      userId: 'user-1',
      tokenHash: hashedSecret,
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: null,
      metadata: null
    });

    (userMock.findUnique as jest.Mock).mockResolvedValue({
      id: 'user-1',
      roles: [{ role: 'risk.viewer' }]
    });

    (jwtMock.signAsync as jest.Mock).mockResolvedValue('new-access-token');

    const result = await service.rotateRefreshToken({ refreshToken: `token-id.${secret}` });

    expect(result.accessToken).toBe('new-access-token');
    expect(result.refreshToken).toContain('.');

    const [newTokenId, newTokenSecret] = result.refreshToken.split('.');
    expect(newTokenId).toBeDefined();
    expect(newTokenSecret).toBeDefined();
    expect(newTokenSecret).not.toHaveLength(0);

    const createArgs = (refreshTokenMock.create as jest.Mock).mock.calls[0][0];
    expect(createArgs.data.id).toBe(newTokenId);
    expect(createArgs.data.tenantId).toBe('tenant-1');
    expect(createArgs.data.userId).toBe('user-1');
    expect(createArgs.data.tokenHash).not.toBe(newTokenSecret);
    expect(createArgs.data.metadata.rotatedFrom).toBe('token-id');
    expect(createArgs.data.metadata.roles).toEqual(['risk.viewer']);

    expect(refreshTokenMock.findUnique).toHaveBeenCalledWith({ where: { id: 'token-id' } });
    expect(refreshTokenMock.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'token-id' },
        data: expect.objectContaining({
          revokedAt: expect.any(Date),
          metadata: expect.objectContaining({ rotatedBy: 'self' })
        })
      })
    );

    expect(userMock.findUnique).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      include: { roles: true }
    });
  });

  it('rejects refresh tokens with invalid structure', async () => {
    const { service, refreshTokenMock } = createService();

    await expect(service.rotateRefreshToken({ refreshToken: 'invalid-token' })).rejects.toThrow(
      UnauthorizedException
    );

    expect(refreshTokenMock.findUnique).not.toHaveBeenCalled();
  });
});
