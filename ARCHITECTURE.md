# 🏗️ Architecture Documentation

## System Overview

Claude Command (MC³) is a distributed system for managing multiple Claude AI instances in parallel. It uses a microservices architecture with event-driven communication.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                     USER LAYER                          │
│                                                         │
│  ┌──────────────┐   ┌──────────────┐   ┌────────────┐ │
│  │  Web Browser │   │ Mobile App   │   │  CLI Tool  │ │
│  └──────┬───────┘   └──────┬───────┘   └─────┬──────┘ │
│         │                  │                  │         │
└─────────┼──────────────────┼──────────────────┼─────────┘
          │                  │                  │
          └──────────────────┴──────────────────┘
                             │
                    HTTPS/WebSocket
                             │
┌────────────────────────────┼─────────────────────────────┐
│                  PRESENTATION LAYER                      │
│                            │                             │
│  ┌─────────────────────────▼──────────────────────────┐ │
│  │          Next.js Dashboard (Port 3000)             │ │
│  │                                                     │ │
│  │  Components:                                       │ │
│  │  • SessionGrid - Display active Claude instances  │ │
│  │  • ApprovalQueue - Dangerous command review       │ │
│  │  • LogViewer - Real-time log streaming           │ │
│  │  • TemplateModal - Task template forms            │ │
│  │  • PromptOptimizer - AI prompt enhancement        │ │
│  └─────────────────────────────────────────────────────┘ │
└──────────────────────────────┬───────────────────────────┘
                               │
                    tRPC / REST API
                               │
┌──────────────────────────────┼───────────────────────────┐
│                   APPLICATION LAYER                      │
│                              │                           │
│  ┌────────────────────────────────────────────────────┐ │
│  │         API Routes (Next.js API)                   │ │
│  │                                                     │ │
│  │  /api/sessions     - CRUD operations              │ │
│  │  /api/templates    - Task templates               │ │
│  │  /api/approvals    - Approval management          │ │
│  │  /api/stats        - System statistics            │ │
│  │  /api/events       - SSE endpoint                 │ │
│  └────────────┬───────────────────────────────────────┘ │
│               │                                         │
│  ┌────────────▼───────────────────────────────────────┐ │
│  │          Claude Manager Service                    │ │
│  │                                                     │ │
│  │  • Session lifecycle management                    │ │
│  │  • Event broadcasting (SSE)                        │ │
│  │  • Tool execution coordination                     │ │
│  │  • Risk assessment                                 │ │
│  └────────────┬───────────────────────────────────────┘ │
└───────────────┼─────────────────────────────────────────┘
                │
       ┌────────┴────────┐
       │                 │
       ▼                 ▼
┌─────────────┐   ┌─────────────┐
│   BullMQ    │   │  MCP Clients│
│   Queue     │   │             │
│             │   │ • env-var-  │
│ • Task jobs │   │   assistant │
│ • Scheduling│   │ • GitHub    │
└──────┬──────┘   │ • Cloudflare│
       │          └──────┬──────┘
       │                 │
       └────────┬────────┘
                │
┌───────────────┼─────────────────────────────────────────┐
│               │         WORKER LAYER                     │
│               │                                          │
│  ┌────────────▼────────────────────────────────────────┐│
│  │          Claude Worker Pool (1-10 instances)        ││
│  │                                                      ││
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌────────┐││
│  │  │Worker #1│  │Worker #2│  │Worker #3│  │Worker #N│││
│  │  │         │  │         │  │         │  │        │││
│  │  │ Status: │  │ Status: │  │ Status: │  │Status: │││
│  │  │ Running │  │ Paused  │  │ Running │  │ Idle   │││
│  │  │         │  │         │  │         │  │        │││
│  │  │ Task:   │  │ Task:   │  │ Task:   │  │Task:   │││
│  │  │Migration│  │ Deploy  │  │ Analyze │  │ None   │││
│  │  └────┬────┘  └────┬────┘  └────┬────┘  └───┬────┘││
│  │       │            │            │           │     ││
│  │       └────────────┴────────────┴───────────┘     ││
│  │                          │                         ││
│  │                 Anthropic API                      ││
│  └──────────────────────────┬──────────────────────────┘│
└────────────────────────────┼──────────────────────────┘
                             │
                             │
┌────────────────────────────┼──────────────────────────┐
│                    DATA LAYER                          │
│                            │                           │
│  ┌──────────────┐   ┌──────▼──────┐   ┌────────────┐ │
│  │  PostgreSQL  │   │    Redis    │   │ 1Password  │ │
│  │              │   │             │   │            │ │
│  │ Tables:      │   │ • Sessions  │   │ • API Keys │ │
│  │ • sessions   │   │ • Queue     │   │ • Secrets  │ │
│  │ • templates  │   │ • Cache     │   │ • Tokens   │ │
│  │ • approvals  │   │ • Pub/Sub   │   │            │ │
│  │ • logs       │   │             │   │            │ │
│  │ • api_usage  │   │             │   │            │ │
│  └──────────────┘   └─────────────┘   └────────────┘ │
└─────────────────────────────────────────────────────────┘
```

## Component Details

### 1. Dashboard (Next.js Frontend)

**Technology:** Next.js 14, React 18, TypeScript, Tailwind CSS

**Responsibilities:**
- Render UI components
- Handle user interactions
- Display real-time updates via SSE
- Manage local state (Zustand)

**Key Components:**
```typescript
SessionGrid      // Display all Claude workers
SessionCard      // Individual worker display
ApprovalQueue    // Review dangerous operations
LogViewer        // Real-time log streaming
TemplateModal    // Task configuration forms
PromptOptimizer  // AI prompt enhancement
```

### 2. API Layer (Next.js API Routes)

**Technology:** Next.js API Routes, tRPC, Zod

**Endpoints:**

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/sessions` | GET | List all sessions |
| `/api/sessions` | POST | Create new session |
| `/api/sessions/[id]` | GET | Get session details |
| `/api/sessions/[id]` | DELETE | Stop session |
| `/api/sessions/[id]/start` | POST | Start session |
| `/api/sessions/[id]/pause` | POST | Pause session |
| `/api/sessions/[id]/logs` | GET | Stream logs (SSE) |
| `/api/templates` | GET | List templates |
| `/api/approvals` | GET | List pending approvals |
| `/api/approvals/[id]/approve` | POST | Approve action |
| `/api/approvals/[id]/reject` | POST | Reject action |
| `/api/stats` | GET | System statistics |

### 3. Claude Manager

**Core Service:** Session orchestration and lifecycle management

```typescript
class ClaudeManager {
  private sessions: Map<string, ClaudeWorker>;
  
  // Session lifecycle
  createSession(config: SessionConfig): ClaudeWorker
  startSession(sessionId: string, prompt: string): void
  pauseSession(sessionId: string): void
  resumeSession(sessionId: string): void
  stopSession(sessionId: string): void
  
  // Event handling
  on(event: 'log' | 'approval_needed' | 'progress' | 'completed', handler)
  
  // Monitoring
  getAllSessions(): ClaudeWorker[]
  getSessionStatus(sessionId: string): SessionStatus
}
```

**Features:**
- Multi-session management (up to 10 parallel workers)
- Event broadcasting via EventEmitter
- Automatic error recovery
- Resource monitoring
- Rate limit management

### 4. Claude Worker

**Individual AI agent:** Each worker runs independently

```typescript
class ClaudeWorker {
  id: string;
  status: 'idle' | 'running' | 'paused' | 'completed' | 'failed';
  conversationHistory: MessageParam[];
  
  // Lifecycle
  start(prompt: string): Promise<void>
  pause(): void
  resume(): void
  stop(): void
  
  // Tool execution
  handleToolUses(toolUses: ToolUseBlock[]): Promise<void>
  executeTool(toolUse: ToolUseBlock): Promise<string>
  
  // Risk management
  requiresApproval(toolUse: ToolUseBlock): boolean
  requestApproval(toolUse: ToolUseBlock): Promise<boolean>
  assessRisk(toolUse: ToolUseBlock): 'low' | 'medium' | 'high'
}
```

**Conversation Loop:**
```
1. Send prompt to Anthropic API
2. Receive response with tool uses
3. For each tool use:
   a. Check if approval needed
   b. If yes, pause and request approval
   c. If approved, execute tool
   d. Add result to conversation
4. Continue until task complete
```

### 5. Task Queue (BullMQ)

**Background job processing**

**Job Types:**
- `session.start` - Start new Claude session
- `session.cleanup` - Clean up completed sessions
- `backup.create` - Create backups
- `stats.update` - Update statistics

**Queue Configuration:**
```typescript
const sessionQueue = new Queue('sessions', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000
    }
  }
});
```

### 6. MCP Integration

**Model Context Protocol clients**

**env-var-assistant:**
```typescript
const envVarClient = new EnvVarAssistantClient();
await envVarClient.connect();

// List secrets
const secrets = await envVarClient.listSecrets();

// Get specific secret
const apiKey = await envVarClient.getSecret('ANTHROPIC_API_KEY');

// Detect from clipboard
const detected = await envVarClient.detectClipboard();

// Save to 1Password
await envVarClient.saveTo1Password(keyName, provider, value);
```

### 7. Database Schema

**PostgreSQL Tables:**

```sql
-- Claude sessions
CREATE TABLE sessions (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL,
  task_type VARCHAR(100),
  progress INTEGER DEFAULT 0,
  conversation_id TEXT,
  config JSONB,
  result JSONB,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Task templates
CREATE TABLE templates (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  prompt_template TEXT NOT NULL,
  config_schema JSONB,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Approval queue
CREATE TABLE approvals (
  id UUID PRIMARY KEY,
  session_id UUID REFERENCES sessions(id),
  action_type VARCHAR(100),
  command TEXT,
  risk_level VARCHAR(50),
  context JSONB,
  status VARCHAR(50) DEFAULT 'pending',
  approved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Activity logs
CREATE TABLE logs (
  id UUID PRIMARY KEY,
  session_id UUID REFERENCES sessions(id),
  level VARCHAR(50),
  message TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- API usage tracking
CREATE TABLE api_usage (
  id UUID PRIMARY KEY,
  session_id UUID REFERENCES sessions(id),
  model VARCHAR(100),
  input_tokens INTEGER,
  output_tokens INTEGER,
  cost_usd DECIMAL(10, 4),
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Redis Data:**
```
sessions:{id}          - Session state cache
approvals:pending      - Pending approval IDs (Set)
queue:sessions         - BullMQ job queue
pubsub:logs            - Real-time log pub/sub
```

## Data Flow

### Session Creation Flow

```
User clicks "Start Task"
    ↓
Dashboard → POST /api/sessions
    ↓
API Route validates input
    ↓
ClaudeManager.createSession()
    ↓
Insert into PostgreSQL
    ↓
Create ClaudeWorker instance
    ↓
Add to BullMQ queue
    ↓
Worker starts conversation
    ↓
Events broadcast via SSE
    ↓
Dashboard updates in real-time
```

### Approval Flow

```
Claude wants to execute tool
    ↓
ClaudeWorker.requiresApproval()
    ↓
Worker pauses execution
    ↓
Create approval in database
    ↓
Emit 'approval_needed' event
    ↓
Dashboard shows approval UI
    ↓
User approves/rejects
    ↓
POST /api/approvals/[id]/approve
    ↓
Worker resumes/stops
    ↓
Dashboard updates
```

### Real-time Log Flow

```
ClaudeWorker emits log
    ↓
ClaudeManager receives event
    ↓
Insert into PostgreSQL
    ↓
Publish to Redis pub/sub
    ↓
SSE endpoint broadcasts
    ↓
Dashboard receives via EventSource
    ↓
LogViewer displays new log
```

## Security

### Authentication
- JWT tokens for API access
- Session-based auth for dashboard
- API key stored in environment variables

### Authorization
- Role-based access control
- User can only see own sessions
- Admin role for system management

### Data Protection
- API keys stored in 1Password
- Sensitive data encrypted at rest
- TLS/SSL for all communications
- No secrets in logs or database

### Rate Limiting
- Anthropic API rate limits respected
- Dashboard API rate limited per user
- Worker pool size limits concurrent usage

## Scalability

### Horizontal Scaling
- Multiple dashboard instances behind load balancer
- Worker pool can scale across machines
- Redis pub/sub for cross-instance communication

### Vertical Scaling
- Increase worker pool size
- Upgrade database resources
- Add more Redis memory

### Performance Optimization
- Redis caching for frequently accessed data
- Database connection pooling
- Server-sent events for efficient updates
- Lazy loading for dashboard components

## Monitoring & Observability

### Metrics
- Active sessions count
- API usage and costs
- Error rates
- Response times
- Queue depth

### Logging
- Structured JSON logs
- Log levels: debug, info, warn, error
- Centralized log aggregation
- Log retention policies

### Alerting
- Failed sessions
- High error rates
- API rate limit approaching
- High costs

## Deployment

### Docker Compose
All services in single `docker-compose.yml`:
- Dashboard (Next.js)
- PostgreSQL
- Redis
- n8n (optional)
- Uptime Kuma (optional)

### Environment Variables
Managed via `.env` file or env-var-assistant

### Health Checks
- `/api/health` endpoint
- Database connectivity
- Redis connectivity
- Anthropic API accessibility

## Future Enhancements

1. **Multi-user support** - Team collaboration
2. **Session templates** - Save & reuse configurations
3. **Workflow automation** - n8n integration
4. **Advanced analytics** - Cost tracking, usage patterns
5. **Plugin system** - Custom tool integrations
6. **Mobile app** - React Native companion
7. **Voice control** - Start sessions via voice
8. **AI suggestions** - Smart task recommendations
