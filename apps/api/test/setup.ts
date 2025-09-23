import { jest } from '@jest/globals';

const createHashMock = () =>
  jest.fn(async (input: string | Buffer) => `hashed:${input.toString()}`);
const createVerifyMock = () =>
  jest.fn(async (hashed: string, input: string | Buffer) => hashed === `hashed:${input.toString()}`);

const hashMock = createHashMock();
const verifyMock = createVerifyMock();

jest.mock('argon2', () => ({
  hash: hashMock,
  verify: verifyMock
}));

beforeEach(() => {
  hashMock.mockClear();
  verifyMock.mockClear();
});
