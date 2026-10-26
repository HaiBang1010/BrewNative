import { hashPassword, verifyPassword } from './password.js';

describe('password', () => {
  it('verifies the original password', async () => {
    const hash = await hashPassword('correct horse');
    expect(hash.startsWith('scrypt$')).toBe(true);
    await expect(verifyPassword('correct horse', hash)).resolves.toBe(true);
  });

  it('rejects a wrong password', async () => {
    const hash = await hashPassword('correct horse');
    await expect(verifyPassword('wrong horse', hash)).resolves.toBe(false);
  });

  it('rejects a malformed hash', async () => {
    await expect(verifyPassword('x', 'not-a-hash')).resolves.toBe(false);
  });

  it('uses a random salt', async () => {
    expect(await hashPassword('same')).not.toBe(await hashPassword('same'));
  });
});
