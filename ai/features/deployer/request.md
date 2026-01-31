# Deployer Application Overview

## Purpose

The **Deployer** is a local web application for deploying projects to Vercel with custom subdomain configuration. It provides a focused interface to:

- Deploy projects to Vercel with custom subdomain (vinguler.com)
- Automatically detect database usage and configure connection strings
- Track deployment history and view deployment statistics
- Manage environment variables and secrets securely

This is **not an AI-powered deployment tool** — it's a deterministic, safe, and transparent deployment manager that runs locally and focuses specifically on Vercel deployments.

---

## Core Features

### 1. Project Management

- **Project selection and analysis**:
  - Detect project type: frontend, backend, or full-stack
  - Identify build tool: Vite, webpack, TypeScript, etc.
  - Detect framework: Vue, React, Express, Next.js, etc.
  - Scan for database dependencies (Prisma, pg, mysql2, mongodb, etc.)
  - Extract required environment variables

### 2. Vercel Deployment Configuration

- **Subdomain management**:
  - User specifies subdomain prefix
  - Automatic domain configuration: `{subdomain}.vinguler.com`
  - Validation and availability checking
- **Database detection**:
  - Automatic detection of database usage in project
  - Prompt for database connection string when detected
  - Secure storage as Vercel environment variable/secret

### 3. Deployment Execution

- **One-click Vercel deployments**
- **Real-time progress tracking** with status updates
- **Deployment logs** for debugging
- **Automatic environment variable injection**
- **Custom domain assignment** on successful deployment

### 4. Deployment Statistics & History

- **Per-project stats**:
  - Total deployment count
  - Last deployment timestamp
  - Current deployment status
  - Deployment URL with custom subdomain
- **Full deployment history**:
  - All historical deployments
  - Success/failure tracking
  - Deployment duration
  - Logs archive

---

## Technical Architecture

### Stack

- **Backend**: Express.js + TypeScript
- **Frontend**: HTML + TypeScript (minimal, no heavy framework)
- **Data Storage**: JSON files (local persistence)
- **Deployment**: Vercel API (authenticated with VERCEL_TOKEN)

### Key Services

1. **Scanner** - Detects projects in working directory or monorepo
2. **Analyzer** - Classifies projects and detects database usage
3. **Vercel Service** - Handles all Vercel API interactions
4. **Domain Service** - Manages subdomain configuration for vinguler.com
5. **Executor** - Executes deployments via Vercel API
6. **Data Service** - Persists projects and deployment records

### Security

- Vercel token stored in gitignored `.env` file
- Database connection strings stored as Vercel secrets (never logged)
- No plain-text secrets in deployment records
- Local-only operation (only communicates with Vercel API)

---

## User Workflow

1. **Select Project** - Choose project to deploy from file system
2. **Review Analysis** - View detected project type, framework, and database usage
3. **Configure Deployment**:
   - Enter subdomain (e.g., "myapp" → myapp.vinguler.com)
   - If database detected: enter DATABASE_URL connection string
   - Add any additional environment variables
4. **Deploy** - Execute deployment to Vercel with real-time feedback
5. **Monitor** - View deployment URL, stats, history, and status

---

## Design Principles

- **Deterministic**: Same input = same output, no magic
- **Safe**: Explicit confirmations, no destructive operations
- **Transparent**: Show all steps, logs, and configuration
- **Local-first**: Runs entirely on developer's machine
- **Vercel-focused**: Optimized specifically for Vercel deployments
- **Simple**: Minimal UI, focused functionality
- **Domain-aware**: Automatic subdomain configuration on vinguler.com
