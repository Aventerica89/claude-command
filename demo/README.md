# 🎬 Interactive Demo

This is an interactive HTML demo of the Multi-Claude Command Center (MC³) dashboard.

## Features Demonstrated

✅ **Session Management**
- 4 mock Claude sessions (running, paused, deploying, idle)
- Real-time progress bars with animations
- Status indicators with color coding

✅ **Approval Queue**
- 1 pending approval (npm install with medium risk)
- Approve/Reject workflow
- Risk level indicators

✅ **Task Templates**
- 4 quick-start templates
- Dynamic form fields
- Submit workflow

✅ **Live Log Viewer**
- Real-time log streaming (simulated)
- Color-coded log levels
- Auto-scroll feature
- Search and filter

✅ **AI Prompt Optimizer**
- Multi-model comparison (Claude, Gemini, GPT-4)
- Scoring system
- Side-by-side improvements
- One-click selection

✅ **Floating Action Buttons**
- 🧠 AI Prompt Optimizer
- ➕ New Session
- 📊 Analytics Dashboard
- ⚙️ Settings

## How to Use

### Open the Demo

```bash
# Option 1: Direct browser
open mc3-dashboard-demo.html

# Option 2: Local server
python3 -m http.server 8000
open http://localhost:8000/mc3-dashboard-demo.html

# Option 3: npx serve
npx serve .
open http://localhost:3000/mc3-dashboard-demo.html
```

### Interactive Elements

1. **Click any session card** → Opens log viewer with streaming logs
2. **Click template** → Shows dynamic form
3. **Click approval "Approve"** → Resumes paused worker
4. **Click 🧠 optimizer** → Shows multi-model prompt suggestions
5. **Hover FABs** → Shows descriptive labels
6. **Watch progress bars** → Animate automatically

### Mock Data

The demo includes:
- 4 sessions with different states
- Real-time log generation (new entry every 3 seconds)
- Simulated progress updates
- Dynamic approval workflow

### Demo Limitations

⚠️ **This is a frontend-only demo**
- No real Claude API integration
- No actual tool execution
- No persistent storage
- All data is simulated

For full functionality, deploy the complete stack with Docker:
```bash
cd ..
docker-compose -f docker/docker-compose.yml up -d
```

## Code Structure

The demo is a **single-file React application** that includes:

```html
<!DOCTYPE html>
<html>
  <head>
    <!-- Tailwind CSS via CDN -->
    <!-- React & ReactDOM via CDN -->
  </head>
  <body>
    <div id="root"></div>
    
    <script type="text/babel">
      // SessionCard component
      // SessionGrid component
      // ApprovalQueue component
      // LogViewer component
      // TemplateModal component
      // PromptOptimizer component
      // Main Dashboard component
    </script>
  </body>
</html>
```

**Key Features:**
- ✅ No build step required
- ✅ Runs in any modern browser
- ✅ Self-contained (no external dependencies except CDNs)
- ✅ Easy to modify and customize

## Customization

### Add More Sessions

```javascript
const [sessions, setSessions] = useState([
  // ... existing sessions
  {
    id: 5,
    name: 'Your Custom Task',
    status: 'running',
    taskType: 'custom',
    progress: 45,
    elapsed: '8m 12s',
    logs: [
      { level: 'info', message: 'Your custom log message' }
    ]
  }
]);
```

### Add More Templates

```javascript
const templates = [
  // ... existing templates
  {
    id: 5,
    name: 'Your Template',
    description: 'Description here',
    icon: '🚀',
    fields: [
      { name: 'field1', label: 'Label', type: 'text' }
    ]
  }
];
```

### Customize Colors

```javascript
// Status colors
const statusColors = {
  running: 'green',
  paused: 'yellow',
  completed: 'blue',
  failed: 'red',
  idle: 'gray'
};
```

## Production Deployment

For production use with real Claude API integration:

1. **Deploy Backend**: See [../SETUP.md](../SETUP.md)
2. **Configure API Keys**: See [../docs/integration-env-var-assistant.md](../docs/integration-env-var-assistant.md)
3. **Setup Database**: PostgreSQL + Redis
4. **Deploy Workers**: BullMQ worker pool
5. **Enable SSE**: Real-time event streaming

## Troubleshooting

### Blank Page

```javascript
// Check console for errors
// Common fix: Use React development build instead
<script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
```

### Tailwind Classes Not Working

```javascript
// Avoid dynamic classes like bg-${color}-600
// Use explicit classes: bg-green-600, bg-yellow-600, etc.
```

### Components Not Rendering

```javascript
// Check that Babel standalone is loaded
<script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
<script type="text/babel">
  // Your React code here
</script>
```

---

**Ready for the real thing?** Deploy the full stack with Docker! See [../SETUP.md](../SETUP.md)
