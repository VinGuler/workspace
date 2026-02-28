import { createAuthConfig } from '@workspace/login';

export const authConfig = createAuthConfig({
  cookieName: 'ft_token',
  csrfCookieName: 'ft_csrf',
  appName: 'Finance Tracker',
  appBaseUrl: process.env.APP_BASE_URL || 'http://localhost:5174',
  emailFrom: process.env.EMAIL_FROM || 'noreply@finance-tracker.local',
});
