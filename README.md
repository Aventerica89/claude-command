# 🎛️ Claude Command (MC³)

**Multi-Claude Command Center** - A powerful dashboard for managing parallel Claude AI instances for automation, deployments, migrations, and development tasks.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen)

## 🌟 Features

### **Parallel Claude Management**
- 🤖 Run multiple Claude instances simultaneously
- 📊 Real-time progress tracking with live logs
- ⏸️ Pause/Resume/Stop individual sessions
- 🔄 Auto-recovery from failures

### **Smart API Key Management** 
- 🔐 Integration with [env-var-assistant](https://github.com/Aventerica89/env-var-assistant)
- 📋 Auto-detect API keys from clipboard
- 💾 Secure storage in 1Password
- 🔑 Provider-specific key loading (Cloudflare, Vercel, GitHub, etc.)

### **Task Templates**
- ⚡ Pre-built workflows for common tasks
- 📝 WordPress migrations (GridPane → xCloud)
- 🚀 Build & Deploy (Vercel, Cloudflare Workers)
- 🔍 Site analysis and audits
- 🔧 Code reviews and refactoring

### **AI Prompt Optimization**
- 🧠 Multi-model prompt optimization
- 🤖 Compare suggestions from Claude, Gemini, GPT-4
- 📈 Scoring and improvement tracking
- ✨ One-click prompt enhancement

### **Approval System**
- ⚠️ Risk assessment for dangerous operations
- 🛡️ Manual approval for destructive commands
- 📋 Context-aware command inspection
- 🔒 Safety-first approach

### **Developer Experience**
- 🎨 Beautiful, responsive UI
- 🔄 Real-time updates via SSE/WebSocket
- 📱 Mobile-friendly design
- ⚡ Floating action buttons for quick access

---

## 📋 Table of Contents

- [Quick Start](#-quick-start)
- [Demo](#-demo)
- [Installation](#-installation)
- [Architecture](#-architecture)
- [Usage](#-usage)
- [Configuration](#-configuration)
- [Integration: env-var-assistant](#-integration-env-var-assistant)
- [Deployment](#-deployment)
- [Development](#-development)
- [Contributing](#-contributing)

---

## 🚀 Quick Start

### **Prerequisites**
- Node.js 18+
- Docker & Docker Compose
- 1Password CLI (for API key management)
- Anthropic API key

### **One-Command Setup**

```bash
git clone https://github.com/yourusername/claude-command.git
cd claude-command
cp docker/.env.example docker/.env
# Edit docker/.env with your API keys
docker-compose -f docker/docker-compose.yml up -d
```

Open http://localhost:3000 and start managing Claude instances!

---

## 🎬 Demo

Try the **interactive HTML demo** first to see MC³ in action:

```bash
# Open in browser
open demo/mc3-dashboard-demo.html
```

**Demo Features:**
- ✅ Session management simulation
- ✅ Live log streaming
- ✅ Approval queue workflow
- ✅ Task templates
- ✅ AI prompt optimizer
- ✅ Floating action buttons

**Note:** Demo uses mock data. For real Claude API integration, deploy the full stack.

---

## 💻 Installation

### **Option 1: Local Development**

```bash
# Install dependencies
npm install

# Setup environment
cp docker/.env.example .env
# Edit .env with your keys

# Start development server
npm run dev

# In another terminal, start workers
npm run worker
```

### **Option 2: Docker (Recommended)**

```bash
# Full stack with all services
docker-compose -f docker/docker-compose.yml up -d

# Services available:
# - Dashboard: http://localhost:3000
# - n8n: http://localhost:5678
# - PostgreSQL: localhost:5432
# - Redis: localhost:6379
# - Uptime Kuma: http://localhost:3001
```

### **Option 3: Production Deployment**

See [SETUP.md](./SETUP.md) for complete Hetzner + xCloud deployment guide.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────┐
│         Web Dashboard (Next.js + React)         │
│  Session Grid | Approval Queue | Templates      │
└────────────────┬────────────────────────────────┘
                 │ HTTP/WebSocket
                 ▼
┌─────────────────────────────────────────────────┐
│          Backend API (Next.js Routes)           │
│  ClaudeManager | TaskQueue | SessionStore       │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│       Claude Workers (Anthropic SDK + MCP)      │
│  Worker #1 | Worker #2 | Worker #3 | Worker #4  │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│          Data Layer (PostgreSQL + Redis)        │
│  Sessions | Logs | Approvals | API Usage        │
└─────────────────────────────────────────────────┘
```

**Key Components:**

1. **Dashboard** - React UI for managing sessions
2. **API Routes** - tRPC endpoints for session control
3. **Claude Manager** - Orchestrates multiple Claude instances
4. **Workers** - Individual Claude sessions with tool access
5. **Task Queue** - BullMQ for background job processing
6. **MCP Integration** - env-var-assistant for API keys

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed design.

---

## 📖 Usage

### **1. Create a New Session**

```typescript
// Via UI: Click floating "+" button
// Or via API:
const session = await fetch('/api/sessions', {
  method: 'POST',
  body: JSON.stringify({
    name: 'WordPress Migration',
    taskType: 'migration',
    prompt: 'Migrate example.com from GridPane to xCloud'
  })
});
```

### **2. Monitor Progress**

- **Grid View**: See all active sessions at a glance
- **Log Viewer**: Real-time streaming logs
- **Progress Bars**: Visual progress indicators

### **3. Handle Approvals**

When Claude needs to run dangerous commands:

1. Session pauses automatically
2. Approval appears in queue
3. Review command & risk level
4. Approve or reject
5. Session continues or stops

### **4. Use Task Templates**

Pre-built templates for common workflows:

- **WordPress Migration**: GridPane → xCloud with backup
- **Build & Deploy**: Vercel or Cloudflare Workers
- **Site Analysis**: Performance, security, SEO audits
- **Code Review**: GitHub PR analysis

### **5. Optimize Prompts**

Click 🧠 **AI Prompt Optimizer**:

1. Enter your prompt
2. Get 3 AI-optimized versions
3. Compare scores and improvements
4. Select the best one
5. Use it for your task

---

## ⚙️ Configuration

### **Environment Variables**

```bash
# Anthropic
ANTHROPIC_API_KEY=sk-ant-xxxxx

# GitHub
GITHUB_TOKEN=ghp_xxxxx

# Vercel
VERCEL_TOKEN=xxxxx
VERCEL_ORG_ID=team_xxxxx

# Cloudflare
CLOUDFLARE_API_TOKEN=xxxxx
CLOUDFLARE_ACCOUNT_ID=xxxxx

# 1Password (for env-var-assistant)
OP_SERVICE_ACCOUNT_TOKEN=xxxxx

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/mc3
REDIS_URL=redis://localhost:6379

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

### **Docker Compose**

```yaml
services:
  dashboard:
    image: node:20
    ports: ["3000:3000"]
    
  postgres:
    image: postgres:16
    
  redis:
    image: redis:7
    
  n8n:
    image: n8nio/n8n
    
  env-var-assistant:
    build: ./env-var-assistant
```

---

## 🔐 Integration: env-var-assistant

MC³ integrates with [env-var-assistant](https://github.com/Aventerica89/env-var-assistant) for seamless API key management.

### **Features**

1. **Auto-Detection**: Copy API keys → Auto-detected
2. **1Password Storage**: Secure vault storage
3. **Auto-Loading**: Load keys when starting tasks
4. **Provider Mapping**: Smart provider detection

### **Setup**

```bash
# Install 1Password CLI
brew install 1password-cli

# Clone env-var-assistant
git clone https://github.com/Aventerica89/env-var-assistant
cd env-var-assistant/mcp-server
npm install
npm run build

# Connect to MC³
# Update docker-compose.yml with env-var-assistant service
```

### **Workflow**

```
1. Copy API key from provider dashboard
2. env-var-assistant detects: "Anthropic API key found!"
3. Click "Save to 1Password"
4. MC³ auto-loads for next session
5. No manual pasting needed! 🎉
```

See [docs/integration-env-var-assistant.md](./docs/integration-env-var-assistant.md) for detailed integration guide.

---

## 🌍 Deployment

### **Production Setup (Hetzner + xCloud)**

**Complete guide:** [SETUP.md](./SETUP.md)

**Quick steps:**

1. Create Hetzner VPS (CPX31 - 4 vCPU, 8GB RAM, $13/mo)
2. Add to xCloud BYOS ($7/mo)
3. Deploy with Docker Compose
4. Configure SSL via xCloud
5. Access your dashboard!

**Total cost:** $20/month for production-ready setup

### **Alternative Deployments**

- **Vercel**: Deploy Next.js app only (needs external DB)
- **Railway**: One-click deploy with all services
- **Docker Swarm**: Multi-node scaling
- **Kubernetes**: Enterprise-grade orchestration

---

## 🛠️ Development

### **Project Structure**

```
claude-command/
├── demo/                  # Interactive HTML demo
├── src/
│   ├── app/              # Next.js app (App Router)
│   │   ├── api/          # API routes
│   │   ├── dashboard/    # Dashboard pages
│   │   └── layout.tsx
│   ├── components/       # React components
│   │   ├── dashboard/
│   │   ├── templates/
│   │   └── ui/
│   ├── lib/              # Shared libraries
│   │   ├── claude/       # Claude manager
│   │   ├── mcp/          # MCP clients
│   │   ├── queue/        # BullMQ
│   │   └── db/           # Database
│   └── workers/          # Background workers
├── docker/               # Docker configs
├── docs/                 # Documentation
└── scripts/              # Setup scripts
```

### **Tech Stack**

**Frontend:**
- Next.js 14 (App Router)
- React 18
- TypeScript
- Tailwind CSS
- shadcn/ui

**Backend:**
- Next.js API Routes
- tRPC (type-safe API)
- Anthropic SDK
- BullMQ (job queue)

**Database:**
- PostgreSQL 16
- Redis 7
- Drizzle ORM

**Infrastructure:**
- Docker & Docker Compose
- NGINX reverse proxy

### **Development Commands**

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run worker       # Start background worker
npm run db:migrate   # Run database migrations
npm run db:studio    # Open Drizzle Studio
npm run lint         # Lint code
npm run test         # Run tests
```

---

## 🤝 Contributing

Contributions welcome! Please read our contributing guidelines first.

### **How to Contribute**

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### **Development Setup**

```bash
# Fork and clone
git clone https://github.com/yourusername/claude-command.git
cd claude-command

# Install dependencies
npm install

# Setup environment
cp docker/.env.example .env

# Start services
docker-compose -f docker/docker-compose.yml up -d

# Start dev server
npm run dev
```

---

## 📄 License

MIT License - see [LICENSE](./LICENSE) file for details.

---

## 🙏 Acknowledgments

- [Anthropic](https://anthropic.com) - Claude AI
- [env-var-assistant](https://github.com/Aventerica89/env-var-assistant) - API key management
- [xCloud](https://xcloud.host) - Server management
- [Hetzner](https://hetzner.com) - VPS hosting

---

## 📞 Support

- 📖 [Documentation](./docs/)
- 🐛 [Issue Tracker](https://github.com/yourusername/claude-command/issues)
- 💬 [Discussions](https://github.com/yourusername/claude-command/discussions)

---

**Built with ❤️ for managing parallel Claude instances**
