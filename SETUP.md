# 🚀 Complete Setup Guide

Production deployment of Claude Command (MC³) on Hetzner + xCloud BYOS.

**Total Monthly Cost:** ~$20/month
- Hetzner CPX31: $13/month (4 vCPU, 8GB RAM, 80GB SSD)
- xCloud BYOS: $7/month (lifetime pricing)

---

## Quick Start

```bash
# 1. Clone repo
git clone https://github.com/yourusername/claude-command.git
cd claude-command

# 2. Configure environment
cp docker/.env.example docker/.env
nano docker/.env  # Add your API keys

# 3. Deploy
docker-compose -f docker/docker-compose.yml up -d

# 4. Access dashboard
open http://localhost:3000
```

---

## Table of Contents

1. [Server Setup](#server-setup)
2. [xCloud Configuration](#xcloud-configuration)
3. [Docker Deployment](#docker-deployment)
4. [SSL Setup](#ssl-setup)
5. [Monitoring](#monitoring)
6. [Backups](#backups)
7. [Troubleshooting](#troubleshooting)

---

## Server Setup

### 1. Create Hetzner VPS

```bash
# Recommended: CPX31
# - 4 vCPU
# - 8GB RAM
# - 80GB SSD
# - $13/month

# Location: Choose closest to you
# - Nuremberg, Germany (eu-central)
# - Ashburn, VA (us-east)
# - Hillsboro, OR (us-west)

# Operating System: Ubuntu 24.04 LTS
```

### 2. Initial Server Configuration

```bash
# SSH into server
ssh root@your-server-ip

# Update system
apt update && apt upgrade -y

# Create non-root user
adduser mc3admin
usermod -aG sudo mc3admin

# Setup SSH key authentication
mkdir -p /home/mc3admin/.ssh
cp ~/.ssh/authorized_keys /home/mc3admin/.ssh/
chown -R mc3admin:mc3admin /home/mc3admin/.ssh
chmod 700 /home/mc3admin/.ssh
chmod 600 /home/mc3admin/.ssh/authorized_keys

# Disable root login
sed -i 's/PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
systemctl restart sshd

# Setup firewall
ufw allow 22/tcp   # SSH
ufw allow 80/tcp   # HTTP
ufw allow 443/tcp  # HTTPS
ufw allow 3000/tcp # MC³ Dashboard
ufw allow 5678/tcp # n8n
ufw --force enable
```

### 3. Install Docker

```bash
# Switch to mc3admin user
su - mc3admin

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to docker group
sudo usermod -aG docker mc3admin
newgrp docker

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify
docker --version
docker-compose --version
```

---

## xCloud Configuration

### 1. Sign Up for xCloud BYOS

```
1. Go to https://xcloud.host
2. Select "Bring Your Own Server" plan ($7/month lifetime)
3. Complete checkout
4. Access xCloud dashboard
```

### 2. Add Server to xCloud

```
1. In xCloud dashboard, click "Add Server"
2. Enter details:
   - Server Name: mc3-hetzner-prod
   - IP Address: your-hetzner-ip
   - SSH Port: 22
   - SSH User: mc3admin
3. Upload your SSH private key or add SSH key fingerprint
4. Click "Connect Server"
5. xCloud will verify connection
```

### 3. Install xCloud Agent

```bash
# On Hetzner server
wget https://xcloud.host/install.sh
chmod +x install.sh
sudo ./install.sh

# Verify installation
sudo systemctl status xcloud-agent
```

### 4. Configure xCloud

```
1. In xCloud dashboard, go to Server → Configuration
2. Enable services:
   ✓ Web Server (NGINX)
   ✓ Database (PostgreSQL)
   ✓ SSL/TLS
   ✓ Firewall
   ✓ Backups
3. Set PHP version: 8.3 (if needed)
4. Set Node version: 20.x
5. Click "Save Configuration"
```

---

## Docker Deployment

### 1. Clone Repository

```bash
# On Hetzner server
cd /home/mc3admin
git clone https://github.com/yourusername/claude-command.git
cd claude-command
```

### 2. Configure Environment

```bash
# Copy example environment file
cp docker/.env.example docker/.env

# Edit with your values
nano docker/.env
```

**Required Variables:**
```bash
# Database
POSTGRES_PASSWORD=your_secure_password_here

# Anthropic
ANTHROPIC_API_KEY=sk-ant-api03-xxxxx

# GitHub (if using)
GITHUB_TOKEN=ghp_xxxxx

# Vercel (if using)
VERCEL_TOKEN=xxxxx
VERCEL_ORG_ID=team_xxxxx

# Cloudflare (if using)
CLOUDFLARE_API_TOKEN=xxxxx
CLOUDFLARE_ACCOUNT_ID=xxxxx

# 1Password
OP_SERVICE_ACCOUNT_TOKEN=ops_xxxxx
```

### 3. Deploy Services

```bash
# Start all services
docker-compose -f docker/docker-compose.yml up -d

# Verify services
docker-compose -f docker/docker-compose.yml ps

# Check logs
docker-compose -f docker/docker-compose.yml logs -f mc3-dashboard
```

### 4. Initialize Database

```bash
# Run migrations
docker exec -it mc3-dashboard npm run db:migrate

# Verify database
docker exec -it mc3-postgres psql -U mc3 -d mc3_db -c "\dt"
```

---

## SSL Setup

### 1. Point Domain to Server

```bash
# Add A records in your DNS:
mc3.yourdomain.com  →  your-hetzner-ip
*.mc3.yourdomain.com →  your-hetzner-ip
```

### 2. Configure SSL in xCloud

```
1. Go to xCloud dashboard
2. Navigate to SSL/TLS
3. Click "Add Domain"
4. Enter: mc3.yourdomain.com
5. Select "Let's Encrypt" certificate
6. Click "Issue Certificate"
7. Wait 2-5 minutes for issuance
```

### 3. Setup Reverse Proxy

Create NGINX config in xCloud:

```nginx
# /etc/nginx/sites-available/mc3.conf

upstream mc3_dashboard {
    server localhost:3000;
}

upstream n8n_server {
    server localhost:5678;
}

# MC³ Dashboard
server {
    listen 80;
    server_name mc3.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name mc3.yourdomain.com;
    
    ssl_certificate /etc/letsencrypt/live/mc3.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/mc3.yourdomain.com/privkey.pem;
    
    location / {
        proxy_pass http://mc3_dashboard;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # SSE endpoint
    location /api/events {
        proxy_pass http://mc3_dashboard;
        proxy_http_version 1.1;
        proxy_set_header Connection '';
        proxy_buffering off;
        proxy_cache off;
        chunked_transfer_encoding on;
    }
}

# n8n (optional)
server {
    listen 443 ssl http2;
    server_name n8n.yourdomain.com;
    
    ssl_certificate /etc/letsencrypt/live/mc3.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/mc3.yourdomain.com/privkey.pem;
    
    location / {
        proxy_pass http://n8n_server;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

Enable and reload:
```bash
sudo ln -s /etc/nginx/sites-available/mc3.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## Monitoring

### 1. Setup Uptime Kuma

```bash
# Already running on port 3001
open https://mc3.yourdomain.com:3001

# First-time setup:
# 1. Create admin account
# 2. Add monitors:
#    - MC³ Dashboard (https://mc3.yourdomain.com)
#    - PostgreSQL (docker health check)
#    - Redis (docker health check)
```

### 2. Setup Notifications

```
1. In Uptime Kuma, go to Settings → Notifications
2. Add notification methods:
   - Email
   - Slack
   - Discord
   - Telegram
3. Test notifications
```

### 3. Monitor Docker Containers

```bash
# Install ctop for container monitoring
sudo wget https://github.com/bcicen/ctop/releases/download/v0.7.7/ctop-0.7.7-linux-amd64 -O /usr/local/bin/ctop
sudo chmod +x /usr/local/bin/ctop

# Run ctop
ctop
```

---

## Backups

### 1. Database Backups

```bash
# Create backup script
cat > ~/backup-db.sh <<'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR=/home/mc3admin/backups
mkdir -p $BACKUP_DIR

# Backup PostgreSQL
docker exec mc3-postgres pg_dump -U mc3 mc3_db | gzip > $BACKUP_DIR/mc3_db_$DATE.sql.gz

# Keep last 7 days
find $BACKUP_DIR -name "mc3_db_*.sql.gz" -mtime +7 -delete

echo "Backup completed: mc3_db_$DATE.sql.gz"
EOF

chmod +x ~/backup-db.sh
```

### 2. Automated Backups

```bash
# Add to crontab
crontab -e

# Add this line (daily at 2am):
0 2 * * * /home/mc3admin/backup-db.sh >> /home/mc3admin/backup.log 2>&1
```

### 3. xCloud Backups

```
1. In xCloud dashboard, go to Backups
2. Enable "Automatic Backups"
3. Set schedule: Daily at 3am
4. Retention: 7 days
5. Click "Save Settings"
```

---

## Troubleshooting

### Dashboard not accessible

```bash
# Check if service is running
docker ps | grep mc3-dashboard

# Check logs
docker logs mc3-dashboard

# Restart service
docker-compose -f docker/docker-compose.yml restart mc3-dashboard
```

### Database connection errors

```bash
# Check PostgreSQL
docker ps | grep postgres

# Test connection
docker exec -it mc3-postgres psql -U mc3 -d mc3_db

# Check database URL
docker exec mc3-dashboard env | grep DATABASE_URL
```

### SSL certificate issues

```bash
# Check certificate
sudo certbot certificates

# Renew certificate
sudo certbot renew

# Check NGINX config
sudo nginx -t
```

### High resource usage

```bash
# Check resource usage
docker stats

# Check system resources
htop

# Reduce worker replicas in docker-compose.yml:
# WORKER_REPLICAS=1
```

---

## Maintenance

### Update Application

```bash
cd /home/mc3admin/claude-command
git pull
docker-compose -f docker/docker-compose.yml build
docker-compose -f docker/docker-compose.yml up -d
```

### Update System

```bash
sudo apt update
sudo apt upgrade -y
sudo reboot
```

### Clean Docker

```bash
# Remove unused images
docker image prune -a

# Remove unused volumes
docker volume prune

# Remove unused networks
docker network prune
```

---

## Cost Breakdown

| Service | Cost | Notes |
|---------|------|-------|
| Hetzner CPX31 | $13/mo | 4 vCPU, 8GB RAM |
| xCloud BYOS | $7/mo | Lifetime pricing |
| **Total** | **$20/mo** | No egress fees |

**Comparison:**
- Vercel Pro: $20/mo (single app, limited compute)
- Railway: $20-50/mo (metered usage)
- AWS/GCP: $50-100/mo (similar specs)

---

## Next Steps

After successful deployment:

1. ✅ Access dashboard: https://mc3.yourdomain.com
2. ✅ Create first Claude session
3. ✅ Test WordPress migration template
4. ✅ Setup env-var-assistant integration
5. ✅ Configure monitoring alerts
6. ✅ Enable automatic backups

---

## Support

- 📖 [Full Documentation](../README.md)
- 🏗️ [Architecture Guide](../ARCHITECTURE.md)
- 🔐 [env-var-assistant Integration](./integration-env-var-assistant.md)
- 🐛 [Issue Tracker](https://github.com/yourusername/claude-command/issues)
