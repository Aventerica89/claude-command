# 🔐 Env-Var-Assistant Integration Guide

This guide explains how to integrate [env-var-assistant](https://github.com/Aventerica89/env-var-assistant) with Claude Command (MC³) for automatic API key management.

## Overview

env-var-assistant is a Chrome extension + MCP server that:
- Detects API keys from clipboard
- Stores them securely in 1Password
- Auto-fills environment variables on provider dashboards
- Provides MCP tools for programmatic access

MC³ integrates with env-var-assistant to automatically detect, store, and load API keys needed for Claude tasks.

---

## Prerequisites

1. **1Password CLI**
```bash
brew install 1password-cli
op signin
```

2. **1Password Desktop App**
   - Enable biometric unlock
   - Sign in to your account

3. **env-var-assistant**
```bash
git clone https://github.com/Aventerica89/env-var-assistant
cd env-var-assistant
```

---

## Installation

### 1. Install the Chrome Extension

```bash
cd env-var-assistant/extension

# Load in Chrome
# 1. Go to chrome://extensions
# 2. Enable "Developer mode"
# 3. Click "Load unpacked"
# 4. Select the extension folder
```

### 2. Install the MCP Server

```bash
cd env-var-assistant/mcp-server
npm install
npm run build
```

### 3. Install the Native Messaging Host

```bash
cd env-var-assistant/native-host

# Copy your extension ID from chrome://extensions
EXTENSION_ID=your-extension-id-here ./install.sh
```

### 4. Configure MC³ Integration

Update `docker-compose.yml` to include env-var-assistant:

```yaml
services:
  env-var-assistant:
    build:
      context: ../../env-var-assistant/mcp-server
    container_name: env-var-assistant-mcp
    environment:
      - OP_SERVICE_ACCOUNT_TOKEN=${OP_SERVICE_ACCOUNT_TOKEN}
    volumes:
      - ~/.config/op:/root/.config/op:ro
    networks:
      - dev-network
    restart: unless-stopped
```

Add to `.env`:
```bash
OP_SERVICE_ACCOUNT_TOKEN=ops_xxxxx
```

---

## Usage

### Automatic API Key Detection

**Workflow:**

1. **User goes to Anthropic Console**
   ```
   https://console.anthropic.com/settings/keys
   ```

2. **Creates API key**
   ```
   Click "Create Key" → Copy to clipboard
   sk-ant-api03-xxxxx...
   ```

3. **Extension detects key**
   ```
   Chrome notification: "Anthropic API key detected!"
   [Save to 1Password] [Dismiss]
   ```

4. **Saves to 1Password**
   ```
   Item: ANTHROPIC_API_KEY
   Category: Password
   Tags: anthropic, api, mc3
   ```

5. **MC³ auto-loads next time**
   ```javascript
   // When starting new session
   const apiKey = await envVarClient.getSecret('ANTHROPIC_API_KEY');
   // Session starts with key loaded!
   ```

---

## MCP Tools Available

### 1. list_secrets()

List all secrets stored in 1Password:

```typescript
const secrets = await envVarClient.callTool({
  name: 'list_secrets',
  arguments: {}
});

// Returns:
// [
//   { name: 'ANTHROPIC_API_KEY', vault: 'Personal' },
//   { name: 'GITHUB_TOKEN', vault: 'Work' },
//   { name: 'CLOUDFLARE_API_TOKEN', vault: 'DevOps' }
// ]
```

### 2. get_secret(name)

Retrieve a specific secret:

```typescript
const apiKey = await envVarClient.callTool({
  name: 'get_secret',
  arguments: { name: 'ANTHROPIC_API_KEY' }
});

// Returns: sk-ant-api03-xxxxx...
```

### 3. detect_clipboard()

Check clipboard for API keys:

```typescript
const detected = await envVarClient.callTool({
  name: 'detect_clipboard',
  arguments: {}
});

// Returns:
// {
//   found: true,
//   provider: 'anthropic',
//   keyName: 'ANTHROPIC_API_KEY',
//   value: 'sk-ant-api03-xxxxx...'
// }
```

### 4. save_to_1password(key, provider, value)

Save a secret to 1Password:

```typescript
await envVarClient.callTool({
  name: 'save_to_1password',
  arguments: {
    key: 'ANTHROPIC_API_KEY',
    provider: 'anthropic',
    value: 'sk-ant-api03-xxxxx...'
  }
});
```

### 5. get_provider_keys(provider)

Get all keys for a provider:

```typescript
const keys = await envVarClient.callTool({
  name: 'get_provider_keys',
  arguments: { provider: 'cloudflare' }
});

// Returns:
// {
//   CLOUDFLARE_API_TOKEN: 'xxxxx',
//   CLOUDFLARE_ACCOUNT_ID: 'xxxxx',
//   CLOUDFLARE_ZONE_ID: 'xxxxx'
// }
```

---

## MC³ Integration Code

### EnvVarAssistantClient Class

```typescript
// lib/mcp/env-var-assistant-client.ts
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

export class EnvVarAssistantClient {
  private client: Client;
  private transport: StdioClientTransport;
  
  async connect() {
    this.transport = new StdioClientTransport({
      command: 'node',
      args: ['/path/to/env-var-assistant/mcp-server/index.js']
    });
    
    this.client = new Client({
      name: 'mc3-dashboard',
      version: '1.0.0'
    }, {
      capabilities: {}
    });
    
    await this.client.connect(this.transport);
  }
  
  async listSecrets() {
    const result = await this.client.callTool({
      name: 'list_secrets',
      arguments: {}
    });
    return result.content;
  }
  
  async getSecret(name: string) {
    const result = await this.client.callTool({
      name: 'get_secret',
      arguments: { name }
    });
    return result.content[0].text;
  }
  
  async detectClipboard() {
    const result = await this.client.callTool({
      name: 'detect_clipboard',
      arguments: {}
    });
    return result.content;
  }
  
  async saveTo1Password(key: string, provider: string, value: string) {
    const result = await this.client.callTool({
      name: 'save_to_1password',
      arguments: { key, provider, value }
    });
    return result.content;
  }
  
  async getProviderKeys(provider: string) {
    const result = await this.client.callTool({
      name: 'get_provider_keys',
      arguments: { provider }
    });
    return result.content;
  }
}
```

### ApiKeyManager Component

```typescript
// components/dashboard/ApiKeyManager.tsx
import { useState, useEffect } from 'react';
import { EnvVarAssistantClient } from '@/lib/mcp/env-var-assistant-client';

export function ApiKeyManager({ requiredKeys, onKeysLoaded }) {
  const [client] = useState(() => new EnvVarAssistantClient());
  const [keys, setKeys] = useState({});
  const [missing, setMissing] = useState([]);
  
  useEffect(() => {
    loadKeys();
  }, []);
  
  async function loadKeys() {
    await client.connect();
    
    const loaded = {};
    const notFound = [];
    
    for (const keyName of requiredKeys) {
      try {
        const value = await client.getSecret(keyName);
        loaded[keyName] = value;
      } catch {
        notFound.push(keyName);
      }
    }
    
    setKeys(loaded);
    setMissing(notFound);
    
    if (notFound.length === 0) {
      onKeysLoaded(loaded);
    }
  }
  
  async function checkClipboard() {
    const detected = await client.detectClipboard();
    if (detected.found) {
      const shouldSave = confirm(`Save ${detected.provider} key to 1Password?`);
      if (shouldSave) {
        await client.saveTo1Password(
          detected.keyName,
          detected.provider,
          detected.value
        );
        await loadKeys();
      }
    }
  }
  
  return (
    <div className="bg-gray-800 p-6 rounded-lg">
      <h3 className="text-lg font-bold mb-4">🔐 API Keys Required</h3>
      
      <div className="space-y-2 mb-4">
        {requiredKeys.map(key => (
          <div key={key} className="flex items-center justify-between">
            <span>{key}</span>
            {keys[key] ? (
              <span className="text-green-400">✓ Loaded</span>
            ) : (
              <span className="text-red-400">✗ Missing</span>
            )}
          </div>
        ))}
      </div>
      
      {missing.length > 0 && (
        <div className="space-y-2">
          <button onClick={checkClipboard}>
            📋 Check Clipboard
          </button>
          <button onClick={() => {/* Manual entry */}}>
            ✏️ Enter Manually
          </button>
        </div>
      )}
    </div>
  );
}
```

---

## Supported Providers

env-var-assistant can detect keys from:

- **OpenAI**: `sk-...`
- **Anthropic**: `sk-ant-...`
- **GitHub**: `ghp_...`, `github_pat_...`
- **AWS**: `AKIA...`
- **Stripe**: `sk_live_...`, `sk_test_...`
- **SendGrid**: `SG....`
- **Twilio**: Various formats
- **Slack**: `xoxb-...`, `xoxp-...`
- **Cloudflare**: API tokens
- **Vercel**: API tokens

---

## Complete Workflow Example

```
┌────────────────────────────────────────────────────────┐
│ 1. User opens MC³ Dashboard                           │
│    Clicks "WordPress Migration" template              │
└────────────────────┬───────────────────────────────────┘
                     ↓
┌────────────────────────────────────────────────────────┐
│ 2. MC³ checks required keys:                          │
│    ✓ ANTHROPIC_API_KEY (found via env-var-assistant) │
│    ✗ GRIDPANE_SSH_KEY (missing)                       │
└────────────────────┬───────────────────────────────────┘
                     ↓
┌────────────────────────────────────────────────────────┐
│ 3. Shows modal: "Missing SSH key for GridPane"       │
│    [Check Clipboard] [Enter Manually]                 │
└────────────────────┬───────────────────────────────────┘
                     ↓
┌────────────────────────────────────────────────────────┐
│ 4. User copies SSH key from GridPane dashboard       │
└────────────────────┬───────────────────────────────────┘
                     ↓
┌────────────────────────────────────────────────────────┐
│ 5. env-var-assistant detects:                         │
│    "GridPane SSH key detected!"                        │
└────────────────────┬───────────────────────────────────┘
                     ↓
┌────────────────────────────────────────────────────────┐
│ 6. Saves to 1Password with tags:                     │
│    [gridpane, ssh, migration]                          │
└────────────────────┬───────────────────────────────────┘
                     ↓
┌────────────────────────────────────────────────────────┐
│ 7. MC³ reloads keys, all ✓                           │
│    User clicks "Start Migration"                       │
└────────────────────┬───────────────────────────────────┘
                     ↓
┌────────────────────────────────────────────────────────┐
│ 8. Claude worker starts with all keys injected       │
│    Migration proceeds automatically                    │
└────────────────────────────────────────────────────────┘
```

---

## Troubleshooting

### "Connection failed" error

```bash
# Check 1Password CLI
op --version
op vault list

# Re-run install script with extension ID
cd env-var-assistant/native-host
EXTENSION_ID=your-id ./install.sh

# Restart Chrome
```

### Keys not detected

- Ensure key matches supported pattern
- Check extension is enabled in Chrome
- Verify clipboard permissions granted

### MCP connection issues

```bash
# Test MCP server directly
cd env-var-assistant/mcp-server
node index.js

# Check logs
docker logs env-var-assistant-mcp
```

---

## Security Considerations

- All secrets stored in 1Password, never in browser storage
- Native messaging uses Chrome's secure protocol
- Extension only has access to specified dashboard URLs
- No API keys are logged or stored in database
- TLS/SSL for all communications

---

## Future Enhancements

1. **Auto-rotation**: Detect expiring keys and prompt renewal
2. **Team vaults**: Share keys across team members
3. **Audit logging**: Track key usage and access
4. **Key templates**: Pre-configured key sets per project
5. **Batch import**: Import multiple keys at once

---

For more information, see:
- [env-var-assistant repo](https://github.com/Aventerica89/env-var-assistant)
- [1Password CLI docs](https://developer.1password.com/docs/cli/)
- [MCP SDK docs](https://modelcontextprotocol.io/)
