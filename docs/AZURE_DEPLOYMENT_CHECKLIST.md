# Azure Deployment Checklist

## 📋 Pre-Deployment Checklist

### Azure Account & Subscription
- [ ] Azure account created and verified
- [ ] Active subscription with sufficient credits
- [ ] Subscription set as default: `az account set --subscription "name"`
- [ ] Resource provider registered: Microsoft.Web, Microsoft.DBforPostgreSQL, Microsoft.CognitiveServices
- [ ] Budget alerts configured
- [ ] Cost management dashboard reviewed

### Development Environment
- [ ] Azure CLI installed (version 2.50+)
- [ ] Node.js 18+ installed
- [ ] Git installed and configured
- [ ] VS Code installed (recommended)
- [ ] Azure CLI logged in: `az login`
- [ ] Correct subscription selected

### Code Preparation
- [ ] All code committed to Git
- [ ] `.gitignore` configured properly
- [ ] Environment variables documented
- [ ] Database schema finalized (Prisma schema)
- [ ] All dependencies in `package.json`
- [ ] Build script tested locally: `npm run build`
- [ ] Linting passes: `npm run lint`
- [ ] No hardcoded secrets in code

### Azure DevOps (for CI/CD)
- [ ] Azure DevOps organization created
- [ ] Project created
- [ ] Repository imported/connected
- [ ] Service connection to Azure subscription configured
- [ ] PAT (Personal Access Token) created if needed

---

## 🏗️ Infrastructure Setup Checklist

### Resource Group
- [ ] Resource group created
- [ ] Naming convention: `rg-codemuse-{env}`
- [ ] Location selected (e.g., East US, West Europe)
- [ ] Tags applied (Environment, Project, Owner, CostCenter)

### Database (PostgreSQL)
- [ ] Server created with unique name
- [ ] Admin credentials saved securely
- [ ] Firewall rules configured
  - [ ] Allow Azure services (0.0.0.0)
  - [ ] Allow dev IP (optional)
- [ ] SSL enforcement enabled
- [ ] Backup retention configured (7-35 days)
- [ ] Database created: `codemuse_db`
- [ ] Connection string tested
- [ ] Prisma migrations ready

### Azure OpenAI
- [ ] Service created in supported region (East US, West Europe)
- [ ] GPT-4o-mini model deployed
- [ ] Deployment name noted: `gpt-4o-mini`
- [ ] API key retrieved and saved
- [ ] Endpoint URL noted
- [ ] Capacity configured (10-100 TPM)
- [ ] Test API call successful

### Key Vault
- [ ] Key Vault created with unique name
- [ ] Naming: `kv-codemuse-{env}-{random}`
- [ ] Soft delete enabled
- [ ] Purge protection enabled (production)
- [ ] Secrets added:
  - [ ] DatabaseConnectionString
  - [ ] AzureOpenAIKey
  - [ ] AzureOpenAIEndpoint
- [ ] Access policies configured
- [ ] App Service managed identity granted access

### Storage Account (Optional)
- [ ] Storage account created
- [ ] Naming: `stcodemuse{env}{random}`
- [ ] Container created for backups
- [ ] Blob access level configured
- [ ] Connection string saved

---

## 🚀 Backend Deployment Checklist

### App Service Plan
- [ ] Plan created
- [ ] Naming: `plan-codemuse-{env}`
- [ ] Tier selected (F1/B1/S1/P1V2)
- [ ] Linux OS selected
- [ ] Region matches other resources
- [ ] Auto-scaling configured (optional)

### App Service (Backend)
- [ ] Web app created
- [ ] Naming: `app-codemuse-api-{env}`
- [ ] Runtime: Node.js 18 LTS
- [ ] Deployment configured
  - [ ] Git/GitHub/Azure DevOps connected
  - [ ] Deployment slots created (staging)
- [ ] Environment variables configured:
  - [ ] DATABASE_URL
  - [ ] AZURE_OPENAI_API_KEY
  - [ ] AZURE_OPENAI_ENDPOINT
  - [ ] AZURE_OPENAI_DEPLOYMENT
  - [ ] NODE_ENV=production
  - [ ] PORT=8080
- [ ] Application settings:
  - [ ] WebSockets enabled
  - [ ] Always On enabled (for paid tiers)
  - [ ] HTTPS only enforced
  - [ ] TLS version: 1.2+
- [ ] CORS configured
  - [ ] Frontend URL whitelisted
- [ ] Managed identity enabled
- [ ] Connected to Key Vault
- [ ] Startup command configured (if needed): `node server.js`

### Database Migration
- [ ] Prisma client generated: `npx prisma generate`
- [ ] Migrations deployed: `npx prisma migrate deploy`
- [ ] Database seeded (if needed)
- [ ] Tables verified in Azure portal

### Backend Testing
- [ ] Health endpoint accessible: `/health`
- [ ] API endpoints working:
  - [ ] GET `/api/news`
  - [ ] POST `/api/chat/ai`
  - [ ] GET `/api/roadmap`
  - [ ] GET `/api/tracker`
  - [ ] POST `/api/skillup/chat`
- [ ] WebSocket connection working
- [ ] Error responses proper (4xx, 5xx)
- [ ] Logs visible in Azure Portal
- [ ] No errors in Application Insights

---

## 🎨 Frontend Deployment Checklist

### Static Web App
- [ ] Static Web App created
- [ ] Naming: `swa-codemuse-{env}`
- [ ] Repository connected (GitHub/Azure DevOps)
- [ ] Branch configured (AiChat/main)
- [ ] Build configuration:
  - [ ] app_location: `/`
  - [ ] output_location: `dist`
  - [ ] skip_app_build: false
- [ ] Deployment token saved securely
- [ ] Custom domain configured (optional)
  - [ ] DNS CNAME record added
  - [ ] SSL certificate validated

### Frontend Configuration
- [ ] `.env.production` file created:
  ```env
  VITE_API_URL=https://backend-url.azurewebsites.net
  VITE_SOCKET_URL=https://backend-url.azurewebsites.net
  ```
- [ ] `staticwebapp.config.json` created
- [ ] Routes configured properly
- [ ] Navigation fallback set to `/index.html`
- [ ] MIME types configured
- [ ] Security headers set

### Frontend Build
- [ ] Build successful locally: `npm run build`
- [ ] Dist folder generated
- [ ] Assets optimized (images, fonts)
- [ ] Bundle size acceptable (<500KB per chunk)
- [ ] No console errors in production build

### Frontend Testing
- [ ] Homepage loads successfully
- [ ] All routes accessible:
  - [ ] /
  - [ ] /tracker
  - [ ] /skillup
  - [ ] /history
  - [ ] /ai-chat
- [ ] API calls working (check Network tab)
- [ ] WebSocket connection established
- [ ] No CORS errors
- [ ] Images and assets load
- [ ] Mobile responsive
- [ ] Browser compatibility (Chrome, Firefox, Safari, Edge)

---

## 🔄 CI/CD Pipeline Checklist

### Azure DevOps Setup
- [ ] Organization created
- [ ] Project created
- [ ] Repository connected
- [ ] Service connection configured
- [ ] Agent pool selected (Microsoft-hosted or self-hosted)

### Variable Group
- [ ] Variable group created: `codemuse-prod-vars`
- [ ] Variables added:
  - [ ] RESOURCE_GROUP
  - [ ] BACKEND_APP_NAME
  - [ ] FRONTEND_APP_NAME
  - [ ] DATABASE_URL (from Key Vault)
  - [ ] AZURE_OPENAI_API_KEY (from Key Vault)
  - [ ] AZURE_OPENAI_ENDPOINT (from Key Vault)
  - [ ] AZURE_STATIC_WEB_APPS_API_TOKEN
- [ ] Key Vault integration configured
- [ ] Permissions set (restrict to admins)

### Pipeline Files
- [ ] `azure-pipelines-backend.yml` created
- [ ] `azure-pipelines-frontend.yml` created
- [ ] Trigger conditions configured
- [ ] Path filters set
- [ ] Build steps defined
- [ ] Deployment steps defined
- [ ] Artifact publishing configured

### Environments
- [ ] Development environment created
- [ ] Staging environment created
- [ ] Production environment created
- [ ] Approval gates configured for production:
  - [ ] Manual approval required
  - [ ] 2 reviewers minimum
  - [ ] Branch control (main only)
- [ ] Environment variables set per environment

### Pipeline Testing
- [ ] Backend pipeline runs successfully
- [ ] Frontend pipeline runs successfully
- [ ] Build artifacts created
- [ ] Deployment successful
- [ ] Post-deployment tests pass
- [ ] Notifications working (email/Teams/Slack)

---

## 📊 Monitoring & Observability Checklist

### Application Insights
- [ ] Application Insights resource created
- [ ] Instrumentation key retrieved
- [ ] Backend connected to App Insights
- [ ] Frontend telemetry configured (optional)
- [ ] Custom events tracked:
  - [ ] AI Chat usage
  - [ ] Roadmap generation
  - [ ] Task tracking events
- [ ] Dashboards created:
  - [ ] Performance dashboard
  - [ ] Usage dashboard
  - [ ] Error dashboard

### Alerts & Notifications
- [ ] Alert rules created:
  - [ ] High CPU usage (>80%)
  - [ ] High memory usage (>80%)
  - [ ] Slow response time (>3s)
  - [ ] High error rate (>5%)
  - [ ] Failed requests spike
  - [ ] Database connection failures
  - [ ] OpenAI rate limit reached
- [ ] Action groups configured
- [ ] Email notifications set up
- [ ] SMS alerts configured (optional)
- [ ] Teams/Slack integration (optional)

### Logging
- [ ] App Service logs enabled:
  - [ ] Application logging (filesystem)
  - [ ] Web server logging
  - [ ] Detailed error messages
  - [ ] Failed request tracing
- [ ] Log retention configured (7-30 days)
- [ ] Log Analytics workspace connected
- [ ] Custom KQL queries saved:
  - [ ] Failed requests
  - [ ] Slow queries
  - [ ] Error patterns
  - [ ] AI usage metrics

---

## 🔒 Security Checklist

### Network Security
- [ ] HTTPS enforced on all services
- [ ] TLS 1.2+ configured
- [ ] CORS properly configured (no wildcard in production)
- [ ] Firewall rules restrict database access
- [ ] Private endpoints configured (optional)
- [ ] VNet integration set up (optional)
- [ ] NSG rules configured (if using VNet)

### Authentication & Authorization
- [ ] Azure AD integration configured (optional)
- [ ] Managed identities enabled
- [ ] RBAC roles assigned properly
- [ ] Service principals have minimum permissions
- [ ] API keys rotated regularly
- [ ] JWT secret strong and secure (if used)

### Data Security
- [ ] Database SSL/TLS enforced
- [ ] Encryption at rest enabled
- [ ] Backup encryption enabled
- [ ] Key Vault used for all secrets
- [ ] No secrets in code or config files
- [ ] Connection strings use Key Vault references

### Compliance & Policies
- [ ] Azure Policy applied to resource group
- [ ] Tags enforced (Environment, Owner, CostCenter)
- [ ] Resource locks applied to production resources
- [ ] Audit logging enabled
- [ ] Diagnostic settings configured
- [ ] Compliance dashboard reviewed

---

## 🔄 Backup & Recovery Checklist

### Database Backup
- [ ] Automated backups enabled
- [ ] Backup retention period set (7-35 days)
- [ ] Geo-redundant backup enabled (production)
- [ ] Point-in-time restore tested
- [ ] Backup restore procedure documented
- [ ] RTO (Recovery Time Objective) defined
- [ ] RPO (Recovery Point Objective) defined

### Application Backup
- [ ] App Service backup configured
- [ ] Storage account for backups created
- [ ] Backup schedule set (daily/weekly)
- [ ] Backup retention configured
- [ ] Restore procedure tested
- [ ] Backup files verified

### Disaster Recovery
- [ ] DR plan documented
- [ ] Failover regions identified
- [ ] Traffic Manager configured (optional)
- [ ] Data replication set up (optional)
- [ ] DR drill scheduled and executed
- [ ] Contact list for emergencies

---

## 💰 Cost Management Checklist

### Cost Tracking
- [ ] Azure Cost Management configured
- [ ] Budget created for project
- [ ] Budget alerts configured:
  - [ ] 50% of budget
  - [ ] 80% of budget
  - [ ] 100% of budget
- [ ] Cost analysis reviewed weekly
- [ ] Resource tags applied for cost allocation
- [ ] Showback/chargeback configured (enterprise)

### Cost Optimization
- [ ] Right-sized resources (not over-provisioned)
- [ ] Auto-scaling configured where appropriate
- [ ] Dev/test environments shut down after hours
- [ ] Reserved instances considered (for production)
- [ ] Azure Hybrid Benefit applied (if applicable)
- [ ] Unused resources identified and deleted
- [ ] Log retention optimized (not too long)

### Cost Estimates
- [ ] Monthly cost estimated per environment:
  - [ ] Development: $___
  - [ ] Staging: $___
  - [ ] Production: $___
- [ ] Total estimated: $___
- [ ] Budget approved by stakeholders
- [ ] Cost optimization opportunities identified

---

## 🧪 Testing Checklist

### Functional Testing
- [ ] All pages load correctly
- [ ] All features work as expected
- [ ] AI Chat responds properly
- [ ] Roadmap generation works
- [ ] Task tracking functional
- [ ] History tracking accurate
- [ ] Real-time features work (Socket.io)
- [ ] Forms submit correctly
- [ ] Error handling works

### Performance Testing
- [ ] Page load times acceptable (<3s)
- [ ] API response times acceptable (<1s)
- [ ] Database query performance good
- [ ] No memory leaks
- [ ] Bundle size optimized
- [ ] Images optimized
- [ ] CDN configured (optional)
- [ ] Load testing performed (100+ concurrent users)

### Security Testing
- [ ] SQL injection prevention tested
- [ ] XSS protection verified
- [ ] CSRF protection enabled
- [ ] Sensitive data not exposed in logs
- [ ] API rate limiting working
- [ ] Authentication/authorization working
- [ ] Security headers configured

### Browser/Device Testing
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Chrome
- [ ] Mobile Safari
- [ ] Tablet view
- [ ] Desktop (1920x1080)
- [ ] Laptop (1366x768)

---

## 📚 Documentation Checklist

### Technical Documentation
- [ ] Architecture diagram created
- [ ] API documentation complete
- [ ] Database schema documented
- [ ] Environment variables documented
- [ ] Deployment process documented
- [ ] Troubleshooting guide created
- [ ] Runbook for common operations

### Operational Documentation
- [ ] Monitoring dashboard explained
- [ ] Alert handling procedures
- [ ] Backup/restore procedures
- [ ] Disaster recovery plan
- [ ] Contact list (on-call, support)
- [ ] Escalation procedures
- [ ] Change management process

### User Documentation
- [ ] User guide created (optional)
- [ ] Feature descriptions
- [ ] Screenshots/videos
- [ ] FAQ section
- [ ] Support contact information

---

## ✅ Go-Live Checklist

### Final Pre-Launch
- [ ] All tests passed
- [ ] Performance benchmarks met
- [ ] Security audit completed
- [ ] Backup tested successfully
- [ ] Monitoring and alerts verified
- [ ] Documentation complete
- [ ] Team trained on operations
- [ ] Support process established
- [ ] Rollback plan ready
- [ ] Stakeholder approval obtained

### Launch Day
- [ ] Announce maintenance window (if needed)
- [ ] Final backup taken
- [ ] Production deployment executed
- [ ] Smoke tests passed
- [ ] Monitoring actively watched
- [ ] Support team on standby
- [ ] Users notified of launch

### Post-Launch (First 24 Hours)
- [ ] Monitor error rates
- [ ] Check performance metrics
- [ ] Review user feedback
- [ ] Verify backup completion
- [ ] Check cost dashboard
- [ ] Document any issues
- [ ] Plan hotfixes if needed

### Post-Launch (First Week)
- [ ] Daily monitoring reviews
- [ ] Performance optimization as needed
- [ ] User feedback collected
- [ ] Issues triaged and prioritized
- [ ] Documentation updated based on learnings
- [ ] Team retrospective held
- [ ] Celebrate success! 🎉

---

## 🚨 Rollback Checklist

### Preparation
- [ ] Previous version kept in deployment slot
- [ ] Database backup taken before migration
- [ ] Rollback plan documented
- [ ] Team aware of rollback triggers
- [ ] Monitoring in place to detect issues

### Rollback Triggers
- [ ] Error rate >10%
- [ ] Response time >5s
- [ ] Critical feature broken
- [ ] Database corruption
- [ ] Security vulnerability
- [ ] Stakeholder request

### Rollback Procedure
- [ ] Stop new deployments
- [ ] Notify team
- [ ] Swap deployment slots (backend)
- [ ] Redeploy previous frontend version
- [ ] Restore database if needed
- [ ] Verify rollback successful
- [ ] Monitor for stability
- [ ] Communicate to users
- [ ] Post-mortem scheduled

---

## 📞 Support & Maintenance

### Regular Maintenance Tasks
- [ ] **Daily**: Review monitoring dashboards
- [ ] **Daily**: Check error logs
- [ ] **Weekly**: Review cost dashboard
- [ ] **Weekly**: Security updates check
- [ ] **Monthly**: Performance optimization review
- [ ] **Monthly**: Backup restore test
- [ ] **Quarterly**: DR drill
- [ ] **Quarterly**: Security audit
- [ ] **Yearly**: Architecture review
- [ ] **Yearly**: Cost optimization review

### Contact Information
- **Azure Support**: https://azure.microsoft.com/support/
- **Emergency Hotline**: [Your number]
- **Team Lead**: [Name & Contact]
- **DevOps Engineer**: [Name & Contact]
- **Database Admin**: [Name & Contact]

---

## ✨ Success Criteria

Your deployment is successful when:
- ✅ All services running without errors
- ✅ Response times <1s for API, <3s for pages
- ✅ Error rate <1%
- ✅ 99.9% uptime achieved
- ✅ Monitoring and alerts working
- ✅ Backups running automatically
- ✅ Users can access all features
- ✅ Cost within budget
- ✅ Team confident in operations
- ✅ Documentation complete

---

**Last Updated**: October 20, 2025
**Checklist Version**: 1.0.0

**Remember**: Deployment is not the end—it's the beginning of continuous improvement! 🚀
