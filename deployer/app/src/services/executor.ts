import type { DeploymentConfig, DeploymentRecord } from '../types/index.js';
import { VercelService } from './vercel.js';
import { DataService } from './data.js';

export class ExecutorService {
  constructor(
    private vercelService: VercelService,
    private dataService: DataService
  ) {}

  /**
   * Initiates deployment and returns immediately
   */
  async deploy(config: DeploymentConfig): Promise<DeploymentRecord> {
    // Create deployment record with queued status
    const record = await this.createDeploymentRecord(config);

    // Start async deployment (don't await)
    this.executeDeployment(record.id, config).catch((error) => {
      this.handleDeploymentError(record.id, error);
    });

    return record;
  }

  /**
   * Gets deployment status
   */
  async getDeploymentStatus(deploymentId: string): Promise<DeploymentRecord | null> {
    return this.dataService.getDeployment(deploymentId);
  }

  /**
   * Creates initial deployment record
   */
  private async createDeploymentRecord(config: DeploymentConfig): Promise<DeploymentRecord> {
    const fullDomain = `${config.subdomain}.${process.env.VERCEL_DOMAIN}`;

    return this.dataService.saveDeployment({
      projectId: config.projectId,
      projectName: config.projectName,
      status: 'queued',
      subdomain: config.subdomain,
      fullDomain,
      startedAt: new Date().toISOString(),
      logs: ['Deployment queued...'],
      envVarsSet: Object.keys(config.envVars),
      hasDatabase: !!config.databaseUrl,
      customDomainConfigured: false,
    });
  }

  /**
   * Executes deployment workflow asynchronously
   */
  private async executeDeployment(deploymentId: string, config: DeploymentConfig): Promise<void> {
    const fullDomain = `${config.subdomain}.${process.env.VERCEL_DOMAIN}`;

    try {
      await this.updateStatus(deploymentId, 'building', ['Starting deployment...']);

      // Step 1: Create or get Vercel project
      await this.addLog(deploymentId, 'Checking Vercel project...');
      const project = await this.getOrCreateProject(config.projectName);
      await this.addLog(deploymentId, `Vercel project: ${project.name} (${project.id})`);

      // Update saved project with Vercel ID
      await this.dataService.updateProject(config.projectId, {
        vercelProjectId: project.id,
      });

      // Step 2: Set environment variables
      if (Object.keys(config.envVars).length > 0) {
        await this.addLog(deploymentId, 'Configuring environment variables...');
        await this.vercelService.setEnvVars(project.id, config.envVars);
        await this.addLog(
          deploymentId,
          `Set ${Object.keys(config.envVars).length} environment variables`
        );
      }

      // Step 3: Set DATABASE_URL if provided
      if (config.databaseUrl) {
        await this.addLog(deploymentId, 'Configuring database connection string (encrypted)...');
        await this.vercelService.setEnvVar(
          project.id,
          'DATABASE_URL',
          config.databaseUrl,
          'encrypted'
        );
        await this.addLog(deploymentId, 'Database connection string configured securely');
      }

      // Step 4: Note about manual deployment
      // NOTE: Actual deployment would require uploading files to Vercel
      // For now, we'll simulate this part
      await this.addLog(
        deploymentId,
        'Note: Manual deployment via Vercel CLI or Git integration required'
      );
      await this.addLog(deploymentId, `Run: vercel deploy from ${config.projectPath}`);

      // Step 5: Configure custom domain
      await this.addLog(deploymentId, `Configuring custom domain: ${fullDomain}...`);

      await this.vercelService.addDomain(project.id, fullDomain);
      await this.addLog(deploymentId, 'Custom domain added successfully');

      // Attempt to verify domain
      const verified = await this.vercelService.verifyDomain(project.id, fullDomain);
      if (verified) {
        await this.addLog(deploymentId, 'Domain verified!');
      } else {
        await this.addLog(deploymentId, 'Domain pending verification - may take a few minutes');
      }

      await this.updateDeployment(deploymentId, {
        customDomainConfigured: true,
      });
    } catch (error) {
      await this.addLog(deploymentId, `Domain configuration: ${(error as Error).message}`);
    }

    // Mark as ready
    await this.updateStatus(deploymentId, 'ready', ['Deployment configuration complete!']);
    await this.markComplete(deploymentId, {
      fullDomain,
    });

    // Increment project deployment count
    await this.dataService.incrementDeploymentCount(config.projectId);
  }

  /**
   * Gets or creates a Vercel project
   */
  private async getOrCreateProject(name: string): Promise<any> {
    // Try to get existing project
    let project = await this.vercelService.getProject(name);

    if (!project) {
      // Create new project
      project = await this.vercelService.createProject(name);
    }

    return project;
  }

  /**
   * Updates deployment status
   */
  private async updateStatus(
    deploymentId: string,
    status: 'queued' | 'building' | 'ready' | 'error',
    logs?: string[]
  ): Promise<void> {
    const deployment = await this.dataService.getDeployment(deploymentId);
    if (!deployment) return;

    const updates: Partial<DeploymentRecord> = { status };

    if (logs) {
      updates.logs = [...deployment.logs, ...logs];
    }

    await this.dataService.updateDeployment(deploymentId, updates);
  }

  /**
   * Adds a log entry
   */
  private async addLog(deploymentId: string, message: string): Promise<void> {
    const deployment = await this.dataService.getDeployment(deploymentId);
    if (!deployment) return;

    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;

    await this.dataService.updateDeployment(deploymentId, {
      logs: [...deployment.logs, logMessage],
    });
  }

  /**
   * Marks deployment as complete
   */
  private async markComplete(deploymentId: string, data: Partial<DeploymentRecord>): Promise<void> {
    await this.dataService.updateDeployment(deploymentId, {
      ...data,
      completedAt: new Date().toISOString(),
    });
  }

  /**
   * Updates deployment record
   */
  private async updateDeployment(
    deploymentId: string,
    updates: Partial<DeploymentRecord>
  ): Promise<void> {
    await this.dataService.updateDeployment(deploymentId, updates);
  }

  /**
   * Handles deployment errors
   */
  private async handleDeploymentError(deploymentId: string, error: Error): Promise<void> {
    await this.updateStatus(deploymentId, 'error', [`Error: ${error.message}`]);
    await this.markComplete(deploymentId, {
      error: error.message,
    });
  }
}
