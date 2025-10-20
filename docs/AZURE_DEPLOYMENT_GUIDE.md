# Azure Deployment Guide - Code Muse Board

## 📋 Table of Contents
1. [Project Overview](#project-overview)
2. [Azure Services Required](#azure-services-required)
3. [Prerequisites](#prerequisites)
4. [Method 1: Manual Deployment](#method-1-manual-deployment)
5. [Method 2: CI/CD with Azure DevOps](#method-2-cicd-with-azure-devops)
6. [Post-Deployment Configuration](#post-deployment-configuration)
7. [Monitoring and Maintenance](#monitoring-and-maintenance)
8. [Troubleshooting](#troubleshooting)
9. [Cost Optimization](#cost-optimization)

---

## Project Overview

**Code Muse Board** is a full-stack web application with:
- **Frontend**: React + TypeScript + Vite
- **Backend**: Node.js + Express
- **Database**: PostgreSQL (Prisma ORM)
- **Real-time**: Socket.io
- **AI Services**: Azure OpenAI
- **Storage**: localStorage (client-side)

---

## Azure Services Required

### Core Services (Required)

| Service | Purpose | Tier Recommendation |
|---------|---------|---------------------|
| **Azure App Service** | Host backend Node.js API | Basic B1 or Standard S1 |
| **Azure Static Web Apps** | Host frontend React app | Free or Standard |
| **Azure Database for PostgreSQL** | Database hosting | Basic or General Purpose |
| **Azure OpenAI Service** | AI chat and features | Pay-as-you-go |
| **Azure Key Vault** | Secure secrets management | Standard |
| **Azure Storage Account** | Static assets, backups | Standard LRS |

### CI/CD Services (For Method 2)

| Service | Purpose | Cost |
|---------|---------|------|
| **Azure DevOps** | CI/CD pipelines | Free tier available |
| **Azure Container Registry** | Docker images (optional) | Basic |

### Optional Services (Recommended)

| Service | Purpose | Tier |
|---------|---------|------|
| **Azure Application Insights** | Performance monitoring | Pay-as-you-go |
| **Azure CDN** | Content delivery | Standard |
| **Azure Front Door** | Global load balancing | Standard |
| **Azure DNS** | Custom domain management | Standard |

---

## Prerequisites

### Required Tools
- [ ] Azure Account (with active subscription)
- [ ] Azure CLI installed
- [ ] Node.js 18+ installed
- [ ] Git installed
- [ ] Visual Studio Code (recommended)

### Required Knowledge
- [ ] Basic Azure portal navigation
- [ ] Basic Git commands
- [ ] Understanding of environment variables
- [ ] Basic YAML (for CI/CD)

### Install Azure CLI
```bash
# Windows (PowerShell as Administrator)
Invoke-WebRequest -Uri https://aka.ms/installazurecliwindows -OutFile .\AzureCLI.msi
Start-Process msiexec.exe -Wait -ArgumentList '/I AzureCLI.msi /quiet'
rm .\AzureCLI.msi

# Verify installation
az --version

# Login to Azure
az login
```

---

## Method 1: Manual Deployment

### Step 1: Create Azure Resources

#### 1.1 Create Resource Group
```bash
# Set variables
$RESOURCE_GROUP="rg-codemuse-prod"
$LOCATION="eastus"

# Create resource group
az group create --name $RESOURCE_GROUP --location $LOCATION
```

#### 1.2 Create PostgreSQL Database
```bash
# Set variables
$DB_SERVER_NAME="codemuse-db-server"
$DB_ADMIN_USER="codemuse_admin"
$DB_ADMIN_PASSWORD="YourSecurePassword123!"
$DB_NAME="codemuse_db"

# Create PostgreSQL server
az postgres flexible-server create `
  --resource-group $RESOURCE_GROUP `
  --name $DB_SERVER_NAME `
  --location $LOCATION `
  --admin-user $DB_ADMIN_USER `
  --admin-password $DB_ADMIN_PASSWORD `
  --sku-name Standard_B1ms `
  --tier Burstable `
  --storage-size 32 `
  --version 14

# Create database
az postgres flexible-server db create `
  --resource-group $RESOURCE_GROUP `
  --server-name $DB_SERVER_NAME `
  --database-name $DB_NAME

# Configure firewall to allow Azure services
az postgres flexible-server firewall-rule create `
  --resource-group $RESOURCE_GROUP `
  --name $DB_SERVER_NAME `
  --rule-name AllowAzureServices `
  --start-ip-address 0.0.0.0 `
  --end-ip-address 0.0.0.0

# Get connection string
$DB_CONNECTION_STRING="postgresql://${DB_ADMIN_USER}:${DB_ADMIN_PASSWORD}@${DB_SERVER_NAME}.postgres.database.azure.com:5432/${DB_NAME}?sslmode=require"
Write-Host "Database Connection String: $DB_CONNECTION_STRING"
```

#### 1.3 Create Azure OpenAI Service
```bash
# Set variables
$OPENAI_NAME="codemuse-openai"

# Create Azure OpenAI service
az cognitiveservices account create `
  --name $OPENAI_NAME `
  --resource-group $RESOURCE_GROUP `
  --location eastus `
  --kind OpenAI `
  --sku S0 `
  --yes

# Deploy GPT-4o-mini model
az cognitiveservices account deployment create `
  --name $OPENAI_NAME `
  --resource-group $RESOURCE_GROUP `
  --deployment-name gpt-4o-mini `
  --model-name gpt-4o `
  --model-version "2024-08-01" `
  --model-format OpenAI `
  --sku-capacity 10 `
  --sku-name Standard

# Get API keys and endpoint
$OPENAI_KEY=$(az cognitiveservices account keys list --name $OPENAI_NAME --resource-group $RESOURCE_GROUP --query key1 -o tsv)
$OPENAI_ENDPOINT=$(az cognitiveservices account show --name $OPENAI_NAME --resource-group $RESOURCE_GROUP --query properties.endpoint -o tsv)

Write-Host "Azure OpenAI Endpoint: $OPENAI_ENDPOINT"
Write-Host "Azure OpenAI Key: $OPENAI_KEY"
```

#### 1.4 Create Key Vault
```bash
# Set variables
$KEYVAULT_NAME="codemuse-kv-$(Get-Random -Maximum 9999)"

# Create Key Vault
az keyvault create `
  --name $KEYVAULT_NAME `
  --resource-group $RESOURCE_GROUP `
  --location $LOCATION

# Store secrets
az keyvault secret set --vault-name $KEYVAULT_NAME --name "DatabaseConnectionString" --value $DB_CONNECTION_STRING
az keyvault secret set --vault-name $KEYVAULT_NAME --name "AzureOpenAIKey" --value $OPENAI_KEY
az keyvault secret set --vault-name $KEYVAULT_NAME --name "AzureOpenAIEndpoint" --value $OPENAI_ENDPOINT
```

### Step 2: Deploy Backend (App Service)

#### 2.1 Create App Service Plan
```bash
# Set variables
$APP_SERVICE_PLAN="codemuse-plan"
$BACKEND_APP_NAME="codemuse-api"

# Create App Service Plan
az appservice plan create `
  --name $APP_SERVICE_PLAN `
  --resource-group $RESOURCE_GROUP `
  --location $LOCATION `
  --sku B1 `
  --is-linux

# Create Web App for backend
az webapp create `
  --name $BACKEND_APP_NAME `
  --resource-group $RESOURCE_GROUP `
  --plan $APP_SERVICE_PLAN `
  --runtime "NODE:18-lts"
```

#### 2.2 Configure Backend Environment Variables
```bash
# Configure app settings
az webapp config appsettings set `
  --name $BACKEND_APP_NAME `
  --resource-group $RESOURCE_GROUP `
  --settings `
    DATABASE_URL=$DB_CONNECTION_STRING `
    AZURE_OPENAI_ENDPOINT=$OPENAI_ENDPOINT `
    AZURE_OPENAI_API_KEY=$OPENAI_KEY `
    AZURE_OPENAI_DEPLOYMENT="gpt-4o-mini" `
    NODE_ENV="production" `
    PORT=8080

# Enable WebSocket support for Socket.io
az webapp config set `
  --name $BACKEND_APP_NAME `
  --resource-group $RESOURCE_GROUP `
  --web-sockets-enabled true
```

#### 2.3 Deploy Backend Code
```bash
# Build and deploy
cd D:\MyProjects\code-muse-board

# Install dependencies
npm install

# Run Prisma migrations
npx prisma migrate deploy

# Create deployment zip
npm run build

# Deploy to Azure
az webapp deployment source config-zip `
  --name $BACKEND_APP_NAME `
  --resource-group $RESOURCE_GROUP `
  --src deploy.zip
```

### Step 3: Deploy Frontend (Static Web App)

#### 3.1 Create Static Web App
```bash
# Set variables
$FRONTEND_APP_NAME="codemuse-frontend"

# Create Static Web App
az staticwebapp create `
  --name $FRONTEND_APP_NAME `
  --resource-group $RESOURCE_GROUP `
  --location $LOCATION `
  --source https://github.com/softprotechcoader/code-muse-board `
  --branch AiChat `
  --app-location "/" `
  --output-location "dist" `
  --login-with-github
```

#### 3.2 Configure Frontend Environment Variables
Create `staticwebapp.config.json` in project root:
```json
{
  "routes": [
    {
      "route": "/api/*",
      "allowedRoles": ["anonymous"]
    },
    {
      "route": "/*",
      "serve": "/index.html",
      "statusCode": 200
    }
  ],
  "navigationFallback": {
    "rewrite": "/index.html",
    "exclude": ["/images/*.{png,jpg,gif}", "/css/*"]
  },
  "responseOverrides": {
    "404": {
      "rewrite": "/index.html",
      "statusCode": 200
    }
  },
  "globalHeaders": {
    "content-security-policy": "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';"
  },
  "mimeTypes": {
    ".json": "application/json",
    ".js": "text/javascript",
    ".css": "text/css"
  }
}
```

#### 3.3 Update Frontend Configuration
Create `.env.production` file:
```env
VITE_API_URL=https://codemuse-api.azurewebsites.net
VITE_SOCKET_URL=https://codemuse-api.azurewebsites.net
```

#### 3.4 Build and Deploy Frontend
```bash
# Build frontend
npm run build

# Deploy to Static Web App (automatic via GitHub Actions)
# Or manually upload dist folder through Azure Portal
```

### Step 4: Configure CORS and Networking

#### 4.1 Configure CORS on Backend
```bash
# Add allowed origins
az webapp cors add `
  --name $BACKEND_APP_NAME `
  --resource-group $RESOURCE_GROUP `
  --allowed-origins "https://$FRONTEND_APP_NAME.azurestaticapps.net"
```

#### 4.2 Configure Custom Domain (Optional)
```bash
# Add custom domain to Static Web App
az staticwebapp hostname set `
  --name $FRONTEND_APP_NAME `
  --resource-group $RESOURCE_GROUP `
  --hostname "www.yourdomain.com"

# Add custom domain to backend
az webapp config hostname add `
  --webapp-name $BACKEND_APP_NAME `
  --resource-group $RESOURCE_GROUP `
  --hostname "api.yourdomain.com"
```

### Step 5: Run Database Migrations
```bash
# Connect to database and run migrations
$env:DATABASE_URL=$DB_CONNECTION_STRING
npx prisma migrate deploy
npx prisma db push
```

---

## Method 2: CI/CD with Azure DevOps

### Step 1: Setup Azure DevOps

#### 1.1 Create Azure DevOps Organization
1. Go to [Azure DevOps](https://dev.azure.com)
2. Click **+ New organization**
3. Name: `CodeMuseOrg`
4. Create new project: `CodeMuseBoard`

#### 1.2 Connect to Azure Subscription
1. In Azure DevOps, go to **Project Settings** → **Service connections**
2. Click **+ New service connection**
3. Select **Azure Resource Manager**
4. Choose **Service principal (automatic)**
5. Select your subscription
6. Resource group: `rg-codemuse-prod`
7. Service connection name: `Azure-CodeMuse-Connection`
8. Click **Save**

### Step 2: Setup Git Repository

#### 2.1 Import Repository
```bash
# Option 1: Import from GitHub
# In Azure DevOps → Repos → Import repository
# URL: https://github.com/softprotechcoader/code-muse-board
# Branch: AiChat

# Option 2: Push existing repo
cd D:\MyProjects\code-muse-board
git remote add azure https://dev.azure.com/CodeMuseOrg/CodeMuseBoard/_git/CodeMuseBoard
git push azure AiChat
```

### Step 3: Create Variable Groups

#### 3.1 Create Production Variable Group
1. Go to **Pipelines** → **Library** → **+ Variable group**
2. Name: `codemuse-prod-vars`
3. Add variables:

| Variable Name | Value | Secret? |
|---------------|-------|---------|
| `RESOURCE_GROUP` | `rg-codemuse-prod` | No |
| `BACKEND_APP_NAME` | `codemuse-api` | No |
| `FRONTEND_APP_NAME` | `codemuse-frontend` | No |
| `DATABASE_URL` | (from Key Vault) | Yes |
| `AZURE_OPENAI_ENDPOINT` | (from Key Vault) | Yes |
| `AZURE_OPENAI_API_KEY` | (from Key Vault) | Yes |
| `NODE_ENV` | `production` | No |

4. Link to Key Vault:
   - Enable **Link secrets from Azure Key Vault**
   - Select your Key Vault: `codemuse-kv-XXXX`
   - Authorize and add secrets

### Step 4: Create Backend Pipeline

#### 4.1 Create `azure-pipelines-backend.yml`
```yaml
# azure-pipelines-backend.yml
trigger:
  branches:
    include:
      - AiChat
      - main
  paths:
    include:
      - server.js
      - src/routes/**
      - src/services/**
      - src/middleware/**
      - package.json

variables:
  - group: codemuse-prod-vars
  - name: nodeVersion
    value: '18.x'

stages:
  - stage: Build
    displayName: 'Build Backend'
    jobs:
      - job: BuildBackend
        displayName: 'Build and Test'
        pool:
          vmImage: 'ubuntu-latest'
        
        steps:
          - task: NodeTool@0
            displayName: 'Install Node.js'
            inputs:
              versionSpec: $(nodeVersion)
          
          - script: |
              npm install
              npm run lint --if-present
            displayName: 'Install dependencies and lint'
          
          - script: |
              npx prisma generate
            displayName: 'Generate Prisma Client'
          
          - task: ArchiveFiles@2
            displayName: 'Archive backend files'
            inputs:
              rootFolderOrFile: '$(System.DefaultWorkingDirectory)'
              includeRootFolder: false
              archiveType: 'zip'
              archiveFile: '$(Build.ArtifactStagingDirectory)/backend-$(Build.BuildId).zip'
              replaceExistingArchive: true
          
          - task: PublishBuildArtifacts@1
            displayName: 'Publish Backend Artifact'
            inputs:
              pathToPublish: '$(Build.ArtifactStagingDirectory)'
              artifactName: 'backend-drop'

  - stage: Deploy
    displayName: 'Deploy to Azure'
    dependsOn: Build
    condition: succeeded()
    jobs:
      - deployment: DeployBackend
        displayName: 'Deploy Backend to App Service'
        environment: 'production'
        pool:
          vmImage: 'ubuntu-latest'
        strategy:
          runOnce:
            deploy:
              steps:
                - task: DownloadBuildArtifacts@0
                  displayName: 'Download Backend Artifact'
                  inputs:
                    buildType: 'current'
                    downloadType: 'single'
                    artifactName: 'backend-drop'
                    downloadPath: '$(System.ArtifactsDirectory)'
                
                - task: AzureWebApp@1
                  displayName: 'Deploy to Azure App Service'
                  inputs:
                    azureSubscription: 'Azure-CodeMuse-Connection'
                    appType: 'webAppLinux'
                    appName: '$(BACKEND_APP_NAME)'
                    package: '$(System.ArtifactsDirectory)/backend-drop/backend-$(Build.BuildId).zip'
                    runtimeStack: 'NODE|18-lts'
                    startUpCommand: 'node server.js'
                
                - task: AzureAppServiceSettings@1
                  displayName: 'Configure App Settings'
                  inputs:
                    azureSubscription: 'Azure-CodeMuse-Connection'
                    appName: '$(BACKEND_APP_NAME)'
                    resourceGroupName: '$(RESOURCE_GROUP)'
                    appSettings: |
                      [
                        {
                          "name": "DATABASE_URL",
                          "value": "$(DATABASE_URL)",
                          "slotSetting": false
                        },
                        {
                          "name": "AZURE_OPENAI_ENDPOINT",
                          "value": "$(AZURE_OPENAI_ENDPOINT)",
                          "slotSetting": false
                        },
                        {
                          "name": "AZURE_OPENAI_API_KEY",
                          "value": "$(AZURE_OPENAI_API_KEY)",
                          "slotSetting": false
                        },
                        {
                          "name": "AZURE_OPENAI_DEPLOYMENT",
                          "value": "gpt-4o-mini",
                          "slotSetting": false
                        },
                        {
                          "name": "NODE_ENV",
                          "value": "production",
                          "slotSetting": false
                        },
                        {
                          "name": "SCM_DO_BUILD_DURING_DEPLOYMENT",
                          "value": "true",
                          "slotSetting": false
                        }
                      ]
                
                - task: AzureCLI@2
                  displayName: 'Run Database Migrations'
                  inputs:
                    azureSubscription: 'Azure-CodeMuse-Connection'
                    scriptType: 'bash'
                    scriptLocation: 'inlineScript'
                    inlineScript: |
                      export DATABASE_URL="$(DATABASE_URL)"
                      npx prisma migrate deploy
```

### Step 5: Create Frontend Pipeline

#### 5.1 Create `azure-pipelines-frontend.yml`
```yaml
# azure-pipelines-frontend.yml
trigger:
  branches:
    include:
      - AiChat
      - main
  paths:
    include:
      - src/**
      - public/**
      - index.html
      - vite.config.ts
      - package.json

variables:
  - group: codemuse-prod-vars
  - name: nodeVersion
    value: '18.x'

stages:
  - stage: Build
    displayName: 'Build Frontend'
    jobs:
      - job: BuildFrontend
        displayName: 'Build React App'
        pool:
          vmImage: 'ubuntu-latest'
        
        steps:
          - task: NodeTool@0
            displayName: 'Install Node.js'
            inputs:
              versionSpec: $(nodeVersion)
          
          - script: |
              npm install
            displayName: 'Install dependencies'
          
          - script: |
              echo "VITE_API_URL=https://$(BACKEND_APP_NAME).azurewebsites.net" > .env.production
              echo "VITE_SOCKET_URL=https://$(BACKEND_APP_NAME).azurewebsites.net" >> .env.production
            displayName: 'Create production env file'
          
          - script: |
              npm run build
            displayName: 'Build frontend'
          
          - task: PublishBuildArtifacts@1
            displayName: 'Publish Frontend Artifact'
            inputs:
              pathToPublish: 'dist'
              artifactName: 'frontend-drop'

  - stage: Deploy
    displayName: 'Deploy to Azure Static Web Apps'
    dependsOn: Build
    condition: succeeded()
    jobs:
      - deployment: DeployFrontend
        displayName: 'Deploy Frontend'
        environment: 'production'
        pool:
          vmImage: 'ubuntu-latest'
        strategy:
          runOnce:
            deploy:
              steps:
                - task: DownloadBuildArtifacts@0
                  displayName: 'Download Frontend Artifact'
                  inputs:
                    buildType: 'current'
                    downloadType: 'single'
                    artifactName: 'frontend-drop'
                    downloadPath: '$(System.ArtifactsDirectory)'
                
                - task: AzureStaticWebApp@0
                  displayName: 'Deploy to Static Web Apps'
                  inputs:
                    azure_static_web_apps_api_token: $(AZURE_STATIC_WEB_APPS_API_TOKEN)
                    app_location: '$(System.ArtifactsDirectory)/frontend-drop'
                    skip_app_build: true
                    skip_api_build: true
```

### Step 6: Create Unified Pipeline (Optional)

#### 6.1 Create `azure-pipelines.yml` (Full Stack)
```yaml
# azure-pipelines.yml
trigger:
  branches:
    include:
      - AiChat
      - main

variables:
  - group: codemuse-prod-vars
  - name: nodeVersion
    value: '18.x'

stages:
  # Backend Build
  - stage: BuildBackend
    displayName: 'Build Backend'
    jobs:
      - job: BuildBackendJob
        pool:
          vmImage: 'ubuntu-latest'
        steps:
          - task: NodeTool@0
            inputs:
              versionSpec: $(nodeVersion)
          - script: npm install
          - script: npx prisma generate
          - task: ArchiveFiles@2
            inputs:
              rootFolderOrFile: '$(System.DefaultWorkingDirectory)'
              archiveFile: '$(Build.ArtifactStagingDirectory)/backend.zip'
          - task: PublishBuildArtifacts@1
            inputs:
              artifactName: 'backend'

  # Frontend Build
  - stage: BuildFrontend
    displayName: 'Build Frontend'
    jobs:
      - job: BuildFrontendJob
        pool:
          vmImage: 'ubuntu-latest'
        steps:
          - task: NodeTool@0
            inputs:
              versionSpec: $(nodeVersion)
          - script: |
              npm install
              echo "VITE_API_URL=https://$(BACKEND_APP_NAME).azurewebsites.net" > .env.production
              npm run build
          - task: PublishBuildArtifacts@1
            inputs:
              pathToPublish: 'dist'
              artifactName: 'frontend'

  # Deploy Backend
  - stage: DeployBackend
    dependsOn: BuildBackend
    jobs:
      - deployment: DeployBackendJob
        environment: 'production'
        strategy:
          runOnce:
            deploy:
              steps:
                - task: AzureWebApp@1
                  inputs:
                    azureSubscription: 'Azure-CodeMuse-Connection'
                    appName: '$(BACKEND_APP_NAME)'
                    package: '$(Pipeline.Workspace)/backend/backend.zip'

  # Deploy Frontend
  - stage: DeployFrontend
    dependsOn: BuildFrontend
    jobs:
      - deployment: DeployFrontendJob
        environment: 'production'
        strategy:
          runOnce:
            deploy:
              steps:
                - task: AzureStaticWebApp@0
                  inputs:
                    azure_static_web_apps_api_token: $(AZURE_STATIC_WEB_APPS_API_TOKEN)
                    app_location: '$(Pipeline.Workspace)/frontend'
```

### Step 7: Setup Build Agents (Optional)

#### 7.1 Use Self-Hosted Agent
```bash
# On your build machine
# Download agent
mkdir azagent
cd azagent
Invoke-WebRequest -Uri "https://vstsagentpackage.azureedge.net/agent/3.232.0/vsts-agent-win-x64-3.232.0.zip" -OutFile agent.zip
Expand-Archive agent.zip

# Configure agent
.\config.cmd

# Run agent as service
.\run.cmd --once
```

### Step 8: Create Release Environments

#### 8.1 Setup Environments in Azure DevOps
1. Go to **Pipelines** → **Environments**
2. Create three environments:
   - `development`
   - `staging`
   - `production`
3. Add approvals and checks for production:
   - Required reviewers: 2 people
   - Branch control: only from `main`
   - Time delay: 30 minutes

---

## Post-Deployment Configuration

### Step 1: Verify Deployments

#### 1.1 Test Backend API
```bash
# Test health endpoint
curl https://codemuse-api.azurewebsites.net/health

# Test news API
curl https://codemuse-api.azurewebsites.net/api/news

# Test AI chat
curl -X POST https://codemuse-api.azurewebsites.net/api/chat/ai `
  -H "Content-Type: application/json" `
  -d '{"message":"Hello"}'
```

#### 1.2 Test Frontend
1. Navigate to: `https://codemuse-frontend.azurestaticapps.net`
2. Verify all pages load
3. Test AI Chat feature
4. Check browser console for errors

### Step 2: Configure Application Insights

#### 2.1 Create Application Insights
```bash
# Create App Insights
az monitor app-insights component create `
  --app codemuse-insights `
  --location $LOCATION `
  --resource-group $RESOURCE_GROUP `
  --application-type web

# Get instrumentation key
$INSIGHTS_KEY=$(az monitor app-insights component show `
  --app codemuse-insights `
  --resource-group $RESOURCE_GROUP `
  --query instrumentationKey -o tsv)

# Add to App Service
az webapp config appsettings set `
  --name $BACKEND_APP_NAME `
  --resource-group $RESOURCE_GROUP `
  --settings APPINSIGHTS_INSTRUMENTATIONKEY=$INSIGHTS_KEY
```

#### 2.2 Configure Application Insights in Code

Create `src/utils/appInsights.js`:
```javascript
import appInsights from 'applicationinsights';

if (process.env.APPINSIGHTS_INSTRUMENTATIONKEY) {
  appInsights.setup(process.env.APPINSIGHTS_INSTRUMENTATIONKEY)
    .setAutoDependencyCorrelation(true)
    .setAutoCollectRequests(true)
    .setAutoCollectPerformance(true)
    .setAutoCollectExceptions(true)
    .setAutoCollectDependencies(true)
    .setAutoCollectConsole(true)
    .setUseDiskRetryCaching(true)
    .start();
}

export default appInsights.defaultClient;
```

Add to `server.js`:
```javascript
import './src/utils/appInsights.js';
```

### Step 3: Setup Monitoring Alerts

#### 3.1 Create Alert Rules
```bash
# High CPU alert
az monitor metrics alert create `
  --name "High CPU Usage" `
  --resource-group $RESOURCE_GROUP `
  --scopes "/subscriptions/{subscription-id}/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.Web/sites/$BACKEND_APP_NAME" `
  --condition "avg Percentage CPU > 80" `
  --window-size 5m `
  --evaluation-frequency 1m `
  --action-group "codemuse-alerts"

# High memory alert
az monitor metrics alert create `
  --name "High Memory Usage" `
  --resource-group $RESOURCE_GROUP `
  --scopes "/subscriptions/{subscription-id}/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.Web/sites/$BACKEND_APP_NAME" `
  --condition "avg MemoryPercentage > 80" `
  --window-size 5m `
  --evaluation-frequency 1m

# Response time alert
az monitor metrics alert create `
  --name "Slow Response Time" `
  --resource-group $RESOURCE_GROUP `
  --scopes "/subscriptions/{subscription-id}/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.Web/sites/$BACKEND_APP_NAME" `
  --condition "avg AverageResponseTime > 3000" `
  --window-size 5m
```

### Step 4: Setup Backup and Recovery

#### 4.1 Configure Database Backup
```bash
# Enable automated backups
az postgres flexible-server backup create `
  --resource-group $RESOURCE_GROUP `
  --name $DB_SERVER_NAME `
  --backup-name "daily-backup-$(Get-Date -Format 'yyyyMMdd')"

# Schedule daily backups (using Azure Automation or Logic Apps)
```

#### 4.2 Configure App Service Backup
```bash
# Create storage account for backups
az storage account create `
  --name codemuse backup `
  --resource-group $RESOURCE_GROUP `
  --location $LOCATION `
  --sku Standard_LRS

# Configure backup
az webapp config backup create `
  --resource-group $RESOURCE_GROUP `
  --webapp-name $BACKEND_APP_NAME `
  --backup-name "daily-backup" `
  --storage-account-url "https://codemusebackup.blob.core.windows.net/backups" `
  --frequency 1d `
  --retain-one true
```

---

## Monitoring and Maintenance

### Application Insights Dashboards

#### Create Custom Dashboard
1. Go to Azure Portal → Application Insights
2. Create new dashboard with widgets:
   - Request rate and response time
   - Failed requests
   - Server response time
   - Page view load time
   - Custom events (AI chat usage)
   - Dependencies (database, Azure OpenAI)

### Log Analytics Queries

#### Useful KQL Queries

**Failed Requests:**
```kql
requests
| where success == false
| summarize count() by name, resultCode
| order by count_ desc
```

**Slow Requests:**
```kql
requests
| where duration > 3000
| project timestamp, name, url, duration, resultCode
| order by duration desc
```

**AI Chat Usage:**
```kql
customEvents
| where name == "AIChat"
| summarize count() by bin(timestamp, 1h)
| render timechart
```

**Database Performance:**
```kql
dependencies
| where type == "SQL"
| summarize avg(duration), count() by name
| order by avg_duration desc
```

### Performance Optimization

#### Enable CDN for Static Assets
```bash
# Create CDN profile
az cdn profile create `
  --name codemuse-cdn `
  --resource-group $RESOURCE_GROUP `
  --sku Standard_Microsoft

# Create CDN endpoint
az cdn endpoint create `
  --name codemuse-cdn-endpoint `
  --profile-name codemuse-cdn `
  --resource-group $RESOURCE_GROUP `
  --origin codemuse-frontend.azurestaticapps.net
```

#### Scale Out Backend
```bash
# Manual scale
az appservice plan update `
  --name $APP_SERVICE_PLAN `
  --resource-group $RESOURCE_GROUP `
  --number-of-workers 3

# Auto-scale rule
az monitor autoscale create `
  --resource-group $RESOURCE_GROUP `
  --name codemuse-autoscale `
  --resource "/subscriptions/{subscription-id}/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.Web/serverfarms/$APP_SERVICE_PLAN" `
  --min-count 1 `
  --max-count 5 `
  --count 2

# Scale up on CPU
az monitor autoscale rule create `
  --resource-group $RESOURCE_GROUP `
  --autoscale-name codemuse-autoscale `
  --condition "Percentage CPU > 70 avg 5m" `
  --scale out 1

# Scale down on CPU
az monitor autoscale rule create `
  --resource-group $RESOURCE_GROUP `
  --autoscale-name codemuse-autoscale `
  --condition "Percentage CPU < 30 avg 5m" `
  --scale in 1
```

---

## Troubleshooting

### Common Issues and Solutions

#### Issue 1: Backend Not Starting
**Symptoms**: App Service shows "Application Error"

**Solutions**:
```bash
# Check logs
az webapp log tail --name $BACKEND_APP_NAME --resource-group $RESOURCE_GROUP

# Verify environment variables
az webapp config appsettings list --name $BACKEND_APP_NAME --resource-group $RESOURCE_GROUP

# Check startup command
az webapp config show --name $BACKEND_APP_NAME --resource-group $RESOURCE_GROUP --query appCommandLine
```

#### Issue 2: Database Connection Fails
**Symptoms**: "Could not connect to database"

**Solutions**:
```bash
# Verify firewall rules
az postgres flexible-server firewall-rule list `
  --resource-group $RESOURCE_GROUP `
  --name $DB_SERVER_NAME

# Test connection
$env:DATABASE_URL="your-connection-string"
npx prisma db pull

# Check SSL requirement
# Add ?sslmode=require to connection string
```

#### Issue 3: CORS Errors
**Symptoms**: Browser console shows CORS errors

**Solutions**:
```bash
# Update CORS settings
az webapp cors remove --name $BACKEND_APP_NAME --resource-group $RESOURCE_GROUP --allowed-origins "*"
az webapp cors add --name $BACKEND_APP_NAME --resource-group $RESOURCE_GROUP --allowed-origins "https://codemuse-frontend.azurestaticapps.net"

# Check in code (server.js)
app.use(cors({
  origin: process.env.FRONTEND_URL || 'https://codemuse-frontend.azurestaticapps.net'
}));
```

#### Issue 4: Socket.io Connection Failed
**Symptoms**: Real-time features not working

**Solutions**:
```bash
# Enable WebSockets
az webapp config set `
  --name $BACKEND_APP_NAME `
  --resource-group $RESOURCE_GROUP `
  --web-sockets-enabled true

# Check client configuration
const socket = io(process.env.VITE_SOCKET_URL, {
  transports: ['websocket', 'polling']
});
```

#### Issue 5: Azure OpenAI Rate Limit
**Symptoms**: "Rate limit exceeded" errors

**Solutions**:
```bash
# Increase quota
az cognitiveservices account deployment update `
  --name $OPENAI_NAME `
  --resource-group $RESOURCE_GROUP `
  --deployment-name gpt-4o-mini `
  --sku-capacity 20

# Implement caching and rate limiting in code
```

---

## Cost Optimization

### Estimated Monthly Costs

| Service | Configuration | Estimated Cost |
|---------|--------------|----------------|
| App Service (B1) | 1 instance | ~$13/month |
| PostgreSQL (Basic) | 2 vCores, 50GB | ~$30/month |
| Azure OpenAI | Pay-as-you-go | ~$10-50/month |
| Static Web Apps | Standard | Free - $9/month |
| Key Vault | Standard | ~$0.03/secret |
| Application Insights | Pay-as-you-go | ~$5-20/month |
| **Total** | | **~$58-122/month** |

### Cost Savings Tips

#### 1. Use Free Tiers
```bash
# Static Web Apps - Free tier
# Azure DevOps - Free for up to 5 users
# Application Insights - First 5GB free
```

#### 2. Auto-shutdown Non-Production
```bash
# Create Azure Automation runbook to stop/start resources
# Schedule: Stop at 6 PM, Start at 8 AM on weekdays
```

#### 3. Reserved Instances
```bash
# For production, purchase 1-year reserved instance
# Savings: Up to 37% on App Service
```

#### 4. Right-size Resources
```bash
# Monitor usage and downgrade if needed
az appservice plan update `
  --name $APP_SERVICE_PLAN `
  --resource-group $RESOURCE_GROUP `
  --sku F1  # Free tier for development
```

#### 5. Use Azure Cost Management
```bash
# Set budget alerts
az consumption budget create `
  --resource-group $RESOURCE_GROUP `
  --budget-name codemuse-budget `
  --amount 100 `
  --time-grain Monthly
```

---

## Security Best Practices

### 1. Enable Azure AD Authentication
```bash
# Configure Azure AD for App Service
az webapp auth update `
  --name $BACKEND_APP_NAME `
  --resource-group $RESOURCE_GROUP `
  --enabled true `
  --action LoginWithAzureActiveDirectory
```

### 2. Use Managed Identities
```bash
# Enable managed identity
az webapp identity assign `
  --name $BACKEND_APP_NAME `
  --resource-group $RESOURCE_GROUP

# Grant Key Vault access
az keyvault set-policy `
  --name $KEYVAULT_NAME `
  --object-id $(az webapp identity show --name $BACKEND_APP_NAME --resource-group $RESOURCE_GROUP --query principalId -o tsv) `
  --secret-permissions get list
```

### 3. Enable SSL/TLS
```bash
# Enforce HTTPS
az webapp update `
  --name $BACKEND_APP_NAME `
  --resource-group $RESOURCE_GROUP `
  --https-only true

# Use latest TLS version
az webapp config set `
  --name $BACKEND_APP_NAME `
  --resource-group $RESOURCE_GROUP `
  --min-tls-version 1.2
```

### 4. Network Security
```bash
# Restrict database access
az postgres flexible-server firewall-rule create `
  --resource-group $RESOURCE_GROUP `
  --name $DB_SERVER_NAME `
  --rule-name AllowAppService `
  --start-ip-address <App-Service-IP> `
  --end-ip-address <App-Service-IP>

# Use Private Endpoints (for production)
az network private-endpoint create `
  --name codemuse-db-pe `
  --resource-group $RESOURCE_GROUP `
  --vnet-name codemuse-vnet `
  --subnet default `
  --private-connection-resource-id $(az postgres flexible-server show --name $DB_SERVER_NAME --resource-group $RESOURCE_GROUP --query id -o tsv)
```

---

## Rollback Strategy

### Automated Rollback

#### Configure Deployment Slots
```bash
# Create staging slot
az webapp deployment slot create `
  --name $BACKEND_APP_NAME `
  --resource-group $RESOURCE_GROUP `
  --slot staging

# Deploy to staging first
az webapp deployment source config-zip `
  --name $BACKEND_APP_NAME `
  --resource-group $RESOURCE_GROUP `
  --slot staging `
  --src backend.zip

# Swap slots (zero-downtime deployment)
az webapp deployment slot swap `
  --name $BACKEND_APP_NAME `
  --resource-group $RESOURCE_GROUP `
  --slot staging `
  --target-slot production
```

#### Manual Rollback
```bash
# List previous deployments
az webapp deployment list `
  --name $BACKEND_APP_NAME `
  --resource-group $RESOURCE_GROUP

# Rollback to previous deployment
az webapp deployment source config-zip `
  --name $BACKEND_APP_NAME `
  --resource-group $RESOURCE_GROUP `
  --src previous-version.zip
```

---

## Documentation Checklist

- [x] Azure services required
- [x] Manual deployment steps
- [x] CI/CD pipeline setup
- [x] Environment configuration
- [x] Monitoring setup
- [x] Troubleshooting guide
- [x] Cost optimization
- [x] Security best practices
- [x] Rollback procedures

---

## Next Steps After Deployment

1. ✅ Configure custom domain
2. ✅ Setup monitoring and alerts
3. ✅ Configure backups
4. ✅ Test disaster recovery
5. ✅ Setup staging environment
6. ✅ Document operational procedures
7. ✅ Train team on Azure DevOps
8. ✅ Setup cost alerts
9. ✅ Review security compliance
10. ✅ Performance testing

---

**Last Updated**: October 20, 2025
**Version**: 1.0.0
**Maintained By**: Code Muse Team
