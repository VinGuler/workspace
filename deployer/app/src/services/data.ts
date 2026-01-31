import { readFile, writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { SavedProject, DeploymentRecord, ProjectInfo } from '../types/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATA_DIR = join(__dirname, '..', '..', 'data');
const PROJECTS_FILE = join(DATA_DIR, 'projects.json');
const DEPLOYMENTS_FILE = join(DATA_DIR, 'deployments.json');

/**
 * Ensures data directory exists
 */
async function ensureDataDir() {
  try {
    await mkdir(DATA_DIR, { recursive: true });
  } catch {
    // Directory might already exist, ignore
  }
}

/**
 * Generates unique IDs
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

export class DataService {
  // Projects

  async getAllProjects(): Promise<SavedProject[]> {
    try {
      await ensureDataDir();
      const data = await readFile(PROJECTS_FILE, 'utf-8');
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  async saveProject(projectInfo: ProjectInfo): Promise<SavedProject> {
    const projects = await this.getAllProjects();

    // Check if project already exists (by name and path)
    const existingIndex = projects.findIndex(
      (p) => p.name === projectInfo.name && p.path === projectInfo.path
    );

    let savedProject: SavedProject;

    if (existingIndex >= 0) {
      // Update existing project
      savedProject = {
        ...projects[existingIndex],
        ...projectInfo,
        scannedAt: new Date().toISOString(),
      };
      projects[existingIndex] = savedProject;
    } else {
      // Create new project
      savedProject = {
        ...projectInfo,
        id: generateId(),
        scannedAt: new Date().toISOString(),
        deploymentCount: 0,
      };
      projects.push(savedProject);
    }

    await this.writeJSON(PROJECTS_FILE, projects);
    return savedProject;
  }

  async getProject(id: string): Promise<SavedProject | null> {
    const projects = await this.getAllProjects();
    return projects.find((p) => p.id === id) || null;
  }

  async updateProject(id: string, updates: Partial<SavedProject>): Promise<void> {
    const projects = await this.getAllProjects();
    const index = projects.findIndex((p) => p.id === id);

    if (index >= 0) {
      projects[index] = { ...projects[index], ...updates };
      await this.writeJSON(PROJECTS_FILE, projects);
    }
  }

  async incrementDeploymentCount(projectId: string): Promise<void> {
    const projects = await this.getAllProjects();
    const index = projects.findIndex((p) => p.id === projectId);

    if (index >= 0) {
      projects[index].lastDeployedAt = new Date().toISOString();
      projects[index].deploymentCount++;
      await this.writeJSON(PROJECTS_FILE, projects);
    }
  }

  // Deployments

  async getAllDeployments(): Promise<DeploymentRecord[]> {
    try {
      await ensureDataDir();
      const data = await readFile(DEPLOYMENTS_FILE, 'utf-8');
      const deployments = JSON.parse(data);
      // Sort by startedAt descending
      return deployments.sort(
        (a: DeploymentRecord, b: DeploymentRecord) =>
          new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
      );
    } catch {
      return [];
    }
  }

  async getDeploymentsByProject(projectId: string): Promise<DeploymentRecord[]> {
    const deployments = await this.getAllDeployments();
    return deployments.filter((d) => d.projectId === projectId);
  }

  async getDeployment(id: string): Promise<DeploymentRecord | null> {
    const deployments = await this.getAllDeployments();
    return deployments.find((d) => d.id === id) || null;
  }

  async saveDeployment(deployment: Omit<DeploymentRecord, 'id'>): Promise<DeploymentRecord> {
    const deployments = await this.getAllDeployments();

    const newDeployment: DeploymentRecord = {
      ...deployment,
      id: generateId(),
    };

    deployments.push(newDeployment);
    await this.writeJSON(DEPLOYMENTS_FILE, deployments);

    return newDeployment;
  }

  async updateDeployment(id: string, updates: Partial<DeploymentRecord>): Promise<void> {
    const deployments = await this.getAllDeployments();
    const index = deployments.findIndex((d) => d.id === id);

    if (index >= 0) {
      deployments[index] = { ...deployments[index], ...updates };
      await this.writeJSON(DEPLOYMENTS_FILE, deployments);
    }
  }

  async getLatestDeployment(projectId: string): Promise<DeploymentRecord | null> {
    const deployments = await this.getDeploymentsByProject(projectId);
    return deployments.length > 0 ? deployments[0] : null;
  }

  // Utility

  private async writeJSON<T>(file: string, data: T): Promise<void> {
    await ensureDataDir();
    await writeFile(file, JSON.stringify(data, null, 2), 'utf-8');
  }
}
