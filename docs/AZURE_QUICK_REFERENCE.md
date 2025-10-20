# Azure Deployment - Quick Reference Guide

## 🚀 Quick Start Commands

### Prerequisites Setup
```powershell
# Install Azure CLI
Invoke-WebRequest -Uri https://aka.ms/installazurecliwindows -OutFile .\AzureCLI.msi
Start-Process msiexec.exe -Wait -ArgumentList '/I AzureCLI.msi /quiet'

# Login
az login

# Set subscription
az account set --subscription "Your Subscription Name"
```

---

## Method 1: Quick Manual Deployment (30 minutes)

### Step 1: Set Variables (2 minutes)
```powershell
$RESOURCE_GROUP="rg-codemuse-prod"
$LOCATION="eastus"
$DB_SERVER="codemuse-db-$(Get-Random -Maximum 9999)"
$DB_ADMIN="codemuse_admin"
$DB_PASSWORD="SecurePass123!"
$BACKEND_APP="codemuse-api-$(Get-Random -Maximum 9999)"
$FRONTEND_APP="codemuse-web-$(Get-Random -Maximum 9999)"
$OPENAI_NAME="codemuse-ai-$(Get-Random -Maximum 9999)"
```

### Step 2: Create Resource Group (1 minute)
```powershell
az group create --name $RESOURCE_GROUP --location $LOCATION
```

### Step 3: Create Database (5 minutes)
```powershell
az postgres flexible-server create `
  --resource-group $RESOURCE_GROUP `
  --name $DB_SERVER `
  --location $LOCATION `
  --admin-user $DB_ADMIN `
  --admin-password $DB_PASSWORD `
  --sku-name Standard_B1ms `
  --tier Burstable `
  --version 14

az postgres flexible-server firewall-rule create `
  --resource-group $RESOURCE_GROUP `
  --name $DB_SERVER `
  --rule-name AllowAzure `
  --start-ip-address 0.0.0.0 `
  --end-ip-address 0.0.0.0
```

### Step 4: Create Azure OpenAI (5 minutes)
```powershell
az cognitiveservices account create `
  --name $OPENAI_NAME `
  --resource-group $RESOURCE_GROUP `
  --location eastus `
  --kind OpenAI `
  --sku S0 `
  --yes

az cognitiveservices account deployment create `
  --name $OPENAI_NAME `
  --resource-group $RESOURCE_GROUP `
  --deployment-name gpt-4o-mini `
  --model-name gpt-4o `
  --model-version "2024-08-01" `
  --model-format OpenAI `
  --sku-name Standard `
  --sku-capacity 10
```

### Step 5: Deploy Backend (10 minutes)
```powershell
# Create App Service
az appservice plan create `
  --name "${BACKEND_APP}-plan" `
  --resource-group $RESOURCE_GROUP `
  --sku B1 `
  --is-linux

az webapp create `
  --name $BACKEND_APP `
  --resource-group $RESOURCE_GROUP `
  --plan "${BACKEND_APP}-plan" `
  --runtime "NODE:18-lts"

# Configure settings
$DB_URL="postgresql://${DB_ADMIN}:${DB_PASSWORD}@${DB_SERVER}.postgres.database.azure.com:5432/postgres?sslmode=require"
$AI_KEY=$(az cognitiveservices account keys list --name $OPENAI_NAME --resource-group $RESOURCE_GROUP --query key1 -o tsv)
$AI_ENDPOINT=$(az cognitiveservices account show --name $OPENAI_NAME --resource-group $RESOURCE_GROUP --query properties.endpoint -o tsv)

az webapp config appsettings set `
  --name $BACKEND_APP `
  --resource-group $RESOURCE_GROUP `
  --settings `
    DATABASE_URL=$DB_URL `
    AZURE_OPENAI_API_KEY=$AI_KEY `
    AZURE_OPENAI_ENDPOINT=$AI_ENDPOINT `
    AZURE_OPENAI_DEPLOYMENT="gpt-4o-mini" `
    NODE_ENV="production"

az webapp config set `
  --name $BACKEND_APP `
  --resource-group $RESOURCE_GROUP `
  --web-sockets-enabled true

# Deploy code
cd D:\MyProjects\code-muse-board
npm install
npx prisma generate
az webapp deployment source config-local-git --name $BACKEND_APP --resource-group $RESOURCE_GROUP
git remote add azure $(az webapp deployment source show --name $BACKEND_APP --resource-group $RESOURCE_GROUP --query url -o tsv)
git push azure AiChat:master
```

### Step 6: Deploy Frontend (5 minutes)
```powershell
# Build frontend
echo "VITE_API_URL=https://$BACKEND_APP.azurewebsites.net" > .env.production
npm run build

# Create Static Web App
az staticwebapp create `
  --name $FRONTEND_APP `
  --resource-group $RESOURCE_GROUP `
  --location $LOCATION

# Upload dist folder (manual via portal or use SWA CLI)
npm install -g @azure/static-web-apps-cli
swa deploy ./dist --deployment-token $(az staticwebapp secrets list --name $FRONTEND_APP --query properties.apiKey -o tsv)
```

### Step 7: Configure CORS (2 minutes)
```powershell
az webapp cors add `
  --name $BACKEND_APP `
  --resource-group $RESOURCE_GROUP `
  --allowed-origins "https://$FRONTEND_APP.azurestaticapps.net"
```

### ✅ Done! Test Your App
```powershell
Write-Host "🎉 Deployment Complete!"
Write-Host "Backend: https://$BACKEND_APP.azurewebsites.net"
Write-Host "Frontend: https://$FRONTEND_APP.azurestaticapps.net"
```

---

## Method 2: CI/CD Setup (1 hour)

### Quick CI/CD Setup

#### 1. Create Azure DevOps Project (5 minutes)
1. Go to https://dev.azure.com
2. Create organization: `CodeMuseOrg`
3. Create project: `CodeMuseBoard`

#### 2. Create Service Connection (5 minutes)
1. Project Settings → Service connections
2. New service connection → Azure Resource Manager
3. Service principal (automatic)
4. Name: `Azure-CodeMuse-Connection`

#### 3. Import Repository (2 minutes)
```powershell
cd D:\MyProjects\code-muse-board
git remote add azure https://dev.azure.com/CodeMuseOrg/CodeMuseBoard/_git/CodeMuseBoard
git push azure AiChat
```

#### 4. Create Pipeline Files (10 minutes)

**Backend Pipeline** (`azure-pipelines-backend.yml`):
```yaml
trigger:
  branches:
    include: [AiChat, main]
  paths:
    include: [server.js, src/**, package.json]

pool:
  vmImage: 'ubuntu-latest'

variables:
  - group: codemuse-prod-vars

stages:
  - stage: Build
    jobs:
      - job: BuildBackend
        steps:
          - task: NodeTool@0
            inputs:
              versionSpec: '18.x'
          - script: npm install && npx prisma generate
          - task: ArchiveFiles@2
            inputs:
              rootFolderOrFile: '$(System.DefaultWorkingDirectory)'
              archiveFile: '$(Build.ArtifactStagingDirectory)/backend.zip'
          - publish: $(Build.ArtifactStagingDirectory)/backend.zip
            artifact: backend

  - stage: Deploy
    jobs:
      - deployment: DeployBackend
        environment: production
        strategy:
          runOnce:
            deploy:
              steps:
                - task: AzureWebApp@1
                  inputs:
                    azureSubscription: 'Azure-CodeMuse-Connection'
                    appName: '$(BACKEND_APP_NAME)'
                    package: '$(Pipeline.Workspace)/backend/backend.zip'
```

**Frontend Pipeline** (`azure-pipelines-frontend.yml`):
```yaml
trigger:
  branches:
    include: [AiChat, main]
  paths:
    include: [src/**, public/**, index.html, vite.config.ts]

pool:
  vmImage: 'ubuntu-latest'

variables:
  - group: codemuse-prod-vars

stages:
  - stage: Build
    jobs:
      - job: BuildFrontend
        steps:
          - task: NodeTool@0
            inputs:
              versionSpec: '18.x'
          - script: |
              npm install
              echo "VITE_API_URL=https://$(BACKEND_APP_NAME).azurewebsites.net" > .env.production
              npm run build
          - publish: dist
            artifact: frontend

  - stage: Deploy
    jobs:
      - deployment: DeployFrontend
        environment: production
        strategy:
          runOnce:
            deploy:
              steps:
                - task: AzureStaticWebApp@0
                  inputs:
                    azure_static_web_apps_api_token: $(AZURE_STATIC_WEB_APPS_API_TOKEN)
                    app_location: '$(Pipeline.Workspace)/frontend'
```

#### 5. Create Variable Group (5 minutes)
1. Pipelines → Library → + Variable group
2. Name: `codemuse-prod-vars`
3. Add variables:
   - `BACKEND_APP_NAME`: Your backend app name
   - `FRONTEND_APP_NAME`: Your frontend app name
   - `RESOURCE_GROUP`: `rg-codemuse-prod`
   - `DATABASE_URL`: (from Key Vault)
   - `AZURE_OPENAI_API_KEY`: (from Key Vault)
   - `AZURE_OPENAI_ENDPOINT`: (from Key Vault)

#### 6. Create Pipelines (5 minutes)
1. Pipelines → New pipeline
2. Select Azure Repos Git
3. Select your repository
4. Existing YAML file → `azure-pipelines-backend.yml`
5. Save and run
6. Repeat for `azure-pipelines-frontend.yml`

#### 7. Setup Environments (3 minutes)
1. Pipelines → Environments → New environment
2. Create `production` environment
3. Add approval: Settings → Approvals and checks
4. Require 1 reviewer before deployment

### ✅ CI/CD Active!
Now every push to AiChat branch will trigger automatic deployment.

---

## 🔍 Quick Troubleshooting

### Backend Not Starting
```powershell
# Check logs
az webapp log tail --name $BACKEND_APP --resource-group $RESOURCE_GROUP

# Restart app
az webapp restart --name $BACKEND_APP --resource-group $RESOURCE_GROUP
```

### Database Connection Failed
```powershell
# Test connection
$env:DATABASE_URL="your-connection-string"
npx prisma db pull

# Check firewall
az postgres flexible-server firewall-rule list --name $DB_SERVER --resource-group $RESOURCE_GROUP
```

### Frontend Not Loading
```powershell
# Check deployment status
az staticwebapp show --name $FRONTEND_APP --resource-group $RESOURCE_GROUP

# View logs in Azure Portal → Static Web Apps → Deployments
```

### CORS Errors
```powershell
# Fix CORS
az webapp cors remove --name $BACKEND_APP --resource-group $RESOURCE_GROUP --allowed-origins "*"
az webapp cors add --name $BACKEND_APP --resource-group $RESOURCE_GROUP --allowed-origins "https://$FRONTEND_APP.azurestaticapps.net"
```

---

## 📊 Cost Calculator

### Development Environment
```
App Service (Free F1)              $0/month
PostgreSQL (Basic 1vCore)          $25/month
Azure OpenAI (minimal usage)       $5/month
Static Web Apps (Free)             $0/month
────────────────────────────────────────────
TOTAL                              ~$30/month
```

### Production Environment
```
App Service (Basic B1)             $13/month
PostgreSQL (Basic 2vCore)          $50/month
Azure OpenAI (moderate usage)      $30/month
Static Web Apps (Standard)         $9/month
Application Insights               $5/month
Key Vault                          $1/month
────────────────────────────────────────────
TOTAL                              ~$108/month
```

### Enterprise Environment
```
App Service (Standard S1 x2)       $144/month
PostgreSQL (General Purpose)       $200/month
Azure OpenAI (high usage)          $100/month
Static Web Apps (Standard)         $9/month
Application Insights               $20/month
Azure CDN                          $10/month
────────────────────────────────────────────
TOTAL                              ~$483/month
```

---

## 🎯 Resource Naming Convention

```
Resource Group:    rg-codemuse-{env}
App Service Plan:  plan-codemuse-{env}
App Service:       app-codemuse-api-{env}
Static Web App:    swa-codemuse-{env}
PostgreSQL:        psql-codemuse-{env}
Azure OpenAI:      aoai-codemuse-{env}
Key Vault:         kv-codemuse-{env}-{random}
Storage Account:   stcodemuse{env}{random}
App Insights:      appi-codemuse-{env}

Where {env} = dev, staging, prod
```

---

## 📝 Quick Links

### Azure Portal
- Resource Group: `https://portal.azure.com/#@/resource/subscriptions/{sub-id}/resourceGroups/rg-codemuse-prod`
- App Service: `https://portal.azure.com/#@/resource/subscriptions/{sub-id}/resourceGroups/rg-codemuse-prod/providers/Microsoft.Web/sites/{app-name}`
- Database: `https://portal.azure.com/#@/resource/subscriptions/{sub-id}/resourceGroups/rg-codemuse-prod/providers/Microsoft.DBforPostgreSQL/flexibleServers/{db-name}`

### Azure DevOps
- Project: `https://dev.azure.com/CodeMuseOrg/CodeMuseBoard`
- Pipelines: `https://dev.azure.com/CodeMuseOrg/CodeMuseBoard/_build`
- Releases: `https://dev.azure.com/CodeMuseOrg/CodeMuseBoard/_release`

### Monitoring
- App Insights: `https://portal.azure.com/#blade/AppInsightsExtension/QuickPulseBladeV2/ComponentId/{resource-id}`
- Metrics: `https://portal.azure.com/#blade/Microsoft_Azure_Monitoring/AzureMonitoringBrowseBlade/metrics`

---

## 🔐 Security Checklist

- [ ] Enable HTTPS only
- [ ] Configure CORS properly
- [ ] Use Key Vault for secrets
- [ ] Enable managed identities
- [ ] Configure firewall rules
- [ ] Enable SSL/TLS 1.2+
- [ ] Set up Azure AD authentication
- [ ] Enable diagnostic logs
- [ ] Configure backup retention
- [ ] Set up security alerts

---

## 📞 Emergency Contacts

### Critical Issues
1. Check Azure Status: https://status.azure.com
2. View service health in Azure Portal
3. Contact Azure Support: https://azure.microsoft.com/support/options/

### Common Support Scenarios
- **Deployment Failed**: Check pipeline logs, verify credentials
- **High Costs**: Review Azure Cost Management + Billing
- **Performance Issues**: Check Application Insights, scale resources
- **Security Concern**: Review Azure Security Center recommendations

---

## 🎓 Learning Resources

### Azure Documentation
- [Azure App Service](https://docs.microsoft.com/azure/app-service/)
- [Azure Static Web Apps](https://docs.microsoft.com/azure/static-web-apps/)
- [Azure Database for PostgreSQL](https://docs.microsoft.com/azure/postgresql/)
- [Azure OpenAI](https://docs.microsoft.com/azure/cognitive-services/openai/)
- [Azure DevOps](https://docs.microsoft.com/azure/devops/)

### Tutorials
- [Deploy Node.js to Azure](https://docs.microsoft.com/azure/app-service/quickstart-nodejs)
- [Deploy React to Static Web Apps](https://docs.microsoft.com/azure/static-web-apps/getting-started)
- [Setup CI/CD Pipeline](https://docs.microsoft.com/azure/devops/pipelines/get-started/)

---

**Last Updated**: October 20, 2025
**Quick Reference Version**: 1.0.0
