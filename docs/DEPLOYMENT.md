# BlockVote AWS Deployment Guide

Deploy the DApp to your EC2 instance with Nginx + Node.js backend.

## Server Setup (run these once on your EC2 instance)

### 1. SSH into your instance
```bash
# Make sure your PEM key has correct permissions
chmod 600 ~/.ssh/blockvote.pem

# Connect
ssh -i ~/.ssh/blockvote.pem ec2-user@13.53.137.72
```

### 2. Install Node.js & npm
```bash
curl -sL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo yum install -y nodejs
node -v  # verify
```

### 3. Install Nginx
```bash
sudo yum install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

### 4. Install PM2 globally (process manager)
```bash
sudo npm install -g pm2
pm2 startup
pm2 save
```

### 5. Create application directory
```bash
mkdir -p /home/ec2-user/blockvote-app
cd /home/ec2-user/blockvote-app
mkdir -p backend/logs
```

### 6. Allow Nginx to run as ec2-user for Nginx reload (optional, for convenience)
```bash
sudo visudo
# Add this line at the end:
# ec2-user ALL=(ALL) NOPASSWD: /usr/sbin/nginx
```

## Deploy from Local Machine

### 1. Update deploy script with your PEM key path
Edit `deploy.sh` and change this line to match your actual PEM key location:
```bash
PEM_KEY="$HOME/.ssh/blockvote.pem"  # Update this path
```

### 2. Make deploy script executable
```bash
chmod +x deploy.sh
```

### 3. Run deployment
```bash
./deploy.sh
```

The script will:
- Build your React frontend
- Rsync everything to the server
- Install backend dependencies
- Create `backend/.env` (you'll need to edit it)
- Start Node backend with PM2
- Reload Nginx

### 4. Add Pinata credentials on the server
After deployment, SSH back and edit:
```bash
ssh -i ~/.ssh/blockvote.pem ec2-user@13.53.137.72
nano /home/ec2-user/blockvote-app/backend/.env
```

Add your Pinata API key and secret:
```
PINATA_API_KEY=your_actual_key
PINATA_SECRET_API_KEY=your_actual_secret
```

Then restart the backend:
```bash
pm2 restart blockvote-backend
```

## Verify Deployment

### Check if services are running
```bash
ssh -i ~/.ssh/blockvote.pem ec2-user@13.53.137.72 "pm2 status && sudo systemctl status nginx"
```

### Test the frontend
```bash
curl http://13.53.137.72
```

### Test the backend
```bash
curl http://13.53.137.72/api/ipfs/test
```

### View logs
```bash
ssh -i ~/.ssh/blockvote.pem ec2-user@13.53.137.72 "pm2 logs blockvote-backend"
```

## Updating the App

Each time you make changes locally:

```bash
./deploy.sh
```

It rebuilds the frontend, syncs everything, and restarts services.

## SSL/HTTPS Setup (Optional, for production)

Use Certbot to get a free Let's Encrypt certificate (requires a domain):

```bash
ssh -i ~/.ssh/blockvote.pem ec2-user@13.53.137.72

sudo yum install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

This automatically updates `blockvote.conf` with HTTPS and redirects HTTP to HTTPS.

## Troubleshooting

**Backend not starting:**
```bash
pm2 logs blockvote-backend
```

**Nginx errors:**
```bash
sudo nginx -t  # test config
sudo systemctl status nginx
```

**Port 3001 already in use:**
```bash
sudo lsof -i :3001
sudo kill -9 <PID>
pm2 start ecosystem.config.js
```

**Can't connect to server:**
- Check Security Group allows port 80 (and 443 if using HTTPS)
- Verify EC2 instance is running
- Verify PEM key path in deploy.sh

## Architecture

```
Internet (13.53.137.72:80)
    ↓
Nginx (port 80)
    ├─ GET /                    → dist/index.html (React SPA)
    ├─ GET /js/*, /css/*        → static files (cached)
    └─ POST /api/ipfs/upload    → localhost:3001 (Node backend)
                                    ↓
                               Pinata API
```

## Interview Talking Points

- **Nginx reverse proxy**: Route traffic to different backends based on URL patterns
- **Process management**: PM2 keeps Node service alive and restarts on crash
- **Static file serving**: Efficient delivery of built frontend assets
- **Environment secrets**: Pinata keys stored server-side in `.env`, never in frontend
- **SPA routing**: `try_files` trick to serve index.html for client-side routes
- **Asset caching**: HTTP cache headers for versioned static files
- **Security groups**: AWS firewall rules for ports 22 (SSH), 80 (HTTP), 443 (HTTPS)
