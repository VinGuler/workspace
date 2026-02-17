if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required in production');
}

export const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
export const SALT_ROUNDS = parseInt(process.env.SALT_ROUNDS || '10', 10);
export const TOKEN_EXPIRY = '24h';
export const COOKIE_NAME = 'ft_token';
