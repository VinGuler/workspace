// Core Types
export type ProjectType = 'frontend' | 'backend' | 'fullstack';
export type Framework =
  | 'vue'
  | 'react'
  | 'next'
  | 'express'
  | 'fastify'
  | 'nest'
  | 'nuxt'
  | 'svelte';
export type BuildTool = 'vite' | 'webpack' | 'tsc' | 'next' | 'esbuild' | 'rollup';
export type DatabaseType = 'postgres' | 'mysql' | 'mongodb' | 'prisma' | 'sqlite';
export type DeploymentStatus = 'queued' | 'building' | 'ready' | 'error' | 'canceled';

// Project Information
export interface ProjectInfo {
  name: string;
  path: string;
  type: ProjectType;
  framework?: Framework;
  buildTool?: BuildTool;
  nodeVersion?: string;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  scripts: Record<string, string>;
  hasDatabase: boolean;
  databaseType?: DatabaseType;
  detectedEnvVars: string[];
}

// Saved Project (Persisted)
export interface SavedProject extends ProjectInfo {
  id: string;
  scannedAt: string;
  lastDeployedAt?: string;
  deploymentCount: number;
  vercelProjectId?: string;
  currentDomain?: string;
}

// Deployment Configuration (User Input)
export interface DeploymentConfig {
  projectId: string;
  projectName: string;
  projectPath: string;
  subdomain: string;
  envVars: Record<string, string>;
  databaseUrl?: string;
  buildCommand?: string;
  outputDirectory?: string;
  installCommand?: string;
}

// Deployment Record (Persisted)
export interface DeploymentRecord {
  id: string;
  projectId: string;
  projectName: string;
  status: DeploymentStatus;
  subdomain: string;
  fullDomain: string;
  startedAt: string;
  completedAt?: string;
  logs: string[];
  error?: string;
  vercelDeploymentId?: string;
  vercelDeploymentUrl?: string;
  customDomainConfigured: boolean;
  envVarsSet: string[];
  hasDatabase: boolean;
}

// Vercel API Response Types
export interface VercelDeployment {
  id: string;
  url: string;
  state: 'BUILDING' | 'READY' | 'ERROR' | 'CANCELED';
  readyState: 'QUEUED' | 'BUILDING' | 'READY' | 'ERROR' | 'CANCELED';
  createdAt: number;
  buildingAt?: number;
  ready?: number;
  target?: string;
}

export interface VercelProject {
  id: string;
  name: string;
  framework?: string;
  devCommand?: string;
  buildCommand?: string;
  outputDirectory?: string;
}

export interface VercelDomain {
  name: string;
  verified: boolean;
  verification?: any[];
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface ScanResult {
  projects: SavedProject[];
  scannedAt: string;
}
