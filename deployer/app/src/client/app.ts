// Client-side TypeScript for Vercel Deployer

// Types
interface Project {
  id: string;
  name: string;
  path: string;
  type: 'frontend' | 'backend' | 'fullstack';
  framework?: string;
  hasDatabase: boolean;
  databaseType?: string;
  detectedEnvVars: string[];
}

interface Deployment {
  id: string;
  projectId: string;
  projectName: string;
  status: 'queued' | 'building' | 'ready' | 'error';
  subdomain: string;
  fullDomain: string;
  startedAt: string;
  completedAt?: string;
  logs: string[];
}

// State
let projects: Project[] = [];
let currentDeployment: Deployment | null = null;
let pollInterval: number | null = null;

// API Helper
async function api(endpoint: string, options: RequestInit = {}): Promise<any> {
  const response = await fetch(endpoint, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error || 'Request failed');
  }

  return data.data;
}

// Initialize app
async function init() {
  setupEventListeners();
  await checkVercelConnection();
  await loadProjects();
  await loadDeploymentHistory();
  // Automatically scan packages on load
  await scanProjects();
}

// Setup event listeners
function setupEventListeners() {
  // Tab navigation
  const navTabs = document.querySelectorAll('.nav-tab');
  navTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const tabName = tab.getAttribute('data-tab');
      if (tabName) switchTab(tabName);
    });
  });

  // Scan button
  document.getElementById('scan-btn')?.addEventListener('click', scanProjects);

  // Deploy form
  document.getElementById('project-select')?.addEventListener('change', handleProjectSelect);
  document.getElementById('subdomain-input')?.addEventListener('input', handleSubdomainInput);
  document.getElementById('add-env-var-btn')?.addEventListener('click', () => addEnvVarRow());
  document.getElementById('deploy-form')?.addEventListener('submit', handleDeploy);

  // History
  document.getElementById('refresh-history-btn')?.addEventListener('click', loadDeploymentHistory);
}

// Tab switching
function switchTab(tabName: string) {
  // Update nav tabs
  document.querySelectorAll('.nav-tab').forEach((tab) => {
    tab.classList.toggle('active', tab.getAttribute('data-tab') === tabName);
  });

  // Update tab content
  document.querySelectorAll('.tab-content').forEach((content) => {
    content.classList.toggle('active', content.id === `${tabName}-tab`);
  });
}

// Check Vercel connection
async function checkVercelConnection() {
  const statusIndicator = document.getElementById('vercel-status');
  const statusText = statusIndicator?.querySelector('.status-text');

  try {
    const data = await api('/api/vercel/connection');

    if (data.connected) {
      statusIndicator?.classList.add('connected');
      if (statusText) statusText.textContent = 'Connected to Vercel';
    } else {
      statusIndicator?.classList.add('disconnected');
      if (statusText) statusText.textContent = 'Disconnected';
    }
  } catch (error) {
    statusIndicator?.classList.add('disconnected');
    if (statusText) statusText.textContent = 'Connection failed';
    console.error('Vercel connection check failed:', error);
  }
}

// Scan projects (automatically scans /packages folder)
async function scanProjects() {
  try {
    console.log('Scanning packages...');

    // Backend defaults to scanning /packages folder
    const scannedProjects = await api('/api/scan', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    projects = scannedProjects;
    renderProjects();
    populateProjectSelect();

    console.log(`Found ${projects.length} project(s)`);
  } catch (error: any) {
    console.error('Scan failed:', error.message);
  }
}

// Load projects
async function loadProjects() {
  try {
    projects = await api('/api/projects');
    renderProjects();
    populateProjectSelect();
  } catch (error) {
    console.error('Failed to load projects:', error);
  }
}

// Render projects
function renderProjects() {
  const grid = document.getElementById('projects-grid');
  if (!grid) return;

  if (projects.length === 0) {
    grid.innerHTML = `
      <div class="placeholder">
        <div class="placeholder-icon">📂</div>
        <p>No projects yet. Click "Scan Packages" to detect projects.</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = projects
    .map(
      (project) => `
      <div class="project-card" data-project-id="${project.id}">
        <div class="project-header">
          <div>
            <div class="project-name">${project.name}</div>
            <span class="project-type type-${project.type}">${project.type}</span>
          </div>
        </div>
        <div class="project-info">
          <div class="project-info-row">
            <span>Framework:</span>
            <strong>${project.framework || 'None'}</strong>
          </div>
          ${
            project.hasDatabase
              ? `
          <div class="project-info-row">
            <span class="project-badge has-database">
              🗄️ Database: ${project.databaseType}
            </span>
          </div>
          `
              : ''
          }
          ${
            project.detectedEnvVars.length > 0
              ? `
          <div class="project-info-row">
            <span>Env Vars:</span>
            <strong>${project.detectedEnvVars.length} detected</strong>
          </div>
          `
              : ''
          }
        </div>
        <div class="project-actions">
          <button class="btn btn-primary btn-small" onclick="deployProject('${project.id}')">
            Deploy
          </button>
        </div>
      </div>
    `
    )
    .join('');
}

// Populate project select
function populateProjectSelect() {
  const select = document.getElementById('project-select') as HTMLSelectElement;
  if (!select) return;

  select.innerHTML = '<option value="">Choose a project...</option>';

  projects.forEach((project) => {
    const option = document.createElement('option');
    option.value = project.id;
    option.textContent = project.name;
    select.appendChild(option);
  });
}

// Deploy project (called from project card)
(window as any).deployProject = function (projectId: string) {
  const select = document.getElementById('project-select') as HTMLSelectElement;
  if (select) {
    select.value = projectId;
    handleProjectSelect();
  }

  // Switch to deploy tab
  switchTab('deploy');
};

// Handle project selection
function handleProjectSelect() {
  const select = document.getElementById('project-select') as HTMLSelectElement;
  const projectId = select?.value;

  if (!projectId) return;

  const project = projects.find((p) => p.id === projectId);
  if (!project) return;

  // Pre-fill subdomain
  const subdomainInput = document.getElementById('subdomain-input') as HTMLInputElement;
  if (subdomainInput) {
    subdomainInput.value = project.name.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    handleSubdomainInput();
  }

  // Show database section if project has database
  const databaseSection = document.getElementById('database-section');
  if (databaseSection) {
    databaseSection.style.display = project.hasDatabase ? 'block' : 'none';
  }

  // Pre-populate environment variables
  const envVarsContainer = document.getElementById('env-vars-container');
  if (envVarsContainer && project.detectedEnvVars.length > 0) {
    envVarsContainer.innerHTML = '';
    project.detectedEnvVars.forEach((varName) => {
      addEnvVarRow(varName);
    });
  }
}

// Handle subdomain input
let subdomainCheckTimeout: number | null = null;

async function handleSubdomainInput() {
  const input = document.getElementById('subdomain-input') as HTMLInputElement;
  const validation = document.getElementById('subdomain-validation');
  const subdomain = input?.value.trim().toLowerCase();

  if (!subdomain || !validation) return;

  // Clear previous timeout
  if (subdomainCheckTimeout) {
    clearTimeout(subdomainCheckTimeout);
  }

  // Validate format first
  if (!/^[a-z0-9-]+$/.test(subdomain)) {
    validation.textContent = 'Only lowercase letters, numbers, and hyphens allowed';
    validation.className = 'input-hint error';
    return;
  }

  validation.textContent = 'Checking availability...';
  validation.className = 'input-hint';

  // Debounce API call
  subdomainCheckTimeout = window.setTimeout(async () => {
    try {
      const data = await api(`/api/subdomain/check/${subdomain}`);

      if (data.available) {
        validation.textContent = `✓ ${data.fullDomain} is available`;
        validation.className = 'input-hint success';
      } else {
        validation.textContent = `✗ ${data.fullDomain} is already taken`;
        validation.className = 'input-hint error';
      }
    } catch (error: any) {
      validation.textContent = error.message;
      validation.className = 'input-hint error';
    }
  }, 500);
}

// Add environment variable row
function addEnvVarRow(varName: string = '') {
  const container = document.getElementById('env-vars-container');
  if (!container) return;

  // Remove hint if it exists
  const hint = container.querySelector('.env-hint');
  if (hint) hint.remove();

  const row = document.createElement('div');
  row.className = 'env-var-row';
  row.innerHTML = `
    <input type="text" placeholder="KEY" value="${varName}" />
    <input type="text" placeholder="value" />
    <button type="button" class="btn-remove" onclick="this.parentElement.remove()">✕</button>
  `;

  container.appendChild(row);
}

// Handle deployment
async function handleDeploy(e: Event) {
  e.preventDefault();

  const select = document.getElementById('project-select') as HTMLSelectElement;
  const projectId = select?.value;

  if (!projectId) {
    alert('Please select a project');
    return;
  }

  const project = projects.find((p) => p.id === projectId);
  if (!project) return;

  // Collect form data
  const subdomainInput = document.getElementById('subdomain-input') as HTMLInputElement;
  const buildCommandInput = document.getElementById('build-command-input') as HTMLInputElement;
  const outputDirInput = document.getElementById('output-dir-input') as HTMLInputElement;
  const databaseUrlInput = document.getElementById('database-url-input') as HTMLInputElement;

  const subdomain = subdomainInput?.value.trim();

  if (!subdomain) {
    alert('Please enter a subdomain');
    return;
  }

  // Collect environment variables
  const envVars: Record<string, string> = {};
  const envVarRows = document.querySelectorAll('#env-vars-container .env-var-row');
  envVarRows.forEach((row) => {
    const inputs = row.querySelectorAll('input');
    const key = (inputs[0] as HTMLInputElement).value.trim();
    const value = (inputs[1] as HTMLInputElement).value.trim();
    if (key && value) {
      envVars[key] = value;
    }
  });

  // Build deployment config
  const deploymentConfig = {
    projectId: project.id,
    projectName: project.name,
    projectPath: project.path,
    subdomain,
    envVars,
    buildCommand: buildCommandInput?.value.trim() || undefined,
    outputDirectory: outputDirInput?.value.trim() || undefined,
    databaseUrl: databaseUrlInput?.value.trim() || undefined,
  };

  try {
    // Start deployment
    const deployment = await api('/api/deploy', {
      method: 'POST',
      body: JSON.stringify(deploymentConfig),
    });

    currentDeployment = deployment;

    // Show deployment status
    showDeploymentStatus();

    // Start polling for status
    startStatusPolling(deployment.id);
  } catch (error: any) {
    alert(`Deployment failed: ${error.message}`);
  }
}

// Show deployment status
function showDeploymentStatus() {
  const form = document.getElementById('deploy-form');
  const status = document.getElementById('deployment-status');

  if (form) form.style.display = 'none';
  if (status) status.style.display = 'block';

  updateDeploymentStatus();
}

// Update deployment status
function updateDeploymentStatus() {
  if (!currentDeployment) return;

  const statusBadge = document.querySelector('.status-badge');
  const statusText = document.getElementById('status-text');
  const statusIcon = document.querySelector('.status-icon');
  const logsContainer = document.getElementById('logs-container');
  const progressFill = document.querySelector('.progress-fill') as HTMLElement;

  // Update status badge
  if (statusBadge) {
    statusBadge.className = `status-badge ${currentDeployment.status}`;
  }

  // Update status text
  if (statusText) {
    const statusLabels: Record<string, string> = {
      queued: 'Queued',
      building: 'Building',
      ready: 'Ready',
      error: 'Error',
    };
    statusText.textContent = statusLabels[currentDeployment.status] || currentDeployment.status;
  }

  // Update status icon
  if (statusIcon) {
    const icons: Record<string, string> = {
      queued: '⏳',
      building: '⚙️',
      ready: '✅',
      error: '❌',
    };
    statusIcon.textContent = icons[currentDeployment.status] || '⏳';
  }

  // Update progress bar
  if (progressFill) {
    const progress: Record<string, number> = {
      queued: 10,
      building: 50,
      ready: 100,
      error: 100,
    };
    progressFill.style.width = `${progress[currentDeployment.status] || 0}%`;
  }

  // Update logs
  if (logsContainer) {
    logsContainer.innerHTML = currentDeployment.logs
      .map((log) => {
        let className = 'log-line';
        if (log.includes('Error') || log.includes('error')) {
          className += ' error';
        } else if (log.includes('success') || log.includes('complete')) {
          className += ' success';
        } else if (log.includes('warning') || log.includes('Warning')) {
          className += ' warning';
        }
        return `<div class="${className}">${log}</div>`;
      })
      .join('');

    // Auto-scroll to bottom
    logsContainer.scrollTop = logsContainer.scrollHeight;
  }

  // Show result if ready
  if (currentDeployment.status === 'ready') {
    const result = document.getElementById('deployment-result');
    const deploymentUrl = document.getElementById('deployment-url') as HTMLAnchorElement;

    if (result) result.style.display = 'block';
    if (deploymentUrl) {
      deploymentUrl.href = `https://${currentDeployment.fullDomain}`;
      deploymentUrl.textContent = currentDeployment.fullDomain;
    }

    // Stop polling
    stopStatusPolling();
  }

  // Stop polling on error
  if (currentDeployment.status === 'error') {
    stopStatusPolling();
  }
}

// Start status polling
function startStatusPolling(deploymentId: string) {
  if (pollInterval) {
    clearInterval(pollInterval);
  }

  pollInterval = window.setInterval(async () => {
    try {
      const deployment = await api(`/api/deployment/${deploymentId}/status`);
      currentDeployment = deployment;
      updateDeploymentStatus();
    } catch (error) {
      console.error('Failed to poll deployment status:', error);
    }
  }, 2000);
}

// Stop status polling
function stopStatusPolling() {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
}

// Load deployment history
async function loadDeploymentHistory() {
  try {
    const deployments = await api('/api/deployments');
    renderDeploymentHistory(deployments);
  } catch (error) {
    console.error('Failed to load deployment history:', error);
  }
}

// Render deployment history
function renderDeploymentHistory(deployments: Deployment[]) {
  const historyList = document.getElementById('history-list');
  if (!historyList) return;

  if (deployments.length === 0) {
    historyList.innerHTML = `
      <div class="placeholder">
        <div class="placeholder-icon">📜</div>
        <p>No deployments yet</p>
      </div>
    `;
    return;
  }

  historyList.innerHTML = deployments
    .map(
      (deployment) => `
      <div class="history-item">
        <div class="history-header">
          <div class="history-project-name">${deployment.projectName}</div>
          <div class="status-badge ${deployment.status}">
            ${deployment.status}
          </div>
        </div>
        <div class="history-info">
          <div class="history-info-item">
            <div class="info-label">Domain</div>
            <div class="info-value">
              <a href="https://${deployment.fullDomain}" target="_blank">${deployment.fullDomain}</a>
            </div>
          </div>
          <div class="history-info-item">
            <div class="info-label">Started</div>
            <div class="info-value">${new Date(deployment.startedAt).toLocaleString()}</div>
          </div>
          ${
            deployment.completedAt
              ? `
          <div class="history-info-item">
            <div class="info-label">Completed</div>
            <div class="info-value">${new Date(deployment.completedAt).toLocaleString()}</div>
          </div>
          `
              : ''
          }
        </div>
      </div>
    `
    )
    .join('');
}

// Initialize on load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
