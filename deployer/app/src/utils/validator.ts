import type { DeploymentConfig } from '../types/index.js';

/**
 * Validates a deployment configuration
 */
export function validateDeploymentConfig(config: DeploymentConfig): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Required fields
  if (!config.projectId || config.projectId.trim() === '') {
    errors.push('Project ID is required');
  }

  if (!config.projectName || config.projectName.trim() === '') {
    errors.push('Project name is required');
  }

  if (!config.projectPath || config.projectPath.trim() === '') {
    errors.push('Project path is required');
  }

  if (!config.subdomain || config.subdomain.trim() === '') {
    errors.push('Subdomain is required');
  }

  // Validate subdomain format (alphanumeric and hyphens only, no spaces)
  if (config.subdomain && !/^[a-z0-9-]+$/.test(config.subdomain)) {
    errors.push('Subdomain must contain only lowercase letters, numbers, and hyphens');
  }

  // Validate environment variables
  if (!config.envVars || typeof config.envVars !== 'object') {
    errors.push('Environment variables must be an object');
  }

  // Validate database URL format if provided
  if (config.databaseUrl && config.databaseUrl.trim() === '') {
    errors.push('Database URL cannot be empty if provided');
  }

  const valid = errors.length === 0;

  return { valid, errors };
}

/**
 * Validates environment variables against required list
 */
export function validateEnvVars(
  required: string[],
  provided: Record<string, string>
): { valid: boolean; missing: string[] } {
  const missing = required.filter((key) => !provided[key] || provided[key].trim() === '');

  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Validates subdomain availability (checks for valid characters and length)
 */
export function validateSubdomain(subdomain: string): {
  valid: boolean;
  error?: string;
} {
  if (!subdomain || subdomain.trim() === '') {
    return { valid: false, error: 'Subdomain cannot be empty' };
  }

  if (subdomain.length < 3) {
    return { valid: false, error: 'Subdomain must be at least 3 characters long' };
  }

  if (subdomain.length > 63) {
    return { valid: false, error: 'Subdomain must be at most 63 characters long' };
  }

  if (!/^[a-z0-9-]+$/.test(subdomain)) {
    return {
      valid: false,
      error: 'Subdomain must contain only lowercase letters, numbers, and hyphens',
    };
  }

  if (subdomain.startsWith('-') || subdomain.endsWith('-')) {
    return { valid: false, error: 'Subdomain cannot start or end with a hyphen' };
  }

  return { valid: true };
}
