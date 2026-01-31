import dotenv from 'dotenv';
// Load environment variables
dotenv.config();

import { Router } from 'express';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { ScannerService } from '../services/scanner.js';
import { AnalyzerService } from '../services/analyzer.js';
import { VercelService } from '../services/vercel.js';
import { ExecutorService } from '../services/executor.js';
import { DataService } from '../services/data.js';
import type { DeploymentConfig } from '../types/index.js';
import { validateDeploymentConfig, validateSubdomain } from '../utils/validator.js';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = Router();

// Initialize services
const dataService = new DataService();
const vercelService = new VercelService(
  process.env.VERCEL_TOKEN || '',
  process.env.VERCEL_TEAM_ID || '',
  process.env.VERCEL_DOMAIN || ''
);
const scannerService = new ScannerService();
const analyzerService = new AnalyzerService();
const executorService = new ExecutorService(vercelService, dataService);

/**
 * POST /api/scan - Scan packages directory for projects
 * Body: { path?: string } (optional, defaults to ../../packages)
 */
router.post('/api/scan', async (req, res) => {
  try {
    // Default to scanning the packages folder relative to the deployer
    const { path } = req.body;
    const scanPath = path || join(__dirname, '..', '..', '..', '..', 'packages');

    logger.info(`Scanning directory: ${scanPath}`);

    // Scan and analyze projects
    const scannedProjects = await scannerService.scanDirectory(scanPath);
    const analyzedProjects = await Promise.all(
      scannedProjects.map((project) => analyzerService.analyze(project))
    );

    // Save each project
    const savedProjects = await Promise.all(
      analyzedProjects.map((project) => dataService.saveProject(project))
    );

    logger.info(`Found ${savedProjects.length} projects`);

    res.json({
      success: true,
      data: savedProjects,
    });
  } catch (error) {
    logger.error(`Scan error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/projects - Get all saved projects
 */
router.get('/api/projects', async (req, res) => {
  try {
    const projects = await dataService.getAllProjects();

    // Enhance with latest deployment info
    const projectsWithDeployments = await Promise.all(
      projects.map(async (project) => {
        const latestDeployment = await dataService.getLatestDeployment(project.id);
        return {
          ...project,
          latestDeployment: latestDeployment
            ? {
                status: latestDeployment.status,
                fullDomain: latestDeployment.fullDomain,
                deployedAt: latestDeployment.completedAt || latestDeployment.startedAt,
              }
            : null,
        };
      })
    );

    res.json({
      success: true,
      data: projectsWithDeployments,
    });
  } catch (error) {
    logger.error(`Get projects error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/projects/:id - Get a specific project
 */
router.get('/api/projects/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const project = await dataService.getProject(id);

    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found',
      });
    }

    // Get deployment history
    const deployments = await dataService.getDeploymentsByProject(id);

    res.json({
      success: true,
      data: {
        ...project,
        deployments,
      },
    });
  } catch (error) {
    logger.error(`Get project error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/deploy - Execute deployment
 * Body: DeploymentConfig
 */
router.post('/api/deploy', async (req, res) => {
  try {
    const deploymentConfig: DeploymentConfig = req.body;

    // Validate deployment config
    const validation = validateDeploymentConfig(deploymentConfig);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: 'Invalid deployment configuration',
        details: validation.errors,
      });
    }

    logger.info(`Starting deployment for project: ${deploymentConfig.projectName}`);

    // Start deployment (returns immediately with queued status)
    const deployment = await executorService.deploy(deploymentConfig);

    res.json({
      success: true,
      data: deployment,
    });
  } catch (error) {
    logger.error(`Deploy error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/deployment/:id/status - Check deployment status
 */
router.get('/api/deployment/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const deployment = await executorService.getDeploymentStatus(id);

    if (!deployment) {
      return res.status(404).json({
        success: false,
        error: 'Deployment not found',
      });
    }

    res.json({
      success: true,
      data: deployment,
    });
  } catch (error) {
    logger.error(
      `Get deployment status error: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/deployment/:id/logs - Get deployment logs
 */
router.get('/api/deployment/:id/logs', async (req, res) => {
  try {
    const { id } = req.params;
    const deployment = await dataService.getDeployment(id);

    if (!deployment) {
      return res.status(404).json({
        success: false,
        error: 'Deployment not found',
      });
    }

    res.json({
      success: true,
      data: {
        logs: deployment.logs,
        status: deployment.status,
      },
    });
  } catch (error) {
    logger.error(
      `Get deployment logs error: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/deployments - Get all deployments
 */
router.get('/api/deployments', async (req, res) => {
  try {
    const deployments = await dataService.getAllDeployments();

    res.json({
      success: true,
      data: deployments,
    });
  } catch (error) {
    logger.error(
      `Get deployments error: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/subdomain/check/:subdomain - Check if subdomain is available
 */
router.get('/api/subdomain/check/:subdomain', async (req, res) => {
  try {
    const { subdomain } = req.params;

    // Validate subdomain format
    const validation = validateSubdomain(subdomain);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: validation.error,
      });
    }

    // Check if subdomain already exists in deployments
    const allDeployments = await dataService.getAllDeployments();
    const fullDomain = `${subdomain}.${process.env.VERCEL_DOMAIN}`;
    const exists = allDeployments.some((d) => d.fullDomain === fullDomain);

    res.json({
      success: true,
      data: {
        available: !exists,
        subdomain,
        fullDomain,
      },
    });
  } catch (error) {
    logger.error(
      `Check subdomain error: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/vercel/connection - Test Vercel API connection
 */
router.get('/api/vercel/connection', async (req, res) => {
  try {
    const connected = await vercelService.testConnection();

    res.json({
      success: true,
      data: {
        connected,
        teamId: process.env.VERCEL_TEAM_ID,
        domain: process.env.VERCEL_DOMAIN,
      },
    });
  } catch (error) {
    logger.error(
      `Test connection error: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
