import { readdir, readFile, stat } from 'fs/promises';
import { join } from 'path';
import type { ProjectInfo } from '../types/index.js';

export class ScannerService {
  /**
   * Scans a directory for projects (looks for package.json files)
   */
  async scanDirectory(scanPath: string): Promise<Partial<ProjectInfo>[]> {
    const projects: Partial<ProjectInfo>[] = [];

    try {
      // Check if the path itself is a project
      if (await this.hasPackageJson(scanPath)) {
        const project = await this.parsePackageJson(scanPath);
        if (project) {
          projects.push(project);
        }
      }

      // Also check subdirectories (for monorepo support)
      const entries = await readdir(scanPath, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isDirectory() && !this.shouldSkipDirectory(entry.name)) {
          const subPath = join(scanPath, entry.name);

          if (await this.hasPackageJson(subPath)) {
            const project = await this.parsePackageJson(subPath);
            if (project) {
              projects.push(project);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error scanning directory:', error);
      throw new Error(`Failed to scan directory: ${(error as Error).message}`);
    }

    return projects;
  }

  /**
   * Checks if a directory has a package.json file
   */
  private async hasPackageJson(dirPath: string): Promise<boolean> {
    try {
      const packagePath = join(dirPath, 'package.json');
      const stats = await stat(packagePath);
      return stats.isFile();
    } catch {
      return false;
    }
  }

  /**
   * Parses package.json and extracts project metadata
   */
  private async parsePackageJson(dirPath: string): Promise<Partial<ProjectInfo> | null> {
    try {
      const packagePath = join(dirPath, 'package.json');
      const content = await readFile(packagePath, 'utf-8');
      const packageJson = JSON.parse(content);

      return {
        name: packageJson.name || 'unknown',
        path: dirPath,
        dependencies: packageJson.dependencies || {},
        devDependencies: packageJson.devDependencies || {},
        scripts: packageJson.scripts || {},
        nodeVersion: packageJson.engines?.node,
      };
    } catch (error) {
      console.error(`Error parsing package.json at ${dirPath}:`, error);
      return null;
    }
  }

  /**
   * Directories to skip when scanning
   */
  private shouldSkipDirectory(name: string): boolean {
    const skipList = [
      'node_modules',
      'dist',
      'build',
      '.git',
      '.next',
      '.nuxt',
      'coverage',
      '.vscode',
      '.idea',
    ];

    return skipList.includes(name) || name.startsWith('.');
  }
}
