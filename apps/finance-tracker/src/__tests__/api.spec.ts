import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import request from 'supertest';
import { app, prisma } from '../server/index';

// Mock the email service so no real SMTP calls are made in tests
vi.mock('../server/services/email', () => ({
  sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
}));

const CSRF_TOKEN = 'test-csrf-token';
const CSRF_COOKIE = `ft_csrf=${CSRF_TOKEN}`;

// Helper to register a user and extract the auth cookie
async function registerUser(
  username: string,
  displayName: string,
  password: string,
  email?: string
): Promise<{ cookie: string[]; userId: number; workspaceId: number }> {
  const res = await request(app)
    .post('/api/auth/register')
    .set('Cookie', CSRF_COOKIE)
    .set('x-csrf-token', CSRF_TOKEN)
    .send({ username, displayName, password, email: email ?? `${username}@example.com` });
  const cookies = res.headers['set-cookie'] as unknown as string[];
  const cookie = [...cookies, CSRF_COOKIE];

  // Fetch the workspace ID for this user
  const wsRes = await request(app).get('/api/workspace').set('Cookie', cookie);
  return {
    cookie,
    userId: res.body.data.id,
    workspaceId: wsRes.body.data.workspace.id,
  };
}

/** Shorthand for POST/PUT/DELETE with CSRF headers */
function postWithCsrf(url: string) {
  return request(app).post(url).set('Cookie', CSRF_COOKIE).set('x-csrf-token', CSRF_TOKEN);
}

function putWithCsrf(url: string) {
  return request(app).put(url).set('Cookie', CSRF_COOKIE).set('x-csrf-token', CSRF_TOKEN);
}

function deleteWithCsrf(url: string) {
  return request(app).delete(url).set('Cookie', CSRF_COOKIE).set('x-csrf-token', CSRF_TOKEN);
}

// Clean DB before each test
beforeEach(async () => {
  await prisma.passwordResetToken.deleteMany();
  await prisma.completedCycle.deleteMany();
  await prisma.item.deleteMany();
  await prisma.workspaceUser.deleteMany();
  await prisma.workspace.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('Finance Tracker API', () => {
  describe('GET /api/health', () => {
    it('should return healthy status', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.status).toBe('ok');
    });
  });

  describe('Auth', () => {
    it('POST /api/auth/register creates user and returns cookie', async () => {
      const res = await postWithCsrf('/api/auth/register').send({
        username: 'testuser',
        displayName: 'Test User',
        password: 'Password123',
        email: 'test@example.com',
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.username).toBe('testuser');
      expect(res.body.data.displayName).toBe('Test User');
      expect(res.headers['set-cookie']).toBeDefined();
    });

    it('POST /api/auth/register without email returns 400', async () => {
      const res = await postWithCsrf('/api/auth/register').send({
        username: 'noemail',
        displayName: 'No Email',
        password: 'Password123',
      });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/email/i);
    });

    it('POST /api/auth/register with weak password returns 400', async () => {
      const res = await postWithCsrf('/api/auth/register').send({
        username: 'weakpw',
        displayName: 'Weak PW',
        password: 'simple',
        email: 'weak@example.com',
      });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/8 characters/);
    });

    it('POST /api/auth/register with duplicate username returns 409', async () => {
      await postWithCsrf('/api/auth/register').send({
        username: 'dupuser',
        displayName: 'User 1',
        password: 'Password123',
        email: 'dup1@example.com',
      });

      const res = await postWithCsrf('/api/auth/register').send({
        username: 'dupuser',
        displayName: 'User 2',
        password: 'Password456',
        email: 'dup2@example.com',
      });

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('Username already taken');
    });

    it('POST /api/auth/login with valid creds returns cookie', async () => {
      await postWithCsrf('/api/auth/register').send({
        username: 'loginuser',
        displayName: 'Login User',
        password: 'Password123',
        email: 'login@example.com',
      });

      const res = await postWithCsrf('/api/auth/login').send({
        username: 'loginuser',
        password: 'Password123',
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.username).toBe('loginuser');
      expect(res.headers['set-cookie']).toBeDefined();
    });

    it('POST /api/auth/login with wrong password returns 401', async () => {
      await postWithCsrf('/api/auth/register').send({
        username: 'badpw',
        displayName: 'Bad PW',
        password: 'Password123',
        email: 'badpw@example.com',
      });

      const res = await postWithCsrf('/api/auth/login').send({
        username: 'badpw',
        password: 'wrongpassword',
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('GET /api/auth/me without cookie returns 401', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
    });

    it('GET /api/auth/me with valid cookie returns user', async () => {
      const { cookie } = await registerUser('meuser', 'Me User', 'Password123');

      const res = await request(app).get('/api/auth/me').set('Cookie', cookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.username).toBe('meuser');
    });

    it('POST /api/auth/logout clears cookie and invalidates token', async () => {
      const { cookie } = await registerUser('logoutuser', 'Logout User', 'Password123');

      const res = await request(app)
        .post('/api/auth/logout')
        .set('Cookie', cookie)
        .set('x-csrf-token', CSRF_TOKEN);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    describe('Forgot password + token-based reset', () => {
      it('POST /api/auth/forgot-password always returns 200 (no enumeration)', async () => {
        // Non-existent user — still 200
        const res = await postWithCsrf('/api/auth/forgot-password').send({
          username: 'nonexistent',
        });
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
      });

      it('POST /api/auth/forgot-password creates token for existing user', async () => {
        await postWithCsrf('/api/auth/register').send({
          username: 'forgotuser',
          displayName: 'Forgot User',
          password: 'Password123',
          email: 'forgot@example.com',
        });

        const res = await postWithCsrf('/api/auth/forgot-password').send({
          username: 'forgotuser',
        });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);

        // Token should exist in DB
        const tokens = await prisma.passwordResetToken.findMany();
        expect(tokens).toHaveLength(1);
        expect(tokens[0].usedAt).toBeNull();
      });

      it(
        'POST /api/auth/reset-password with valid token resets password',
        { timeout: 15000 },
        async () => {
          await postWithCsrf('/api/auth/register').send({
            username: 'resetuser',
            displayName: 'Reset User',
            password: 'OldPass123',
            email: 'reset@example.com',
          });

          await postWithCsrf('/api/auth/forgot-password').send({ username: 'resetuser' });

          // Get the raw token from the DB (we stored the hash; use the unhashed version sent in email)
          // Instead, directly create a token we know
          const { createHash, randomBytes } = await import('crypto');
          const rawToken = randomBytes(32).toString('hex');
          const tokenHash = createHash('sha256').update(rawToken).digest('hex');

          const user = await prisma.user.findUnique({ where: { username: 'resetuser' } });
          await prisma.passwordResetToken.deleteMany(); // clear auto-created one
          await prisma.passwordResetToken.create({
            data: {
              userId: user!.id,
              tokenHash,
              expiresAt: new Date(Date.now() + 60 * 60 * 1000),
            },
          });

          const res = await postWithCsrf('/api/auth/reset-password').send({
            token: rawToken,
            newPassword: 'NewPass456',
          });

          expect(res.status).toBe(200);
          expect(res.body.success).toBe(true);

          // Old password no longer works
          const oldLogin = await postWithCsrf('/api/auth/login').send({
            username: 'resetuser',
            password: 'OldPass123',
          });
          expect(oldLogin.status).toBe(401);

          // New password works
          const newLogin = await postWithCsrf('/api/auth/login').send({
            username: 'resetuser',
            password: 'NewPass456',
          });
          expect(newLogin.status).toBe(200);
        }
      );

      it('POST /api/auth/reset-password with used token returns 400', async () => {
        const { createHash, randomBytes } = await import('crypto');
        const rawToken = randomBytes(32).toString('hex');
        const tokenHash = createHash('sha256').update(rawToken).digest('hex');

        await postWithCsrf('/api/auth/register').send({
          username: 'usedtoken',
          displayName: 'Used Token',
          password: 'Password123',
          email: 'used@example.com',
        });
        const user = await prisma.user.findUnique({ where: { username: 'usedtoken' } });
        await prisma.passwordResetToken.create({
          data: {
            userId: user!.id,
            tokenHash,
            expiresAt: new Date(Date.now() + 60 * 60 * 1000),
            usedAt: new Date(), // already used
          },
        });

        const res = await postWithCsrf('/api/auth/reset-password').send({
          token: rawToken,
          newPassword: 'NewPass789',
        });

        expect(res.status).toBe(400);
        expect(res.body.error).toBe('Invalid or expired reset token');
      });

      it('POST /api/auth/reset-password with expired token returns 400', async () => {
        const { createHash, randomBytes } = await import('crypto');
        const rawToken = randomBytes(32).toString('hex');
        const tokenHash = createHash('sha256').update(rawToken).digest('hex');

        await postWithCsrf('/api/auth/register').send({
          username: 'expiredtoken',
          displayName: 'Expired Token',
          password: 'Password123',
          email: 'expired@example.com',
        });
        const user = await prisma.user.findUnique({ where: { username: 'expiredtoken' } });
        await prisma.passwordResetToken.create({
          data: {
            userId: user!.id,
            tokenHash,
            expiresAt: new Date(Date.now() - 1000), // already expired
          },
        });

        const res = await postWithCsrf('/api/auth/reset-password').send({
          token: rawToken,
          newPassword: 'NewPass789',
        });

        expect(res.status).toBe(400);
        expect(res.body.error).toBe('Invalid or expired reset token');
      });

      it('POST /api/auth/reset-password validates password policy', async () => {
        const { createHash, randomBytes } = await import('crypto');
        const rawToken = randomBytes(32).toString('hex');
        const tokenHash = createHash('sha256').update(rawToken).digest('hex');

        await postWithCsrf('/api/auth/register').send({
          username: 'weakreset',
          displayName: 'Weak Reset',
          password: 'Password123',
          email: 'weakreset@example.com',
        });
        const user = await prisma.user.findUnique({ where: { username: 'weakreset' } });
        await prisma.passwordResetToken.create({
          data: {
            userId: user!.id,
            tokenHash,
            expiresAt: new Date(Date.now() + 60 * 60 * 1000),
          },
        });

        const res = await postWithCsrf('/api/auth/reset-password').send({
          token: rawToken,
          newPassword: 'simple',
        });

        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/8 characters/);
      });
    });
  });

  describe('User email endpoints', () => {
    it('GET /api/user/me/email returns masked email', async () => {
      const { cookie } = await registerUser(
        'emailuser',
        'Email User',
        'Password123',
        'emailuser@example.com'
      );

      const res = await request(app).get('/api/user/me/email').set('Cookie', cookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.maskedEmail).toMatch(/@example\.com$/);
      // Should be masked (not full email)
      expect(res.body.data.maskedEmail).not.toBe('emailuser@example.com');
    });

    it('GET /api/user/me/email without auth returns 401', async () => {
      const res = await request(app).get('/api/user/me/email');
      expect(res.status).toBe(401);
    });

    it('PUT /api/user/email updates email with correct password', async () => {
      const { cookie } = await registerUser(
        'updateemail',
        'Update Email',
        'Password123',
        'old@example.com'
      );

      const res = await request(app)
        .put('/api/user/email')
        .set('Cookie', cookie)
        .set('x-csrf-token', CSRF_TOKEN)
        .send({ currentPassword: 'Password123', newEmail: 'new@example.com' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.maskedEmail).toMatch(/@example\.com$/);
    });

    it('PUT /api/user/email with wrong password returns 401', async () => {
      const { cookie } = await registerUser(
        'wrongpw',
        'Wrong PW',
        'Password123',
        'wrongpw@example.com'
      );

      const res = await request(app)
        .put('/api/user/email')
        .set('Cookie', cookie)
        .set('x-csrf-token', CSRF_TOKEN)
        .send({ currentPassword: 'wrongpassword', newEmail: 'new@example.com' });

      expect(res.status).toBe(401);
    });
  });

  describe('Workspace', () => {
    it('GET /api/workspace returns user workspace with empty items', async () => {
      const { cookie } = await registerUser('wsuser', 'WS User', 'Password123');

      const res = await request(app).get('/api/workspace').set('Cookie', cookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.workspace).toBeDefined();
      expect(res.body.data.items).toEqual([]);
      expect(res.body.data.permission).toBe('OWNER');
    });

    it('GET /api/workspace/cycles returns empty list initially', async () => {
      const { cookie } = await registerUser('cycleuser', 'Cycle User', 'Password123');

      const res = await request(app).get('/api/workspace/cycles').set('Cookie', cookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual([]);
    });

    it('GET /api/workspace/cycles returns completed cycles after reset', async () => {
      const { cookie, workspaceId } = await registerUser('resetcycle', 'Reset User', 'Password123');

      // Create an item
      await request(app)
        .post('/api/items')
        .set('Cookie', cookie)
        .set('x-csrf-token', CSRF_TOKEN)
        .send({
          workspaceId,
          type: 'INCOME',
          label: 'Salary',
          amount: 5000,
          dayOfMonth: 1,
        });

      // Reset workspace (this creates a completed cycle)
      await request(app)
        .post('/api/workspace/reset')
        .set('Cookie', cookie)
        .set('x-csrf-token', CSRF_TOKEN)
        .send({ workspaceId });

      // Fetch completed cycles
      const res = await request(app).get('/api/workspace/cycles').set('Cookie', cookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].items.length).toBe(1);
      expect(res.body.data[0].items[0].label).toBe('Salary');
      expect(res.body.data[0].finalBalance).toBe(0);
    });

    it('PUT /api/workspace/balance updates balance', async () => {
      const { cookie, workspaceId } = await registerUser('baluser', 'Bal User', 'Password123');

      const res = await request(app)
        .put('/api/workspace/balance')
        .set('Cookie', cookie)
        .set('x-csrf-token', CSRF_TOKEN)
        .send({ workspaceId, balance: 5000 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('unauthenticated request returns 401', async () => {
      const res = await request(app).get('/api/workspace');
      expect(res.status).toBe(401);
    });
  });

  describe('Items', () => {
    it('POST /api/items creates item', async () => {
      const { cookie, workspaceId } = await registerUser('itemuser', 'Item User', 'Password123');

      const res = await request(app)
        .post('/api/items')
        .set('Cookie', cookie)
        .set('x-csrf-token', CSRF_TOKEN)
        .send({
          workspaceId,
          type: 'INCOME',
          label: 'Salary',
          amount: 5000,
          dayOfMonth: 10,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.label).toBe('Salary');
      expect(res.body.data.amount).toBe(5000);
      expect(res.body.data.isPaid).toBe(false);
    });

    it('POST /api/items with invalid dayOfMonth returns 400', async () => {
      const { cookie, workspaceId } = await registerUser('badday', 'Bad Day', 'Password123');

      const res = await request(app)
        .post('/api/items')
        .set('Cookie', cookie)
        .set('x-csrf-token', CSRF_TOKEN)
        .send({
          workspaceId,
          type: 'INCOME',
          label: 'Salary',
          amount: 5000,
          dayOfMonth: 32,
        });

      expect(res.status).toBe(400);
    });

    it('PUT /api/items/:id updates item', async () => {
      const { cookie, workspaceId } = await registerUser('upitem', 'Up Item', 'Password123');

      const createRes = await request(app)
        .post('/api/items')
        .set('Cookie', cookie)
        .set('x-csrf-token', CSRF_TOKEN)
        .send({
          workspaceId,
          type: 'RENT',
          label: 'Old Rent',
          amount: 2000,
          dayOfMonth: 1,
        });

      const itemId = createRes.body.data.id;

      const res = await request(app)
        .put(`/api/items/${itemId}`)
        .set('Cookie', cookie)
        .set('x-csrf-token', CSRF_TOKEN)
        .send({ label: 'New Rent', amount: 2500 });

      expect(res.status).toBe(200);
      expect(res.body.data.label).toBe('New Rent');
      expect(res.body.data.amount).toBe(2500);
    });

    it('PUT /api/items/:id toggles isPaid and adjusts balance', async () => {
      const { cookie, workspaceId } = await registerUser('paiduser', 'Paid User', 'Password123');

      // Set initial balance
      await request(app)
        .put('/api/workspace/balance')
        .set('Cookie', cookie)
        .set('x-csrf-token', CSRF_TOKEN)
        .send({ workspaceId, balance: 1000 });

      // Create a payment item
      const createRes = await request(app)
        .post('/api/items')
        .set('Cookie', cookie)
        .set('x-csrf-token', CSRF_TOKEN)
        .send({
          workspaceId,
          type: 'RENT',
          label: 'Rent',
          amount: 500,
          dayOfMonth: 1,
        });

      const itemId = createRes.body.data.id;

      // Mark as paid — balance should decrease by 500
      await request(app)
        .put(`/api/items/${itemId}`)
        .set('Cookie', cookie)
        .set('x-csrf-token', CSRF_TOKEN)
        .send({ isPaid: true });

      const wsRes = await request(app).get('/api/workspace').set('Cookie', cookie);
      expect(Number(wsRes.body.data.workspace.balance)).toBe(500);
    });

    it('DELETE /api/items/:id removes item', async () => {
      const { cookie, workspaceId } = await registerUser('delitem', 'Del Item', 'Password123');

      const createRes = await request(app)
        .post('/api/items')
        .set('Cookie', cookie)
        .set('x-csrf-token', CSRF_TOKEN)
        .send({
          workspaceId,
          type: 'OTHER',
          label: 'Delete Me',
          amount: 100,
          dayOfMonth: 15,
        });

      const itemId = createRes.body.data.id;

      const res = await request(app)
        .delete(`/api/items/${itemId}`)
        .set('Cookie', cookie)
        .set('x-csrf-token', CSRF_TOKEN);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify it's gone
      const wsRes = await request(app).get('/api/workspace').set('Cookie', cookie);
      expect(wsRes.body.data.items).toHaveLength(0);
    });
  });

  describe('Sharing', () => {
    it('GET /api/users/search finds user by username', async () => {
      const { cookie } = await registerUser('searcher', 'Searcher', 'Password123');
      await registerUser('findme', 'Find Me', 'Password123');

      const res = await request(app).get('/api/users/search?username=findme').set('Cookie', cookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.username).toBe('findme');
    });

    it('POST /api/workspace/:id/members adds member', async () => {
      const owner = await registerUser('owner1', 'Owner', 'Password123');
      const viewer = await registerUser('viewer1', 'Viewer', 'Password123');

      const res = await request(app)
        .post(`/api/workspace/${owner.workspaceId}/members`)
        .set('Cookie', owner.cookie)
        .set('x-csrf-token', CSRF_TOKEN)
        .send({ userId: viewer.userId, permission: 'VIEWER' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('DELETE /api/workspace/:id/members/:userId removes member', async () => {
      const owner = await registerUser('owner2', 'Owner', 'Password123');
      const viewer = await registerUser('viewer2', 'Viewer', 'Password123');

      await request(app)
        .post(`/api/workspace/${owner.workspaceId}/members`)
        .set('Cookie', owner.cookie)
        .set('x-csrf-token', CSRF_TOKEN)
        .send({ userId: viewer.userId, permission: 'VIEWER' });

      const res = await request(app)
        .delete(`/api/workspace/${owner.workspaceId}/members/${viewer.userId}`)
        .set('Cookie', owner.cookie)
        .set('x-csrf-token', CSRF_TOKEN);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('VIEWER cannot create items (403)', async () => {
      const owner = await registerUser('owner3', 'Owner', 'Password123');
      const viewer = await registerUser('viewer3', 'Viewer', 'Password123');

      await request(app)
        .post(`/api/workspace/${owner.workspaceId}/members`)
        .set('Cookie', owner.cookie)
        .set('x-csrf-token', CSRF_TOKEN)
        .send({ userId: viewer.userId, permission: 'VIEWER' });

      const res = await request(app)
        .post('/api/items')
        .set('Cookie', viewer.cookie)
        .set('x-csrf-token', CSRF_TOKEN)
        .send({
          workspaceId: owner.workspaceId,
          type: 'INCOME',
          label: 'Should Fail',
          amount: 1000,
          dayOfMonth: 10,
        });

      expect(res.status).toBe(403);
    });
  });
});
