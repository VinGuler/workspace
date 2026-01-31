import type { VercelDeployment, VercelProject, VercelDomain } from '../types/index.js';

export class VercelService {
  private token: string;
  private teamId: string;
  private domain: string;
  private baseUrl = 'https://api.vercel.com';

  constructor(token: string, teamId: string, domain: string) {
    this.token = token;
    this.teamId = teamId;
    this.domain = domain;

    console.log('[VercelService] Initialized with:', {
      hasToken: !!token,
      tokenLength: token?.length || 0,
      tokenPreview: token ? `${token.substring(0, 10)}...` : 'MISSING',
      teamId,
      domain,
    });
  }

  /**
   * Tests connection to Vercel API
   */
  async testConnection(): Promise<boolean> {
    try {
      console.log('[VercelService] Testing connection to Vercel API...');
      const response = await this.fetch('/v2/user');

      console.log('[VercelService] Connection response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[VercelService] Connection test failed:', errorText);
      } else {
        console.log('[VercelService] Connection test successful!');
      }

      return response.ok;
    } catch (error) {
      console.error('[VercelService] Connection test error:', error);
      return false;
    }
  }

  /**
   * Gets a project by name or ID
   */
  async getProject(nameOrId: string): Promise<VercelProject | null> {
    try {
      const response = await this.fetch(`/v9/projects/${nameOrId}?teamId=${this.teamId}`);

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`Failed to get project: ${response.statusText}`);
      }

      return (await response.json()) as VercelProject;
    } catch (error) {
      console.error('Error getting project:', error);
      return null;
    }
  }

  /**
   * Creates a new Vercel project
   */
  async createProject(name: string, framework?: string): Promise<VercelProject> {
    try {
      const response = await this.fetch(`/v9/projects?teamId=${this.teamId}`, {
        method: 'POST',
        body: JSON.stringify({
          name,
          framework: framework || null,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to create project: ${error}`);
      }

      return (await response.json()) as VercelProject;
    } catch (error) {
      console.error('Error creating project:', error);
      throw error;
    }
  }

  /**
   * Sets an environment variable for a project
   */
  async setEnvVar(
    projectId: string,
    key: string,
    value: string,
    type: 'encrypted' | 'plain' = 'encrypted'
  ): Promise<void> {
    try {
      const response = await this.fetch(`/v10/projects/${projectId}/env?teamId=${this.teamId}`, {
        method: 'POST',
        body: JSON.stringify({
          key,
          value,
          type,
          target: ['production', 'preview', 'development'],
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to set env var: ${error}`);
      }
    } catch (error) {
      console.error(`Error setting env var ${key}:`, error);
      throw error;
    }
  }

  /**
   * Sets multiple environment variables
   */
  async setEnvVars(projectId: string, vars: Record<string, string>): Promise<void> {
    const promises = Object.entries(vars).map(([key, value]) =>
      this.setEnvVar(projectId, key, value, 'plain')
    );

    await Promise.all(promises);
  }

  /**
   * Adds a custom domain to a project
   */
  async addDomain(projectId: string, domainName: string): Promise<VercelDomain> {
    try {
      const response = await this.fetch(`/v9/projects/${projectId}/domains?teamId=${this.teamId}`, {
        method: 'POST',
        body: JSON.stringify({
          name: domainName,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to add domain: ${error}`);
      }

      return (await response.json()) as VercelDomain;
    } catch (error) {
      console.error(`Error adding domain ${domainName}:`, error);
      throw error;
    }
  }

  /**
   * Verifies a domain
   */
  async verifyDomain(projectId: string, domainName: string): Promise<boolean> {
    try {
      const response = await this.fetch(
        `/v9/projects/${projectId}/domains/${domainName}/verify?teamId=${this.teamId}`,
        {
          method: 'POST',
        }
      );

      if (!response.ok) {
        return false;
      }

      const result = (await response.json()) as { verified?: boolean };
      return result.verified || false;
    } catch {
      return false;
    }
  }

  /**
   * Gets deployment status
   */
  async getDeploymentStatus(deploymentId: string): Promise<VercelDeployment> {
    try {
      const response = await this.fetch(`/v13/deployments/${deploymentId}?teamId=${this.teamId}`);

      if (!response.ok) {
        throw new Error(`Failed to get deployment status: ${response.statusText}`);
      }

      return (await response.json()) as VercelDeployment;
    } catch (error) {
      console.error('Error getting deployment status:', error);
      throw error;
    }
  }

  /**
   * Gets deployment logs
   */
  async getDeploymentLogs(deploymentId: string): Promise<string[]> {
    try {
      const response = await this.fetch(
        `/v2/deployments/${deploymentId}/events?teamId=${this.teamId}`
      );

      if (!response.ok) {
        return [];
      }

      const events = (await response.json()) as Array<{ payload?: { text?: string } }>;
      return events.map((event) => event.payload?.text || '').filter(Boolean);
    } catch {
      return [];
    }
  }

  /**
   * Helper method for making authenticated requests to Vercel API
   */
  private async fetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
    const url = `${this.baseUrl}${endpoint}`;

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.token}`,
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    return fetch(url, {
      ...options,
      headers,
    });
  }
}
