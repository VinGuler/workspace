import type {
  ProjectInfo,
  ProjectType,
  Framework,
  BuildTool,
  DatabaseType,
} from '../types/index.js';
import { readFile } from 'fs/promises';
import { join } from 'path';

export class AnalyzerService {
  /**
   * Analyzes a scanned project and enriches it with type, framework, database info
   */
  async analyze(scannedProject: Partial<ProjectInfo>): Promise<ProjectInfo> {
    const deps = { ...scannedProject.dependencies, ...scannedProject.devDependencies };

    const type = this.detectProjectType(deps);
    const framework = this.detectFramework(deps);
    const buildTool = this.detectBuildTool(deps, scannedProject.scripts || {});
    const { hasDatabase, databaseType } = this.detectDatabase(deps);
    const detectedEnvVars = await this.extractEnvVars(scannedProject.path || '');

    return {
      name: scannedProject.name || 'unknown',
      path: scannedProject.path || '',
      type,
      framework,
      buildTool,
      nodeVersion: scannedProject.nodeVersion,
      dependencies: scannedProject.dependencies || {},
      devDependencies: scannedProject.devDependencies || {},
      scripts: scannedProject.scripts || {},
      hasDatabase,
      databaseType,
      detectedEnvVars,
    };
  }

  /**
   * Detects project type (frontend/backend/fullstack)
   */
  private detectProjectType(deps: Record<string, string>): ProjectType {
    const hasFrontend = ['vue', 'react', 'svelte', 'next', 'nuxt', '@vitejs/plugin-vue'].some(
      (pkg) => deps[pkg]
    );
    const hasBackend = ['express', 'fastify', '@nestjs/core', 'koa'].some((pkg) => deps[pkg]);

    if (hasFrontend && hasBackend) {
      return 'fullstack';
    }
    if (hasFrontend) {
      return 'frontend';
    }
    if (hasBackend) {
      return 'backend';
    }

    // Check for Next.js or Nuxt (fullstack frameworks)
    if (deps['next'] || deps['nuxt']) {
      return 'fullstack';
    }

    return 'frontend'; // Default to frontend
  }

  /**
   * Detects framework
   */
  private detectFramework(deps: Record<string, string>): Framework | undefined {
    if (deps['vue']) return 'vue';
    if (deps['react']) return 'react';
    if (deps['next']) return 'next';
    if (deps['nuxt']) return 'nuxt';
    if (deps['svelte']) return 'svelte';
    if (deps['express']) return 'express';
    if (deps['fastify']) return 'fastify';
    if (deps['@nestjs/core']) return 'nest';

    return undefined;
  }

  /**
   * Detects build tool
   */
  private detectBuildTool(
    deps: Record<string, string>,
    scripts: Record<string, string>
  ): BuildTool | undefined {
    // Next.js has its own build system
    if (deps['next']) return 'next';

    // Check dependencies first
    if (deps['vite'] || deps['@vitejs/plugin-vue']) return 'vite';
    if (deps['webpack']) return 'webpack';
    if (deps['esbuild']) return 'esbuild';
    if (deps['rollup']) return 'rollup';

    // Check build scripts
    const buildScript = scripts.build || '';
    if (buildScript.includes('vite')) return 'vite';
    if (buildScript.includes('webpack')) return 'webpack';
    if (buildScript.includes('esbuild')) return 'esbuild';
    if (buildScript.includes('rollup')) return 'rollup';
    if (buildScript.includes('tsc')) return 'tsc';

    return undefined;
  }

  /**
   * Detects database usage - KEY FEATURE
   */
  private detectDatabase(deps: Record<string, string>): {
    hasDatabase: boolean;
    databaseType?: DatabaseType;
  } {
    // Check for Prisma (most common)
    if (deps['@prisma/client'] || deps['prisma']) {
      return { hasDatabase: true, databaseType: 'prisma' };
    }

    // PostgreSQL
    if (deps['pg'] || deps['pg-promise'] || deps['postgres']) {
      return { hasDatabase: true, databaseType: 'postgres' };
    }

    // MySQL
    if (deps['mysql'] || deps['mysql2']) {
      return { hasDatabase: true, databaseType: 'mysql' };
    }

    // MongoDB
    if (deps['mongodb'] || deps['mongoose']) {
      return { hasDatabase: true, databaseType: 'mongodb' };
    }

    // SQLite
    if (deps['sqlite3'] || deps['better-sqlite3']) {
      return { hasDatabase: true, databaseType: 'sqlite' };
    }

    return { hasDatabase: false };
  }

  /**
   * Extracts environment variables from source code (heuristic)
   */
  private async extractEnvVars(projectPath: string): Promise<string[]> {
    const envVars: Set<string> = new Set();

    try {
      // Common source file locations
      const possibleFiles = [
        'src/index.ts',
        'src/index.js',
        'src/main.ts',
        'src/main.js',
        'src/server/index.ts',
        'src/server.ts',
        'src/app.ts',
        'index.ts',
        'index.js',
      ];

      for (const file of possibleFiles) {
        try {
          const content = await readFile(join(projectPath, file), 'utf-8');

          // Match process.env.VARIABLE_NAME
          const regex = /process\.env\.([A-Z_][A-Z0-9_]*)/g;
          let match;

          while ((match = regex.exec(content)) !== null) {
            const varName = match[1];
            // Filter out common Node.js env vars
            if (!['NODE_ENV', 'PORT'].includes(varName)) {
              envVars.add(varName);
            }
          }
        } catch {
          // File doesn't exist, continue
        }
      }

      // Also check for .env.example
      try {
        const envExample = await readFile(join(projectPath, '.env.example'), 'utf-8');
        const lines = envExample.split('\n');

        for (const line of lines) {
          const match = line.match(/^([A-Z_][A-Z0-9_]*)\s*=/);
          if (match && !['NODE_ENV', 'PORT'].includes(match[1])) {
            envVars.add(match[1]);
          }
        }
      } catch {
        // .env.example doesn't exist
      }
    } catch (error) {
      console.error(`Could not detect env vars for ${projectPath}:`, error);
    }

    return Array.from(envVars);
  }
}
