# Vercel Deployer

A futuristic dark-themed web application for deploying projects to Vercel with custom subdomain configuration on **vinguler.com**.

## Features

- 🔍 **Project Scanning** - Automatically detect Node.js projects in a directory
- 📊 **Project Analysis** - Detect project type, framework, build tools, and database usage
- 🗄️ **Database Detection** - Automatically identifies Prisma, PostgreSQL, MySQL, MongoDB, and SQLite
- 🚀 **One-Click Deployment** - Deploy to Vercel with custom subdomain (\*.vinguler.com)
- 🔐 **Encrypted Secrets** - Store database connection strings as encrypted Vercel secrets
- ⚙️ **Environment Variables** - Configure environment variables for your deployments
- 📈 **Deployment Tracking** - Real-time deployment status and logs
- 📜 **Deployment History** - View all past deployments
- 🎨 **Futuristic UI** - Dark theme with glowing accents and smooth animations

## Tech Stack

**Backend:**

- TypeScript
- Express.js
- Vercel API
- JSON file persistence

**Frontend:**

- Plain HTML/CSS/TypeScript
- Futuristic dark theme
- Responsive design

## Prerequisites

- Node.js (v18 or higher)
- Vercel account
- Vercel API token
- Custom domain configured in Vercel (vinguler.com)

## Setup

1. **Install dependencies:**

   ```bash
   cd deployer/app
   npm install
   ```

2. **Configure environment variables:**

   Create a `.env` file in `deployer/app/`:

   ```env
   PORT=3000
   VERCEL_TOKEN=your_vercel_token_here
   VERCEL_TEAM_ID=your_team_id_here
   VERCEL_DOMAIN=vinguler.com
   ```

3. **Build the project:**

   ```bash
   npm run build
   ```

4. **Start the server:**

   ```bash
   npm start
   ```

   The deployer will be available at [http://localhost:3000](http://localhost:3000)

## Usage

### 1. Scan for Projects

- Click "Scan Directory" button
- Enter the path to your projects directory
- The scanner will detect all Node.js projects and analyze them

### 2. Deploy a Project

- Go to the "Deploy" tab
- Select a project from the dropdown
- Configure your deployment:
  - **Subdomain**: Choose a subdomain (e.g., `my-app` → `my-app.vinguler.com`)
  - **Build Configuration**: Optional build command and output directory
  - **Environment Variables**: Add any environment variables your project needs
  - **Database**: If a database is detected, optionally provide a connection string (stored encrypted)

- Click "Deploy to Vercel"
- Watch real-time deployment progress and logs

### 3. View Deployment History

- Go to the "History" tab to see all past deployments
- View deployment status, domains, and timestamps

## Project Structure

```
deployer/
├── README.md                    # This file
└── app/
    ├── package.json             # Node.js dependencies
    ├── tsconfig.json            # TypeScript configuration
    ├── .env                     # Environment variables (gitignored)
    ├── .env.example             # Environment template
    │
    ├── src/                     # Source code
    │   ├── server/              # Backend server
    │   │   ├── index.ts         # Express server entry point
    │   │   └── routes.ts        # API routes
    │   │
    │   ├── client/              # Frontend application
    │   │   ├── index.html       # Main HTML page
    │   │   ├── app.ts           # Client-side TypeScript
    │   │   └── styles.css       # Futuristic dark theme CSS
    │   │
    │   ├── services/            # Business logic
    │   │   ├── scanner.ts       # Project scanner
    │   │   ├── analyzer.ts      # Project analyzer
    │   │   ├── vercel.ts        # Vercel API client
    │   │   ├── executor.ts      # Deployment orchestrator
    │   │   └── data.ts          # Data persistence (JSON)
    │   │
    │   ├── types/               # TypeScript types
    │   │   └── index.ts         # Shared type definitions
    │   │
    │   └── utils/               # Utilities
    │       ├── logger.ts        # Logging utility
    │       └── validator.ts     # Input validation
    │
    ├── data/                    # Runtime data storage
    │   ├── projects.json        # Project records
    │   └── deployments.json     # Deployment history
    │
    └── dist/                    # Compiled JavaScript (gitignored)
```

## API Endpoints

- `POST /api/scan` - Scan a directory for projects
- `GET /api/projects` - Get all scanned projects
- `GET /api/projects/:id` - Get a specific project
- `POST /api/deploy` - Deploy a project
- `GET /api/deployment/:id/status` - Get deployment status
- `GET /api/deployment/:id/logs` - Get deployment logs
- `GET /api/deployments` - Get all deployments
- `GET /api/subdomain/check/:subdomain` - Check subdomain availability
- `GET /api/vercel/connection` - Test Vercel API connection

## Development

**Development mode with auto-reload:**

```bash
npm run dev
```

**Type checking:**

```bash
npm run type-check
```

**Build:**

```bash
npm run build
```

## Features in Detail

### Project Analysis

The analyzer automatically detects:

- **Project Type**: frontend, backend, or fullstack
- **Framework**: Vue, React, Next.js, Nuxt, Express, Fastify, NestJS, etc.
- **Build Tool**: Vite, Webpack, esbuild, Rollup, tsc
- **Database**: Prisma, PostgreSQL, MySQL, MongoDB, SQLite
- **Environment Variables**: Scans source code for `process.env.*` references

### Deployment Workflow

1. **Scan** - Detects projects and analyzes them
2. **Configure** - User selects project and configures subdomain, env vars, etc.
3. **Deploy** - Creates/updates Vercel project
4. **Environment Setup** - Sets environment variables (DATABASE_URL encrypted)
5. **Domain Configuration** - Adds custom subdomain (\*.vinguler.com)
6. **Verification** - Verifies domain configuration
7. **Complete** - Deployment is ready and accessible

### Security

- Database connection strings are stored as **encrypted** Vercel secrets
- API token is stored in `.env` file (gitignored)
- Input validation on all user inputs
- Subdomain validation to prevent invalid domains

## Futuristic UI Theme

The UI features a **dark futuristic theme** with:

- Deep space blue backgrounds (#0a0e1a)
- Electric blue, neon green, deep purple, and yellow accents
- Glowing borders and hover effects
- Smooth animations and transitions
- Terminal-inspired monospace fonts for logs
- Pulsing animations for loading states
- Gradient buttons with glow effects

## Troubleshooting

**Server won't start:**

- Check that `.env` file exists with correct values
- Ensure port 3000 is not in use

**Vercel connection failed:**

- Verify your Vercel token is valid
- Check team ID and domain are correct

**Deployment fails:**

- Check deployment logs for specific errors
- Verify your project has valid `package.json`
- Ensure build command and output directory are correct

## License

MIT

## Author

Built with ❤️ for vinguler.com deployments
