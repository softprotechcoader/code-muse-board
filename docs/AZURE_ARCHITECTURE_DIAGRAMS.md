# Azure Architecture & CI/CD Flow Diagrams

## 🏗️ Azure Architecture

### Overall System Architecture
```
┌─────────────────────────────────────────────────────────────────────┐
│                          INTERNET / USERS                            │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      Azure Front Door (Optional)                     │
│                    Global Load Balancer + WAF                        │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
                ┌──────────┴──────────┐
                │                     │
                ▼                     ▼
┌───────────────────────┐   ┌───────────────────────┐
│  Azure Static Web App │   │   Azure CDN (Optional)│
│  ──────────────────── │   │   ──────────────────  │
│  Frontend (React)     │   │   Static Assets       │
│  • HTML/CSS/JS        │   │   • Images            │
│  • Vite Build         │   │   • Fonts             │
│  • Route Management   │   │   • Global Cache      │
└──────────┬────────────┘   └───────────────────────┘
           │
           │ HTTPS/WSS
           │
           ▼
┌───────────────────────────────────────────────────────┐
│          Azure App Service (Backend)                  │
│          ─────────────────────────────                │
│          • Node.js + Express                          │
│          • REST API Endpoints                         │
│          • Socket.io (Real-time)                      │
│          • Authentication                             │
│          • Business Logic                             │
└──┬──────────┬──────────┬──────────┬─────────┬────────┘
   │          │          │          │         │
   │          │          │          │         │
   ▼          ▼          ▼          ▼         ▼
┌────────┐ ┌─────────┐ ┌─────────┐ ┌────────┐ ┌──────────────┐
│ Azure  │ │ Azure   │ │ Azure   │ │ Azure  │ │ Application  │
│ Key    │ │ Database│ │ OpenAI  │ │ Storage│ │ Insights     │
│ Vault  │ │ for     │ │ Service │ │ Account│ │              │
│        │ │ PostgreSQL│         │ │        │ │ • Monitoring │
│ • API  │ │         │ │ GPT-4o  │ │ • Logs │ │ • Analytics  │
│ Keys   │ │ • User  │ │ mini    │ │ • Files│ │ • Alerts     │
│ • Conn │ │ Data    │ │         │ │ • Backup│ │ • Dashboards│
│ Strings│ │ • Chat  │ │ • AI    │ │        │ │              │
│        │ │ • History│ │ Chat   │ │        │ │              │
└────────┘ └─────────┘ └─────────┘ └────────┘ └──────────────┘
```

### Detailed Component Breakdown

#### 1. Frontend Layer
```
┌──────────────────────────────────────────────────────────┐
│              Azure Static Web App                        │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐       │
│  │ Dashboard  │  │  Tracker   │  │  Skill Up  │       │
│  │            │  │            │  │            │       │
│  │ • Tech News│  │ • AI Tasks │  │ • Roadmaps │       │
│  │ • Overview │  │ • Progress │  │ • AI Chat  │       │
│  └────────────┘  └────────────┘  └────────────┘       │
│                                                          │
│  ┌────────────┐  ┌────────────┐                        │
│  │  History   │  │  AI Chat   │                        │
│  │            │  │            │                        │
│  │ • Records  │  │ • Azure AI │                        │
│  │ • Tracking │  │ • Context  │                        │
│  └────────────┘  └────────────┘                        │
│                                                          │
│  Components:                                            │
│  • React Router (SPA Routing)                          │
│  • shadcn/ui (UI Components)                           │
│  • Socket.io Client (Real-time)                        │
│  • React Query (Data Fetching)                         │
│  • Tailwind CSS (Styling)                              │
└──────────────────────────────────────────────────────────┘
```

#### 2. Backend Layer
```
┌────────────────────────────────────────────────────────────┐
│              Azure App Service (Node.js)                   │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ┌──────────────────────────────────────────────────────┐ │
│  │            Express.js Application                     │ │
│  ├──────────────────────────────────────────────────────┤ │
│  │                                                       │ │
│  │  API Routes:                                         │ │
│  │  • /api/news         → News Service                  │ │
│  │  • /api/chat         → Team Chat + AI Chat          │ │
│  │  • /api/roadmap      → Roadmap Management           │ │
│  │  • /api/tracker      → Task Tracking                │ │
│  │  • /api/skillup      → Skill Roadmaps + AI          │ │
│  │  • /api/activity     → Activity Logs                │ │
│  │                                                       │ │
│  │  Services:                                           │ │
│  │  • newsService.js    → Fetch tech news              │ │
│  │  • trackerAIService.ts → AI task generation         │ │
│  │  • skillUpAIService.ts → AI roadmap customization   │ │
│  │                                                       │ │
│  │  Middleware:                                         │ │
│  │  • CORS              → Cross-origin requests        │ │
│  │  • Helmet            → Security headers             │ │
│  │  • Rate Limiting     → API protection               │ │
│  │  • Compression       → Response optimization        │ │
│  │  • Error Handler     → Centralized error handling   │ │
│  │                                                       │ │
│  │  Real-time:                                          │ │
│  │  • Socket.io Server  → WebSocket connections        │ │
│  │  • Team Collaboration → Shared sessions             │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
│  Configuration:                                           │
│  • Runtime: Node.js 18 LTS                               │
│  • Platform: Linux                                       │
│  • Always On: Enabled                                    │
│  • WebSockets: Enabled                                   │
│  • Auto-scaling: Based on CPU/Memory                     │
└────────────────────────────────────────────────────────────┘
```

#### 3. Database Layer
```
┌────────────────────────────────────────────────────────────┐
│         Azure Database for PostgreSQL                      │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  Tables (via Prisma):                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │ ChatMessage  │  │ Activity     │  │ Roadmap      │   │
│  │──────────────│  │──────────────│  │──────────────│   │
│  │ id           │  │ id           │  │ id           │   │
│  │ content      │  │ action       │  │ technology   │   │
│  │ username     │  │ timestamp    │  │ steps        │   │
│  │ roomId       │  │ userId       │  │ progress     │   │
│  │ timestamp    │  │ metadata     │  │ createdAt    │   │
│  └──────────────┘  └──────────────┘  └──────────────┘   │
│                                                            │
│  Features:                                                │
│  • Automated backups (7-day retention)                    │
│  • Point-in-time restore                                  │
│  • Geo-redundant storage                                  │
│  • SSL/TLS encryption                                     │
│  • Connection pooling                                     │
│  • Read replicas (optional)                               │
│                                                            │
│  Configuration:                                           │
│  • Tier: Basic/General Purpose                           │
│  • Version: PostgreSQL 14                                │
│  • Storage: 32-512 GB                                     │
│  • Compute: 1-64 vCores                                   │
└────────────────────────────────────────────────────────────┘
```

#### 4. AI Services Layer
```
┌────────────────────────────────────────────────────────────┐
│            Azure OpenAI Service                            │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  Deployments:                                             │
│  ┌──────────────────────────────────────────────────────┐ │
│  │  GPT-4o-mini (gpt-4o-mini)                          │ │
│  │  ─────────────────────────────────                   │ │
│  │  • Model: gpt-4o                                     │ │
│  │  • Version: 2024-08-01                               │ │
│  │  • Capacity: 10-100 TPM                              │ │
│  │  • Temperature: 0.7                                  │ │
│  │  • Max Tokens: 2000-3500                             │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
│  Use Cases:                                               │
│  • AI Chat (General purpose assistant)                    │
│  • SkillUp Roadmap Customization                         │
│  • Tracker Task Generation                               │
│  • Code explanations                                      │
│  • Learning recommendations                               │
│                                                            │
│  Features:                                                │
│  • Structured JSON output                                │
│  • Conversation context (10 messages)                    │
│  • Fallback responses                                    │
│  • Rate limiting                                         │
│  • Token usage tracking                                  │
└────────────────────────────────────────────────────────────┘
```

#### 5. Security & Secrets Layer
```
┌────────────────────────────────────────────────────────────┐
│              Azure Key Vault                               │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  Secrets:                                                 │
│  • DatabaseConnectionString                               │
│  • AzureOpenAIKey                                         │
│  • AzureOpenAIEndpoint                                    │
│  • JWTSecret (if using auth)                             │
│  • ExternalAPIKeys                                        │
│                                                            │
│  Access:                                                  │
│  • App Service (via Managed Identity)                    │
│  • Azure DevOps (via Service Principal)                  │
│  • Developers (with limited permissions)                 │
│                                                            │
│  Features:                                                │
│  • Secret versioning                                      │
│  • Audit logs                                            │
│  • Automated rotation                                     │
│  • Access policies                                        │
└────────────────────────────────────────────────────────────┘
```

#### 6. Monitoring Layer
```
┌────────────────────────────────────────────────────────────┐
│          Application Insights                              │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  Monitoring:                                              │
│  • Request/Response times                                 │
│  • Failed requests                                        │
│  • Dependencies (DB, OpenAI)                             │
│  • Custom events (AI usage)                              │
│  • User sessions                                          │
│  • Page views                                            │
│                                                            │
│  Dashboards:                                              │
│  ┌─────────────────┐  ┌─────────────────┐              │
│  │ Performance     │  │ Usage           │              │
│  │ • Response time │  │ • Active users  │              │
│  │ • Throughput    │  │ • API calls     │              │
│  │ • Error rate    │  │ • AI requests   │              │
│  └─────────────────┘  └─────────────────┘              │
│                                                            │
│  Alerts:                                                  │
│  • High CPU (>80%)                                        │
│  • High Memory (>80%)                                     │
│  • Slow response (>3s)                                    │
│  • Error spike (>10 errors/min)                          │
│  • OpenAI rate limit                                      │
└────────────────────────────────────────────────────────────┘
```

---

## 🔄 CI/CD Pipeline Flow

### Complete DevOps Workflow
```
┌─────────────────────────────────────────────────────────────────┐
│                    DEVELOPER WORKFLOW                            │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
            ┌────────────────┐
            │ Git Push       │
            │ to Branch      │
            │ (AiChat/main)  │
            └────────┬───────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│              AZURE DEVOPS PIPELINE TRIGGER                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Trigger Conditions:                                            │
│  • Branch: AiChat or main                                       │
│  • Path filters: src/**, server.js, package.json               │
│  • Manual trigger allowed                                       │
└─────────────────┬───────────────────────────────────────────────┘
                  │
        ┌─────────┴─────────┐
        │                   │
        ▼                   ▼
┌──────────────┐    ┌──────────────┐
│   BACKEND    │    │   FRONTEND   │
│   PIPELINE   │    │   PIPELINE   │
└──────┬───────┘    └──────┬───────┘
       │                   │
       │                   │
       ▼                   ▼
```

### Backend Pipeline Detailed Flow
```
┌────────────────────────────────────────────────────────────────┐
│                     STAGE 1: BUILD                              │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Step 1: Setup Environment                                     │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ • Install Node.js 18.x                                  │  │
│  │ • Checkout code from repository                         │  │
│  │ • Restore npm package cache                             │  │
│  └─────────────────────────────────────────────────────────┘  │
│                          ↓                                      │
│  Step 2: Install Dependencies                                  │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ npm install                                             │  │
│  │ • Download all packages from package.json               │  │
│  │ • Verify package integrity                              │  │
│  └─────────────────────────────────────────────────────────┘  │
│                          ↓                                      │
│  Step 3: Code Quality Checks                                   │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ npm run lint                                            │  │
│  │ • ESLint validation                                     │  │
│  │ • TypeScript type checking                              │  │
│  │ • Code style verification                               │  │
│  └─────────────────────────────────────────────────────────┘  │
│                          ↓                                      │
│  Step 4: Generate Prisma Client                                │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ npx prisma generate                                     │  │
│  │ • Create database client from schema                    │  │
│  │ • Generate TypeScript types                             │  │
│  └─────────────────────────────────────────────────────────┘  │
│                          ↓                                      │
│  Step 5: Run Tests (Optional)                                  │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ npm test                                                │  │
│  │ • Unit tests                                            │  │
│  │ • Integration tests                                     │  │
│  │ • Generate coverage report                              │  │
│  └─────────────────────────────────────────────────────────┘  │
│                          ↓                                      │
│  Step 6: Create Deployment Package                             │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ • Archive all files to ZIP                              │  │
│  │ • Include node_modules                                  │  │
│  │ • Include Prisma generated client                       │  │
│  │ • Exclude: .git, tests, .env files                      │  │
│  └─────────────────────────────────────────────────────────┘  │
│                          ↓                                      │
│  Step 7: Publish Build Artifact                                │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ • Upload ZIP to pipeline artifacts                      │  │
│  │ • Name: backend-drop                                    │  │
│  │ • Make available for deployment stage                   │  │
│  └─────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────┘
                          ↓
┌────────────────────────────────────────────────────────────────┐
│                   STAGE 2: DEPLOY                               │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Step 1: Environment Approval (Production Only)                │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ • Wait for manual approval                              │  │
│  │ • Check branch policy (main only)                       │  │
│  │ • Verify 2 approvers                                    │  │
│  └─────────────────────────────────────────────────────────┘  │
│                          ↓                                      │
│  Step 2: Download Build Artifact                               │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ • Download backend-drop.zip                             │  │
│  │ • Verify integrity                                      │  │
│  └─────────────────────────────────────────────────────────┘  │
│                          ↓                                      │
│  Step 3: Deploy to App Service                                 │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ • Connect to Azure (service principal)                  │  │
│  │ • Stop App Service (zero-downtime via slot)            │  │
│  │ • Upload ZIP package                                    │  │
│  │ • Extract files                                         │  │
│  │ • Install dependencies (if needed)                      │  │
│  │ • Start App Service                                     │  │
│  └─────────────────────────────────────────────────────────┘  │
│                          ↓                                      │
│  Step 4: Configure App Settings                                │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ • Set DATABASE_URL                                      │  │
│  │ • Set AZURE_OPENAI_API_KEY                              │  │
│  │ • Set AZURE_OPENAI_ENDPOINT                             │  │
│  │ • Set NODE_ENV=production                               │  │
│  │ • Enable WebSockets                                     │  │
│  └─────────────────────────────────────────────────────────┘  │
│                          ↓                                      │
│  Step 5: Run Database Migrations                               │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ npx prisma migrate deploy                               │  │
│  │ • Apply pending migrations                              │  │
│  │ • Update database schema                                │  │
│  │ • Rollback on failure                                   │  │
│  └─────────────────────────────────────────────────────────┘  │
│                          ↓                                      │
│  Step 6: Health Check                                          │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ • Wait 30 seconds for warmup                            │  │
│  │ • Call /health endpoint                                 │  │
│  │ • Verify 200 OK response                                │  │
│  │ • Rollback if health check fails                        │  │
│  └─────────────────────────────────────────────────────────┘  │
│                          ↓                                      │
│  Step 7: Swap Deployment Slot (Production)                     │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ • Swap staging slot to production                       │  │
│  │ • Zero-downtime deployment                              │  │
│  │ • Keep old version in staging for rollback              │  │
│  └─────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────┘
                          ↓
┌────────────────────────────────────────────────────────────────┐
│                  STAGE 3: POST-DEPLOYMENT                       │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  • Send notification (Teams/Email/Slack)                       │
│  • Update deployment status in Azure DevOps                    │
│  • Tag Git commit with deployment version                      │
│  • Trigger smoke tests (optional)                              │
│  • Update Application Insights annotations                     │
└────────────────────────────────────────────────────────────────┘
```

### Frontend Pipeline Detailed Flow
```
┌────────────────────────────────────────────────────────────────┐
│                     STAGE 1: BUILD                              │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Step 1: Setup Environment                                     │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ • Install Node.js 18.x                                  │  │
│  │ • Checkout code                                         │  │
│  └─────────────────────────────────────────────────────────┘  │
│                          ↓                                      │
│  Step 2: Install Dependencies                                  │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ npm install                                             │  │
│  └─────────────────────────────────────────────────────────┘  │
│                          ↓                                      │
│  Step 3: Create Production Environment File                    │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ echo "VITE_API_URL=https://backend.url" > .env.prod    │  │
│  │ echo "VITE_SOCKET_URL=https://backend.url" >> .env.prod│  │
│  └─────────────────────────────────────────────────────────┘  │
│                          ↓                                      │
│  Step 4: Build React Application                               │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ npm run build                                           │  │
│  │ • Vite bundling                                         │  │
│  │ • Code splitting                                        │  │
│  │ • Minification                                          │  │
│  │ • Tree shaking                                          │  │
│  │ • Asset optimization                                    │  │
│  │ Output: dist/ folder                                    │  │
│  └─────────────────────────────────────────────────────────┘  │
│                          ↓                                      │
│  Step 5: Publish Build Artifact                                │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ • Upload dist/ folder                                   │  │
│  │ • Name: frontend-drop                                   │  │
│  └─────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────┘
                          ↓
┌────────────────────────────────────────────────────────────────┐
│                   STAGE 2: DEPLOY                               │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Step 1: Download Build Artifact                               │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ • Download frontend-drop                                │  │
│  └─────────────────────────────────────────────────────────┘  │
│                          ↓                                      │
│  Step 2: Deploy to Static Web Apps                             │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ • Authenticate with deployment token                    │  │
│  │ • Upload static files to Azure                          │  │
│  │ • Configure routes (staticwebapp.config.json)           │  │
│  │ • Update CDN cache                                      │  │
│  │ • Global distribution                                   │  │
│  └─────────────────────────────────────────────────────────┘  │
│                          ↓                                      │
│  Step 3: Verify Deployment                                     │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ • Check deployment status                               │  │
│  │ • Test homepage load                                    │  │
│  │ • Verify routing works                                  │  │
│  └─────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────┘
```

### Deployment Strategies

#### Blue-Green Deployment
```
┌─────────────────────────────────────────────────────────────┐
│                   BLUE-GREEN DEPLOYMENT                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Current State:                                             │
│  ┌──────────────┐         ┌──────────────┐                │
│  │ BLUE (v1.0)  │ ◄───────┤ 100% Traffic │                │
│  │ Production   │         └──────────────┘                │
│  └──────────────┘                                          │
│                                                              │
│  ┌──────────────┐                                          │
│  │ GREEN (v1.1) │                                          │
│  │ Staging      │  ← Deploy new version                   │
│  └──────────────┘                                          │
│                                                              │
│  After Testing:                                             │
│  ┌──────────────┐                                          │
│  │ BLUE (v1.0)  │                                          │
│  │ Staging      │  ← Kept for rollback                    │
│  └──────────────┘                                          │
│                                                              │
│  ┌──────────────┐         ┌──────────────┐                │
│  │ GREEN (v1.1) │ ◄───────┤ 100% Traffic │                │
│  │ Production   │         └──────────────┘                │
│  └──────────────┘                                          │
│                                                              │
│  Benefits:                                                  │
│  • Zero downtime                                           │
│  • Instant rollback                                        │
│  • Test in production-like environment                     │
└─────────────────────────────────────────────────────────────┘
```

#### Canary Deployment
```
┌─────────────────────────────────────────────────────────────┐
│                   CANARY DEPLOYMENT                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Phase 1: Initial Rollout (5% traffic)                      │
│  ┌──────────────┐         ┌──────────────┐                │
│  │ v1.0         │ ◄───────┤  95% Traffic │                │
│  └──────────────┘         └──────────────┘                │
│                                                              │
│  ┌──────────────┐         ┌──────────────┐                │
│  │ v1.1 (Canary)│ ◄───────┤   5% Traffic │                │
│  └──────────────┘         └──────────────┘                │
│                               ↓                              │
│                        Monitor metrics                       │
│                        (error rate, latency)                │
│                               ↓                              │
│  Phase 2: Gradual Increase (50% traffic)                    │
│  ┌──────────────┐         ┌──────────────┐                │
│  │ v1.0         │ ◄───────┤  50% Traffic │                │
│  └──────────────┘         └──────────────┘                │
│                                                              │
│  ┌──────────────┐         ┌──────────────┐                │
│  │ v1.1         │ ◄───────┤  50% Traffic │                │
│  └──────────────┘         └──────────────┘                │
│                               ↓                              │
│  Phase 3: Full Rollout (100% traffic)                       │
│  ┌──────────────┐         ┌──────────────┐                │
│  │ v1.1         │ ◄───────┤ 100% Traffic │                │
│  └──────────────┘         └──────────────┘                │
│                                                              │
│  Benefits:                                                  │
│  • Risk mitigation                                         │
│  • Real user testing                                       │
│  • Easy rollback at any phase                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔒 Security Flow

### Authentication & Authorization
```
┌─────────────────────────────────────────────────────────────┐
│                   SECURITY ARCHITECTURE                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  User Request                                               │
│       ↓                                                      │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Azure Front Door (Optional)                         │   │
│  │ • WAF (Web Application Firewall)                    │   │
│  │ • DDoS Protection                                   │   │
│  │ • SSL/TLS Termination                               │   │
│  └─────────────────────┬───────────────────────────────┘   │
│                        ↓                                     │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ App Service                                         │   │
│  │ • HTTPS Only                                        │   │
│  │ • TLS 1.2+                                          │   │
│  │ • CORS Configuration                                │   │
│  │ • Rate Limiting                                     │   │
│  └─────────────────────┬───────────────────────────────┘   │
│                        ↓                                     │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Authentication Middleware                           │   │
│  │ • Azure AD (Optional)                               │   │
│  │ • JWT Validation                                    │   │
│  │ • Session Management                                │   │
│  └─────────────────────┬───────────────────────────────┘   │
│                        ↓                                     │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Authorization                                       │   │
│  │ • Role-based access control                         │   │
│  │ • Resource permissions                              │   │
│  └─────────────────────┬───────────────────────────────┘   │
│                        ↓                                     │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Business Logic                                      │   │
│  │ • Input validation                                  │   │
│  │ • SQL injection prevention (Prisma)                 │   │
│  │ • XSS protection                                    │   │
│  └─────────────────────┬───────────────────────────────┘   │
│                        ↓                                     │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Data Access                                         │   │
│  │ • Encrypted connections                             │   │
│  │ • Parameterized queries                             │   │
│  │ • Principle of least privilege                      │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Secrets Management Flow
```
┌─────────────────────────────────────────────────────────────┐
│               SECRETS MANAGEMENT FLOW                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Development:                                               │
│  .env file → Environment Variables → Application           │
│  (Local only, never committed)                              │
│                                                              │
│  Production:                                                │
│  Azure Key Vault → App Service (Managed Identity) → App    │
│                                                              │
│  Flow:                                                      │
│  1. Store secret in Key Vault                              │
│  2. Grant App Service managed identity access              │
│  3. App Service automatically injects secrets              │
│  4. Application reads from environment variables            │
│                                                              │
│  Benefits:                                                  │
│  • No secrets in code                                      │
│  • Automatic rotation                                      │
│  • Audit logging                                           │
│  • Centralized management                                  │
└─────────────────────────────────────────────────────────────┘
```

---

**Last Updated**: October 20, 2025
**Architecture Version**: 1.0.0
