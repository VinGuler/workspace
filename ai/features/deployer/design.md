# Deployer Design & Implementation Plan

## System Overview

The Deployer is a Vercel-focused deployment tool that streamlines deploying projects to Vercel with custom subdomain configuration on `vinguler.com`. It automatically detects database usage and manages connection strings as Vercel secrets.

**Key Differentiators:**

- Vercel-only (no multi-vendor complexity)
- Custom subdomain configuration (`{subdomain}.vinguler.com`)
- Automatic database detection and connection string management
- Simple, deterministic deployment workflow

---

## Architecture

### High-Level Components

```
┌─────────────────────────────────────────────────────────┐
│                     Web Browser                          │
│                   (User Interface)                       │
└────────────────────┬────────────────────────────────────┘
                     │ HTTP/REST API
┌────────────────────▼────────────────────────────────────┐
│                 Express Server                           │
│                  (API Routes)                            │
└─────┬──────────┬─────────┬──────────┬───────────────────┘
      │          │         │          │
      ▼          ▼         ▼          ▼
┌─────────┐ ┌─────────┐ ┌────────┐ ┌──────────┐
│ Scanner │ │Analyzer │ │ Vercel │ │ Executor │
│         │ │         │ │Service │ │          │
└─────────┘ └─────────┘ └────────┘ └────┬─────┘
                            │             │
                            │             │
                    ┌───────▼─────────────▼──────┐
                    │     Vercel API             │
                    │  - Deployments             │
                    │  - Projects                │
                    │  - Domains                 │
                    │  - Environment Variables   │
                    └────────────────────────────┘
      ┌─────────────────────────────┐
      │      Data Service           │
      │   (JSON Persistence)        │
      └──────┬──────────────────────┘
             │
      ┌──────▼──────┐  ┌──────────────┐
      │projects.json│  │deployments.json│
      └─────────────┘  └──────────────┘
```

### Component Responsibilities

1. **Scanner** - Discovers projects in working directory
2. **Analyzer** - Classifies projects, detects database usage
3. **Vercel Service** - Handles all Vercel API interactions (deployments, domains, secrets)
4. **Executor** - Orchestrates deployment workflow
5. **Data Service** - Persists projects and deployment records locally

---

## Data Models

### Project Information

```typescript
interface ProjectInfo {
  name: string; // Project name
  path: string; // Absolute path to project
  type: ProjectType; // frontend | backend | fullstack
  framework?: Framework; // vue | react | express | next | etc.
  buildTool?: BuildTool; // vite | webpack | tsc | next | etc.
  nodeVersion?: string; // Required Node version
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  scripts: Record<string, string>;
  hasDatabase: boolean; // Database dependency detected
  databaseType?: DatabaseType; // postgres | mysql | mongodb | prisma
  detectedEnvVars: string[]; // Detected env var requirements
}

type ProjectType = 'frontend' | 'backend' | 'fullstack';
type Framework = 'vue' | 'react' | 'next' | 'express' | 'fastify' | 'nest' | 'nuxt' | 'svelte';
type BuildTool = 'vite' | 'webpack' | 'tsc' | 'next' | 'esbuild' | 'rollup';
type DatabaseType = 'postgres' | 'mysql' | 'mongodb' | 'prisma' | 'sqlite';
```

### Saved Project (Persisted)

```typescript
interface SavedProject extends ProjectInfo {
  id: string; // Unique identifier (UUID)
  scannedAt: string; // ISO timestamp of last scan
  lastDeployedAt?: string; // ISO timestamp of last deployment
  deploymentCount: number; // Total deployments for this project
  vercelProjectId?: string; // Vercel project ID (if deployed)
  currentDomain?: string; // Current custom domain (e.g., myapp.vinguler.com)
}
```

### Deployment Configuration (User Input)

```typescript
interface DeploymentConfig {
  projectId: string; // Local project ID
  projectName: string; // Project name
  projectPath: string; // Path to project
  subdomain: string; // Subdomain prefix (e.g., "myapp")
  envVars: Record<string, string>; // User-provided env vars
  databaseUrl?: string; // Database connection string (if hasDatabase)
  buildCommand?: string; // Custom build command (optional)
  outputDirectory?: string; // Custom output directory (optional)
  installCommand?: string; // Custom install command (optional)
}
```

### Deployment Record (Persisted)

```typescript
interface DeploymentRecord {
  id: string; // Unique deployment ID (UUID)
  projectId: string; // Foreign key to SavedProject
  projectName: string; // Denormalized for querying
  status: DeploymentStatus; // queued | building | ready | error | canceled
  subdomain: string; // Deployed subdomain
  fullDomain: string; // Full domain (e.g., myapp.vinguler.com)
  startedAt: string; // ISO timestamp
  completedAt?: string; // ISO timestamp (if completed)
  logs: string[]; // Deployment logs
  error?: string; // Error message (if failed)
  vercelDeploymentId?: string; // Vercel deployment ID
  vercelDeploymentUrl?: string; // Vercel deployment URL
  customDomainConfigured: boolean; // Whether custom domain was set
  envVarsSet: string[]; // Env var keys (no values)
  hasDatabase: boolean; // Whether DATABASE_URL was configured
}

type DeploymentStatus = 'queued' | 'building' | 'ready' | 'error' | 'canceled';
```

### Vercel API Response Types

```typescript
// Vercel Deployment Response
interface VercelDeployment {
  id: string;
  url: string; // vercel.app URL
  state: 'BUILDING' | 'READY' | 'ERROR' | 'CANCELED';
  readyState: 'QUEUED' | 'BUILDING' | 'READY' | 'ERROR' | 'CANCELED';
  createdAt: number;
  buildingAt?: number;
  ready?: number;
  target?: string; // production | preview
}

// Vercel Project Response
interface VercelProject {
  id: string;
  name: string;
  framework?: string;
  devCommand?: string;
  buildCommand?: string;
  outputDirectory?: string;
}

// Vercel Domain Response
interface VercelDomain {
  name: string;
  verified: boolean;
  verification?: any[];
}
```

---

## API Endpoints

### Project Management

#### `GET /api/scan`

Scans the working directory, analyzes projects, and saves to disk.

**Query Parameters:**

- `path` (optional): Path to scan (defaults to current directory)

**Response:**

```json
{
  "success": true,
  "data": {
    "projects": SavedProject[],
    "scannedAt": "2024-01-15T10:30:00Z"
  }
}
```

#### `GET /api/projects`

Retrieves all saved projects with deployment stats.

**Response:**

```json
{
  "success": true,
  "data": [
    {
      ...SavedProject,
      "latestDeployment": {
        "status": "ready",
        "deployedAt": "2024-01-15T10:30:00Z",
        "domain": "myapp.vinguler.com"
      }
    }
  ]
}
```

#### `GET /api/projects/:id`

Retrieves a specific project by ID.

**Response:**

```json
{
  "success": true,
  "data": {
    ...SavedProject,
    "deploymentHistory": DeploymentRecord[]
  }
}
```

### Deployment Execution

#### `POST /api/deploy`

Executes a deployment to Vercel.

**Request Body:**

```json
{
  "projectId": "uuid-here",
  "projectName": "my-app",
  "projectPath": "/path/to/project",
  "subdomain": "myapp",
  "envVars": {
    "API_URL": "https://api.example.com",
    "NODE_ENV": "production"
  },
  "databaseUrl": "postgresql://user:pass@host:5432/db",
  "buildCommand": "npm run build",
  "outputDirectory": "dist"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "deployment-uuid",
    "projectId": "project-uuid",
    "status": "queued",
    "subdomain": "myapp",
    "fullDomain": "myapp.vinguler.com",
    "startedAt": "2024-01-15T10:30:00Z",
    "logs": ["Initializing deployment..."]
  }
}
```

#### `GET /api/deployment/:id/status`

Checks the status of a specific deployment.

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "deployment-uuid",
    "status": "ready",
    "completedAt": "2024-01-15T10:35:00Z",
    "vercelDeploymentUrl": "https://myapp-xyz.vercel.app",
    "customDomain": "myapp.vinguler.com",
    "logs": ["...", "Deployment ready!"]
  }
}
```

#### `GET /api/deployment/:id/logs`

Retrieves deployment logs.

**Response:**

```json
{
  "success": true,
  "data": {
    "logs": [
      "Starting deployment...",
      "Installing dependencies...",
      "Building project...",
      "Deploying to Vercel...",
      "Configuring custom domain...",
      "Deployment complete!"
    ]
  }
}
```

### Deployment History

#### `GET /api/deployments`

Retrieves all deployment records.

**Query Parameters:**

- `projectId` (optional): Filter by project ID
- `limit` (optional): Limit results (default 50)

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "deployment-uuid",
      "projectName": "my-app",
      "status": "ready",
      "subdomain": "myapp",
      "fullDomain": "myapp.vinguler.com",
      "startedAt": "2024-01-15T10:30:00Z",
      "completedAt": "2024-01-15T10:35:00Z"
    }
  ]
}
```

### Utility Endpoints

#### `GET /api/subdomain/check/:subdomain`

Checks if a subdomain is available.

**Response:**

```json
{
  "success": true,
  "data": {
    "subdomain": "myapp",
    "available": true,
    "fullDomain": "myapp.vinguler.com"
  }
}
```

#### `GET /api/vercel/connection`

Tests Vercel API connection.

**Response:**

```json
{
  "success": true,
  "data": {
    "connected": true,
    "teamId": "team_xxx",
    "domain": "vinguler.com"
  }
}
```

---

## Service Layer Design

### Scanner Service

**File:** `src/services/scanner.ts`

**Purpose:** Discover projects in the working directory

**Methods:**

```typescript
class ScannerService {
  async scanDirectory(path: string): Promise<ProjectInfo[]> {
    // 1. Read directory
    // 2. Look for package.json files
    // 3. Parse package.json for each project
    // 4. Extract basic metadata
    // 5. Return array of ProjectInfo
  }

  private hasPackageJson(path: string): boolean {
    // Check if package.json exists
  }

  private parsePackageJson(path: string): Partial<ProjectInfo> {
    // Parse package.json and extract:
    // - name, scripts, dependencies, devDependencies
  }
}
```

**Implementation Notes:**

- Use Node.js `fs` module for file system operations
- Handle errors gracefully (skip invalid projects)
- Support both single projects and monorepo structures

---

### Analyzer Service

**File:** `src/services/analyzer.ts`

**Purpose:** Classify projects and detect database usage

**Methods:**

```typescript
class AnalyzerService {
  analyze(projectInfo: Partial<ProjectInfo>): ProjectInfo {
    // 1. Detect project type (frontend/backend/fullstack)
    // 2. Identify framework
    // 3. Detect build tool
    // 4. Check for database dependencies
    // 5. Extract environment variables from code
    // 6. Return enriched ProjectInfo
  }

  private detectProjectType(deps: Record<string, string>): ProjectType {
    // Check dependencies for frontend/backend indicators
  }

  private detectFramework(deps: Record<string, string>): Framework | undefined {
    // Identify framework: vue, react, next, express, etc.
  }

  private detectBuildTool(
    deps: Record<string, string>,
    scripts: Record<string, string>
  ): BuildTool | undefined {
    // Identify build tool: vite, webpack, next, etc.
  }

  private detectDatabase(deps: Record<string, string>): {
    hasDatabase: boolean;
    databaseType?: DatabaseType;
  } {
    // Check for database-related packages:
    // - pg, pg-promise -> postgres
    // - mysql2, mysql -> mysql
    // - mongodb, mongoose -> mongodb
    // - @prisma/client, prisma -> prisma
    // - better-sqlite3 -> sqlite
  }

  private extractEnvVars(projectPath: string): string[] {
    // Heuristic: scan for process.env.VAR_NAME
    // Look in common files: .env.example, config files
  }
}
```

**Classification Rules:**

| Dependency                  | Type      | Framework | Database |
| --------------------------- | --------- | --------- | -------- |
| `vue`, `@vitejs/plugin-vue` | frontend  | vue       | -        |
| `react`, `react-dom`        | frontend  | react     | -        |
| `next`                      | fullstack | next      | -        |
| `express`                   | backend   | express   | -        |
| `@nestjs/core`              | backend   | nest      | -        |
| `pg`, `pg-promise`          | -         | -         | postgres |
| `mysql2`                    | -         | -         | mysql    |
| `mongodb`, `mongoose`       | -         | -         | mongodb  |
| `@prisma/client`            | -         | -         | prisma   |

---

### Vercel Service

**File:** `src/services/vercel.ts`

**Purpose:** Handle all Vercel API interactions

**Methods:**

```typescript
class VercelService {
  private token: string;
  private teamId: string;
  private domain: string;

  constructor(token: string, teamId: string, domain: string) {
    this.token = token;
    this.teamId = teamId;
    this.domain = domain;
  }

  // Project Management
  async createProject(name: string, framework?: string): Promise<VercelProject> {
    // POST /v9/projects
    // Creates a new Vercel project
  }

  async getProject(nameOrId: string): Promise<VercelProject | null> {
    // GET /v9/projects/:id
    // Retrieves project by name or ID
  }

  // Deployment
  async deploy(config: {
    projectName: string;
    projectPath: string;
    envVars?: Record<string, string>;
    buildCommand?: string;
    outputDirectory?: string;
  }): Promise<VercelDeployment> {
    // Creates deployment using Vercel CLI or API
    // 1. Create project if doesn't exist
    // 2. Set environment variables
    // 3. Trigger deployment
    // 4. Return deployment info
  }

  async getDeploymentStatus(deploymentId: string): Promise<VercelDeployment> {
    // GET /v13/deployments/:id
    // Retrieves deployment status
  }

  async getDeploymentLogs(deploymentId: string): Promise<string[]> {
    // GET /v2/deployments/:id/events
    // Retrieves deployment logs
  }

  // Domain Management
  async addDomain(projectId: string, domain: string): Promise<VercelDomain> {
    // POST /v9/projects/:id/domains
    // Adds custom domain to project
  }

  async verifyDomain(projectId: string, domain: string): Promise<boolean> {
    // POST /v9/projects/:id/domains/:domain/verify
    // Verifies domain configuration
  }

  // Environment Variables
  async setEnvVar(
    projectId: string,
    key: string,
    value: string,
    type: 'encrypted' | 'plain' = 'encrypted'
  ): Promise<void> {
    // POST /v10/projects/:id/env
    // Sets environment variable (as secret if encrypted)
  }

  async setEnvVars(projectId: string, vars: Record<string, string>): Promise<void> {
    // Batch set environment variables
    // DATABASE_URL should be encrypted
  }

  // Utility
  async testConnection(): Promise<boolean> {
    // GET /v2/user
    // Tests API connection
  }
}
```

**Vercel API Integration:**

- Base URL: `https://api.vercel.com`
- Authentication: `Authorization: Bearer {token}`
- Team scope: `?teamId={teamId}` query parameter

**Key API Endpoints:**

| Endpoint                     | Method | Purpose                  |
| ---------------------------- | ------ | ------------------------ |
| `/v9/projects`               | POST   | Create project           |
| `/v9/projects/:id`           | GET    | Get project              |
| `/v13/deployments`           | POST   | Create deployment        |
| `/v13/deployments/:id`       | GET    | Get deployment status    |
| `/v2/deployments/:id/events` | GET    | Get deployment logs      |
| `/v9/projects/:id/domains`   | POST   | Add custom domain        |
| `/v10/projects/:id/env`      | POST   | Set environment variable |

---

### Executor Service

**File:** `src/services/executor.ts`

**Purpose:** Orchestrate deployment workflow

**Methods:**

```typescript
class ExecutorService {
  constructor(
    private vercelService: VercelService,
    private dataService: DataService
  ) {}

  async deploy(config: DeploymentConfig): Promise<DeploymentRecord> {
    // 1. Create deployment record (status: queued)
    const record = await this.createDeploymentRecord(config);

    // 2. Start async deployment
    this.executeDeployment(record.id, config).catch((err) => {
      this.handleDeploymentError(record.id, err);
    });

    // 3. Return record immediately
    return record;
  }

  private async executeDeployment(deploymentId: string, config: DeploymentConfig): Promise<void> {
    try {
      // Update status: building
      await this.updateStatus(deploymentId, 'building', ['Starting deployment...']);

      // Step 1: Create or get Vercel project
      const project = await this.getOrCreateProject(config);
      await this.addLog(deploymentId, `Vercel project: ${project.name}`);

      // Step 2: Set environment variables
      if (config.envVars) {
        await this.setEnvironmentVariables(project.id, config.envVars);
        await this.addLog(deploymentId, 'Environment variables configured');
      }

      // Step 3: Set DATABASE_URL if provided
      if (config.databaseUrl) {
        await this.vercelService.setEnvVar(
          project.id,
          'DATABASE_URL',
          config.databaseUrl,
          'encrypted'
        );
        await this.addLog(deploymentId, 'Database connection string configured (encrypted)');
      }

      // Step 4: Deploy to Vercel
      const deployment = await this.vercelService.deploy({
        projectName: config.projectName,
        projectPath: config.projectPath,
        envVars: config.envVars,
        buildCommand: config.buildCommand,
        outputDirectory: config.outputDirectory,
      });
      await this.addLog(deploymentId, `Deployment started: ${deployment.id}`);

      // Step 5: Poll deployment status
      await this.pollDeploymentStatus(deploymentId, deployment.id);

      // Step 6: Configure custom domain
      const fullDomain = `${config.subdomain}.${process.env.VERCEL_DOMAIN}`;
      await this.vercelService.addDomain(project.id, fullDomain);
      await this.addLog(deploymentId, `Custom domain configured: ${fullDomain}`);

      // Step 7: Verify domain
      const verified = await this.vercelService.verifyDomain(project.id, fullDomain);
      if (verified) {
        await this.addLog(deploymentId, 'Domain verified successfully');
      }

      // Step 8: Update deployment record (status: ready)
      await this.updateStatus(deploymentId, 'ready', ['Deployment complete!']);
      await this.markComplete(deploymentId, {
        vercelDeploymentId: deployment.id,
        vercelDeploymentUrl: `https://${deployment.url}`,
        customDomainConfigured: verified,
        fullDomain,
      });
    } catch (error) {
      throw error;
    }
  }

  private async pollDeploymentStatus(
    deploymentId: string,
    vercelDeploymentId: string
  ): Promise<void> {
    // Poll every 3 seconds until deployment is ready or error
    const maxAttempts = 200; // 10 minutes max
    let attempts = 0;

    while (attempts < maxAttempts) {
      const deployment = await this.vercelService.getDeploymentStatus(vercelDeploymentId);

      if (deployment.readyState === 'READY') {
        await this.addLog(deploymentId, 'Deployment ready!');
        return;
      } else if (deployment.readyState === 'ERROR') {
        throw new Error('Deployment failed on Vercel');
      } else if (deployment.readyState === 'CANCELED') {
        throw new Error('Deployment was canceled');
      }

      // Still building, wait and retry
      await new Promise((resolve) => setTimeout(resolve, 3000));
      attempts++;
    }

    throw new Error('Deployment timeout');
  }

  private async handleDeploymentError(deploymentId: string, error: Error): Promise<void> {
    await this.updateStatus(deploymentId, 'error', [`Error: ${error.message}`]);
    await this.markComplete(deploymentId, { error: error.message });
  }

  async getDeploymentStatus(deploymentId: string): Promise<DeploymentRecord | null> {
    return this.dataService.getDeployment(deploymentId);
  }
}
```

---

### Data Service

**File:** `src/services/data.ts`

**Purpose:** Persist and retrieve data

**Methods:**

```typescript
class DataService {
  private projectsFile = path.join(__dirname, '../../data/projects.json');
  private deploymentsFile = path.join(__dirname, '../../data/deployments.json');

  // Projects
  async getAllProjects(): Promise<SavedProject[]> {
    // Read projects.json
  }

  async saveProject(project: ProjectInfo): Promise<SavedProject> {
    // Add UUID, timestamps, save to projects.json
  }

  async getProject(id: string): Promise<SavedProject | null> {
    // Find project by ID
  }

  async updateProject(id: string, updates: Partial<SavedProject>): Promise<void> {
    // Update project fields
  }

  async incrementDeploymentCount(projectId: string): Promise<void> {
    // Increment deploymentCount, update lastDeployedAt
  }

  // Deployments
  async getAllDeployments(): Promise<DeploymentRecord[]> {
    // Read deployments.json, sort by startedAt desc
  }

  async getDeploymentsByProject(projectId: string): Promise<DeploymentRecord[]> {
    // Filter deployments by projectId
  }

  async getDeployment(id: string): Promise<DeploymentRecord | null> {
    // Find deployment by ID
  }

  async saveDeployment(deployment: DeploymentRecord): Promise<void> {
    // Add to deployments.json
  }

  async updateDeployment(id: string, updates: Partial<DeploymentRecord>): Promise<void> {
    // Update deployment fields
  }

  async getLatestDeployment(projectId: string): Promise<DeploymentRecord | null> {
    // Get most recent deployment for project
  }

  // Utility
  private readJSON<T>(file: string): Promise<T> {
    // Read and parse JSON file
  }

  private writeJSON<T>(file: string, data: T): Promise<void> {
    // Write JSON file atomically
  }
}
```

---

## UI Design & Appearance

### Visual Style

**Futuristic Dark Theme** with glowing accents and smooth animations

**Design Language:**

- Dark, high-contrast interface with subtle gradients
- Glowing borders and hover effects
- Soft shadows with colored glows
- Smooth transitions and micro-interactions
- Terminal-inspired typography with modern touches

### Color Palette

```css
/* Primary Colors */
--bg-primary: #0a0e1a; /* Deep space blue - main background */
--bg-secondary: #111827; /* Slightly lighter - cards, panels */
--bg-tertiary: #1a1f35; /* Elevated surfaces */

/* Accent Colors */
--accent-blue: #3b82f6; /* Electric blue - primary actions */
--accent-blue-glow: #60a5fa; /* Lighter blue - glow effect */
--accent-green: #10b981; /* Neon green - success states */
--accent-green-glow: #34d399; /* Lighter green - glow effect */
--accent-purple: #8b5cf6; /* Deep purple - secondary actions */
--accent-purple-glow: #a78bfa; /* Lighter purple - glow effect */
--accent-yellow: #fbbf24; /* Bright yellow - warnings, highlights */
--accent-yellow-glow: #fcd34d; /* Lighter yellow - glow effect */

/* Status Colors */
--status-success: #10b981; /* Green - deployment success */
--status-error: #ef4444; /* Red - deployment error */
--status-warning: #fbbf24; /* Yellow - warnings */
--status-building: #3b82f6; /* Blue - in progress */
--status-queued: #8b5cf6; /* Purple - queued */

/* Text Colors */
--text-primary: #f9fafb; /* Almost white - primary text */
--text-secondary: #9ca3af; /* Gray - secondary text */
--text-tertiary: #6b7280; /* Darker gray - muted text */

/* Border & Glow */
--border-default: rgba(59, 130, 246, 0.2); /* Subtle blue border */
--border-hover: rgba(59, 130, 246, 0.5); /* Brighter on hover */
--glow-blue: 0 0 20px rgba(59, 130, 246, 0.5);
--glow-green: 0 0 20px rgba(16, 185, 129, 0.5);
--glow-purple: 0 0 20px rgba(139, 92, 246, 0.5);
--glow-yellow: 0 0 20px rgba(251, 191, 36, 0.5);
```

### Component Styles

#### Cards & Panels

- Dark background (`--bg-secondary`) with subtle gradient
- Glowing border on hover (blue glow)
- Rounded corners (8-12px)
- Box shadow with colored glow effect

#### Buttons

- **Primary**: Blue gradient with blue glow on hover
- **Success**: Green gradient with green glow on hover
- **Secondary**: Purple gradient with purple glow on hover
- **Warning**: Yellow/orange gradient with yellow glow
- Smooth scale transform on hover (1.02x)
- Ripple effect on click

#### Input Fields

- Dark background (`--bg-tertiary`)
- Subtle border that glows on focus
- Placeholder text in `--text-tertiary`
- Auto-complete with glowing suggestions

#### Status Indicators

- **Queued**: Purple glow with pulsing animation
- **Building**: Blue glow with progress bar
- **Success**: Green glow with checkmark icon
- **Error**: Red glow with error icon

#### Deployment Logs

- Terminal-style monospace font
- Dark background with subtle scan-line effect
- Color-coded log levels:
  - Info: Blue
  - Success: Green
  - Warning: Yellow
  - Error: Red
- Auto-scroll with smooth animation

#### Navigation

- Side panel with dark background
- Active route with colored left border and glow
- Icons with matching accent colors
- Smooth slide-in animations

### Typography

```css
--font-heading: 'Inter', 'SF Pro Display', -apple-system, sans-serif;
--font-body: 'Inter', -apple-system, system-ui, sans-serif;
--font-mono: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
```

### Animations & Effects

**Glow Animations:**

- Pulsing glow for loading states
- Border glow on hover (smooth transition)
- Button glow on focus/hover

**Transitions:**

- Card hover: lift effect with shadow increase
- Button press: slight scale down
- Page transitions: fade + slide

**Micro-interactions:**

- Success checkmark animation (draw-in effect)
- Progress bars with gradient sweep
- Ripple effect on clicks
- Smooth number count-ups for stats

### Layout

**Dashboard:**

- Grid of project cards (2-3 columns)
- Each card has glowing border matching project status
- Hover reveals "Deploy" button with glow effect

**Deployment Form:**

- Single-column centered form
- Sections with glowing dividers
- Input fields with focus glow
- Submit button with prominent glow

**Deployment Status:**

- Full-width terminal-style log viewer
- Status indicator with pulsing glow
- Progress bar with gradient fill
- Floating action buttons with glow

**History:**

- Dark table with alternating row backgrounds
- Status badges with matching glow colors
- Expandable rows for detailed logs
- Filter pills with glow on active state

### Example CSS Snippet

```css
.deployment-card {
  background: linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-tertiary) 100%);
  border: 1px solid var(--border-default);
  border-radius: 12px;
  padding: 24px;
  transition: all 0.3s ease;
}

.deployment-card:hover {
  border-color: var(--accent-blue);
  box-shadow: var(--glow-blue);
  transform: translateY(-2px);
}

.deploy-button {
  background: linear-gradient(135deg, var(--accent-blue) 0%, var(--accent-purple) 100%);
  color: var(--text-primary);
  border: none;
  padding: 12px 32px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.deploy-button:hover {
  box-shadow: var(--glow-blue);
  transform: scale(1.02);
}

.status-building {
  color: var(--accent-blue);
  text-shadow: var(--glow-blue);
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
}

.log-line {
  font-family: var(--font-mono);
  font-size: 13px;
  line-height: 1.6;
  color: var(--text-secondary);
  padding: 4px 12px;
  border-left: 2px solid transparent;
  transition: all 0.2s ease;
}

.log-line.success {
  color: var(--accent-green);
  border-left-color: var(--accent-green);
}

.log-line.error {
  color: var(--status-error);
  border-left-color: var(--status-error);
}
```

---

## Implementation Plan

### Phase 1: Core Services (Backend)

**Goal:** Build all backend services and API endpoints

**Tasks:**

1. **Setup Project Structure** ✅ (Already done)
   - TypeScript configuration
   - Express server
   - Environment variables

2. **Implement Scanner Service**
   - [app/src/services/scanner.ts](../../deployer/app/src/services/scanner.ts)
   - `scanDirectory()` method
   - `parsePackageJson()` helper
   - Unit tests

3. **Implement Analyzer Service**
   - [app/src/services/analyzer.ts](../../deployer/app/src/services/analyzer.ts)
   - `analyze()` method
   - `detectProjectType()`, `detectFramework()`, `detectBuildTool()` helpers
   - `detectDatabase()` - Key feature for DB detection
   - Classification rules
   - Unit tests

4. **Implement Vercel Service**
   - [app/src/services/vercel.ts](../../deployer/app/src/services/vercel.ts)
   - Vercel API client setup
   - `createProject()`, `getProject()` methods
   - `deploy()` - Core deployment logic
   - `getDeploymentStatus()`, `getDeploymentLogs()`
   - `addDomain()`, `verifyDomain()` - Custom domain management
   - `setEnvVar()`, `setEnvVars()` - Environment variables
   - `testConnection()` - Health check
   - Integration tests with real Vercel API

5. **Implement Executor Service**
   - [app/src/services/executor.ts](../../deployer/app/src/services/executor.ts)
   - `deploy()` method - Orchestrates full workflow
   - `executeDeployment()` - Async deployment execution
   - `pollDeploymentStatus()` - Polling logic
   - `handleDeploymentError()` - Error handling
   - Integration tests

6. **Implement Data Service**
   - [app/src/services/data.ts](../../deployer/app/src/services/data.ts)
   - JSON file persistence (reads/writes to `app/data/` directory)
   - CRUD operations for projects and deployments
   - Atomic writes to prevent corruption
   - Unit tests

7. **Implement API Routes**
   - [app/src/server/routes.ts](../../deployer/app/src/server/routes.ts)
   - All endpoints from API design
   - Input validation
   - Error handling middleware
   - Integration tests

---

### Phase 2: Frontend UI

**Goal:** Build web interface for deployment workflow

**Tasks:**

1. **Dashboard Page**
   - List all projects with cards
   - Show deployment stats per project
   - "Scan Projects" button
   - "Deploy" action per project

2. **Deploy Form**
   - Subdomain input with validation
   - Environment variables form
   - Database URL input (conditional on `hasDatabase`)
   - Build configuration (optional)
   - "Deploy" button

3. **Deployment Status View**
   - Real-time status updates
   - Live logs streaming
   - Progress indicator
   - Success/error states
   - Deployment URL display

4. **Deployment History**
   - Table of all deployments
   - Filter by project
   - View logs for past deployments

---

### Phase 3: Polish & Testing

**Goal:** Production-ready deployment tool

**Tasks:**

1. **Error Handling**
   - Comprehensive error messages
   - Retry logic for network failures
   - Graceful degradation

2. **Validation**
   - Subdomain validation (DNS-safe characters)
   - Environment variable validation
   - Database URL validation

3. **Testing**
   - Unit tests for all services
   - Integration tests for API
   - E2E tests for deployment workflow

4. **Documentation**
   - README with setup instructions
   - API documentation
   - Troubleshooting guide

---

## Security Considerations

### Token Management

- `VERCEL_TOKEN` stored in `.env` (gitignored)
- Never sent to frontend
- Validated on server startup

### Database Connection Strings

- Always stored as encrypted Vercel secrets
- Never logged in plain text
- Only key names stored in deployment records

### Domain Verification

- Verify custom domain ownership before configuration
- Prevent subdomain takeover attacks
- Validate DNS records

---

## Performance Considerations

### Deployment Speed

- Asynchronous execution (non-blocking API)
- Parallel API calls where possible
- Efficient polling (3-second intervals)

### Data Persistence

- Lightweight JSON files
- Read on-demand
- Atomic writes with temp files

---

## Error Handling

### Vercel API Errors

- Rate limiting: Implement backoff
- Network errors: Retry with exponential backoff
- Authentication errors: Clear error message

### Deployment Failures

- Save detailed error logs
- Mark deployment as `error` status
- Preserve all state for debugging

### Domain Configuration Errors

- DNS propagation delays: Patient retry
- Invalid subdomain: Validate before deploy
- Domain already in use: Clear error message

---

## Future Enhancements

### Phase 4: Advanced Features

- [ ] **Deployment Rollback** - Revert to previous deployment
- [ ] **Environment Variable Templates** - Save common env var sets
- [ ] **Multi-project Deployments** - Deploy multiple projects at once
- [ ] **Deployment Scheduling** - Schedule deployments for later
- [ ] **Webhook Integration** - Auto-deploy on git push

### Phase 5: Monitoring & Analytics

- [ ] **Health Checks** - Ping deployed apps for uptime
- [ ] **Performance Metrics** - Track deployment times
- [ ] **Cost Tracking** - Monitor Vercel usage and costs
- [ ] **Deployment Analytics** - Success rates, trends

### Phase 6: Developer Experience

- [ ] **CLI Interface** - Command-line alternative to web UI
- [ ] **Notifications** - Slack/Discord deployment notifications
- [ ] **Preview Deployments** - Staging environments
- [ ] **Git Integration** - Auto-detect branch, commit info

---

## File Structure

```
deployer/
├── README.md                    # Project documentation and setup instructions
│
└── app/
    ├── package.json             # Node.js dependencies and scripts
    ├── tsconfig.json            # TypeScript configuration
    ├── .env                     # Environment variables (gitignored)
    ├── .env.example             # Environment template
    ├── .gitignore               # Git ignore rules
    │
    ├── src/                     # Application source code
    │   ├── server/              # Backend server
    │   │   ├── index.ts         # Express server entry point
    │   │   └── routes.ts        # API route definitions
    │   │
    │   ├── client/              # Frontend application
    │   │   ├── index.html       # Main HTML page
    │   │   ├── app.ts           # Frontend TypeScript logic
    │   │   └── styles.css       # CSS styles (futuristic dark theme)
    │   │
    │   ├── services/            # Business logic services
    │   │   ├── scanner.ts       # Project scanner service
    │   │   ├── analyzer.ts      # Project analyzer service
    │   │   ├── vercel.ts        # Vercel API client service
    │   │   ├── executor.ts      # Deployment orchestrator service
    │   │   └── data.ts          # Data persistence service (JSON)
    │   │
    │   ├── types/               # TypeScript type definitions
    │   │   └── index.ts         # Shared type definitions
    │   │
    │   └── utils/               # Utility functions
    │       ├── logger.ts        # Logging utility
    │       └── validator.ts     # Input validation utility
    │
    ├── data/                    # Runtime data storage (not built)
    │   ├── .gitkeep             # Keep directory in git
    │   ├── projects.json        # Persisted project records
    │   └── deployments.json     # Deployment history records
    │
    ├── dist/                    # Compiled JavaScript output (gitignored)
    │
    └── node_modules/            # NPM dependencies (gitignored)
```

**Key Directories:**

- **`src/server/`** - Express.js backend with API routes
- **`src/client/`** - Frontend UI with futuristic dark theme
- **`src/services/`** - Core business logic (scanner, analyzer, vercel, executor, data)
- **`src/types/`** - Shared TypeScript interfaces and types
- **`src/utils/`** - Helper functions and utilities
- **`data/`** - JSON files for runtime data (next to src, not inside)
  - Lives alongside `src/` to keep runtime data separate from source code
  - Not included in TypeScript compilation
  - Changes during application runtime

**Configuration Files:**

- **`package.json`** - Scripts: `dev`, `build`, `start`, `test`
- **`tsconfig.json`** - Compiles `src/` to `dist/`, excludes `data/` and `node_modules/`
- **`.env`** - Contains `VERCEL_TOKEN`, `VERCEL_TEAM_ID`, `VERCEL_DOMAIN`, `PORT`
- **`.env.example`** - Template for environment variables

---

## Next Steps

1. **Remove old vendor adapters** - Delete Railway, Netlify, Render services
2. **Implement Vercel Service** - Core Vercel API integration
3. **Update Analyzer** - Focus on database detection
4. **Test Vercel API** - Ensure token works, test all endpoints
5. **Implement deployment workflow** - End-to-end deployment with subdomain
6. **Build frontend UI** - Simple, focused deployment interface

---

**Status:** Ready for implementation
**Priority:** High
**Estimated Effort:** 2-3 days for backend, 1-2 days for frontend
