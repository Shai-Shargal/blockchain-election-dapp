# AWS Deployment Explained — Interview Guide

## What You Built

A **full-stack web application** deployed on AWS EC2 with proper separation of concerns:

```
Internet (Your Laptop)
    ↓ (http://13.53.137.72)
AWS EC2 Instance (Amazon Linux)
    ├─ Nginx (port 80)
    │  ├─ Serves React app (static files)
    │  └─ Proxies API calls to Node backend
    └─ Node.js backend (port 3001)
       └─ Uploads files to Pinata (IPFS)
```

---

## The Three Layers

### 1. **Frontend (React) — Static Files**

**What it is:**
- Built React app (TypeScript, Vite)
- Compiled to static HTML/JS/CSS files in `dist/` folder
- No server-side rendering needed

**Why static:**
- React runs entirely in the browser
- No need for dynamic server responses
- Nginx just serves files (very fast)

**How it gets to the user:**
```
User browser → HTTP GET / → Nginx → reads dist/index.html → sends back
```

**Key file:**
- `frontend/dist/index.html` — Entry point (loads React app)
- `frontend/dist/assets/` — JavaScript & CSS bundles

---

### 2. **Nginx — Web Server & Reverse Proxy**

**What it does:**
1. **Listens on port 80** (HTTP)
2. **Serves static files** (React app)
3. **Routes API calls** to the Node backend

**The config** (`nginx/blockvote.conf`):
```nginx
server {
    listen 80;
    server_name 13.53.137.72;
    root /home/ec2-user/blockvote-app/frontend/dist;
    
    # Rule 1: Serve static files
    location / {
        try_files $uri $uri/ /index.html;  # SPA routing trick
    }
    
    # Rule 2: Route API calls to Node backend
    location /api/ipfs/ {
        proxy_pass http://localhost:3001/api/ipfs/;
    }
}
```

**Why Nginx?**
- ✅ Fast (written in C, highly optimized)
- ✅ Lightweight (uses little memory)
- ✅ Handles thousands of concurrent requests
- ✅ Can do routing, caching, compression

**SPA Routing trick** (`try_files $uri $uri/ /index.html`):
- React Router handles client-side navigation
- But if user directly visits `/vote`, the browser makes an HTTP request
- Nginx doesn't have `/vote` as a real file
- Solution: `try_files` says "if file doesn't exist, serve `/index.html`"
- React loads, detects URL is `/vote`, renders Vote page
- User sees the right page without a server redirect

---

### 3. **Node.js Backend — API Server**

**What it does:**
- Runs Express.js server on port 3001
- Receives file uploads from the React app
- Sends files to Pinata (IPFS service)
- Returns IPFS CID back to frontend

**Why a separate backend?**
- **Secrets are safe**: Pinata API key never leaves the server
- **Can't expose in frontend**: If you put Pinata key in React (VITE_), it gets bundled into the browser and is publicly readable
- **Server-only operations**: Only servers should talk to third-party APIs with credentials

**The flow:**
```
React app (browser)
    ↓ (POST /api/ipfs/upload with voter CSV file)
Nginx (reverse proxy)
    ↓ (forwards to localhost:3001)
Node.js backend
    ↓ (reads PINATA_API_KEY from environment)
Pinata API
    ↓ (stores file on IPFS)
Returns CID (content hash)
    ↓ (back through Nginx to browser)
React app displays the CID
```

---

## Deployment Architecture

### **Request Flow — Static Content**

```
User's browser: GET http://13.53.137.72/
    ↓
EC2 Security Group: Allows port 80? YES
    ↓
Nginx (listening on :80): GET / 
    ↓
Check config: Location / matches? YES
    ↓
try_files: Look for / file? NO
    ↓
Fallback to /index.html
    ↓
Read /home/ec2-user/blockvote-app/frontend/dist/index.html
    ↓
Send HTML to browser
    ↓
Browser loads JavaScript
    ↓
React renders the app
```

### **Request Flow — API Call**

```
React app: POST /api/ipfs/upload with file
    ↓
Nginx: Location /api/ipfs/ matches? YES
    ↓
Reverse proxy rule: proxy_pass http://localhost:3001/api/ipfs/
    ↓
Node.js backend (port 3001): Receive POST
    ↓
Read file from request
    ↓
Create FormData with file + PINATA_API_KEY
    ↓
POST to https://api.pinata.cloud/pinning/pinFileToIPFS
    ↓
Pinata returns: {"IpfsHash": "QmXxxx..."}
    ↓
Send back to browser: {"cid": "QmXxxx..."}
    ↓
React stores CID on blockchain
```

---

## Key Concepts You Practiced

### **1. Reverse Proxy**
**What:** Nginx sits between user and backend, forwards requests

**Why:**
- Single entry point (user only talks to Nginx)
- Can route based on URL patterns
- Can do load balancing (multiple backends)
- Security layer (backends not exposed to internet)

**Interview angle:**
> "Nginx acts as a reverse proxy — it accepts traffic on port 80, and based on the URL path, either serves static files or forwards to the Node backend on localhost:3001. This keeps our backend hidden from the internet."

### **2. Static File Serving**
**What:** Nginx serves pre-built files instead of generating them

**Why:**
- React is already compiled (nothing to run)
- Static files are cached (very fast)
- Perfect for SPAs (Single Page Applications)

**Interview angle:**
> "We built the React app once with `npm run build`, and Nginx just serves those files. The browser handles routing client-side, so Nginx uses the `try_files` trick to always return index.html for unknown paths."

### **3. Environment Secrets**
**What:** Keep API keys on the server, never in frontend

**How:**
```
Frontend (browser): No secrets here ✅
    ↓ (makes HTTP request)
Nginx: Forwards request
    ↓
Backend (server): Reads PINATA_API_KEY from .env file
    ↓ (backend talks to Pinata API)
Pinata: Authenticates with API key
```

**Interview angle:**
> "We never use `VITE_` prefix for Pinata keys — that would bundle them into the browser bundle, exposing them publicly. Instead, the backend reads from environment variables server-side, and the browser can't see them."

### **4. Process Management (PM2)**
**What:** Keeps the Node backend running forever

**Why:**
- Node process crashes → PM2 auto-restarts it
- No more manual restarts
- Can manage multiple processes
- Logs are saved

**How:**
```bash
pm2 start ecosystem.config.js  # Start background process
pm2 restart blockvote-backend  # Restart if code changes
pm2 logs blockvote-backend     # View logs
pm2 stop blockvote-backend     # Stop gracefully
```

**Interview angle:**
> "We use PM2 as a process manager for the Node backend. If the process crashes for any reason, PM2 automatically restarts it. We also configured PM2 to start on boot, so the app survives server reboots."

### **5. File Permissions**
**What:** Linux users have different permissions; Nginx user couldn't read your files

**The problem:**
```
Files owned by: ec2-user (you)
Nginx running as: nginx user
Nginx trying to read: Permission denied!
```

**The fix:**
```bash
sudo chmod 711 /home/ec2-user           # Let others traverse the directory
sudo chmod -R o+r /path/to/dist         # Let others read files
```

**Interview angle:**
> "Nginx runs as the `nginx` user, but the React files were owned by `ec2-user`. We had to adjust permissions so Nginx could read the files. This is a common security issue when deploying — different services often run as different users."

### **6. Rsync for Deployment**
**What:** Copy files from local Mac to remote server

**Why:**
- Git clone would require credentials
- Rsync is fast (only copies changed files)
- Can exclude large folders (node_modules)
- One-command deploy

**How:**
```bash
rsync -avz --exclude node_modules . ec2-user@13.53.137.72:/home/ec2-user/blockvote-app/
```

**Interview angle:**
> "We use rsync to copy the built frontend and backend code to the server in a single command. We exclude node_modules to save bandwidth, since we reinstall on the server anyway."

---

## Security Layers

1. **EC2 Security Group** — Firewall at the AWS level
   - Only allows port 80 (HTTP) and 22 (SSH)
   - Blocks everything else

2. **Nginx** — Reverse proxy + routing
   - Shields backend from internet
   - Only backend can talk to localhost:3001

3. **Environment variables** — Secrets protection
   - Pinata API key on server only
   - Never in source code or browser

4. **File permissions** — OS-level security
   - Nginx user only has read access
   - Can't modify or delete files

---

## Interview Questions You Can Answer

**Q: How does a user's request reach the React app?**
> "User visits http://13.53.137.72 → Security Group allows port 80 → Nginx listens on :80 → Nginx reads /dist/index.html → Browser loads React → React renders the UI."

**Q: Why not just run React on a Node server?**
> "React is a frontend framework — it runs in the browser. We already compiled it to static files. Nginx is faster and more efficient for serving static content than a Node server."

**Q: How does the IPFS upload work without exposing the Pinata key?**
> "The React app makes a request to /api/ipfs/upload (Nginx route) → Nginx forwards to Node backend → Node backend has the Pinata API key in environment variables → Node makes the Pinata API call → Returns CID to browser."

**Q: What happens if the Node backend crashes?**
> "PM2 detects the crash and automatically restarts the process within seconds. Logs are saved to files, so we can debug issues."

**Q: How do you deploy new code?**
> "We run `./deploy.sh` locally — it builds the React app, syncs everything to the server via rsync, reinstalls backend dependencies, and restarts services. Takes about 1-2 minutes."

---

## What You've Learned

✅ **DevOps Concepts:**
- Reverse proxy (Nginx)
- Static file serving
- Environment secrets management
- Process management (PM2)
- Deployment automation

✅ **Linux/AWS:**
- EC2 instance management
- Security Groups (firewall rules)
- File permissions (chmod)
- User/process management
- SSH key-based authentication

✅ **Full-Stack:**
- Frontend deployment (React)
- Backend API (Node.js)
- Reverse proxy routing
- CORS handling (Nginx to backend)

---

## Next Steps (Optional)

1. **HTTPS/SSL** — Add Let's Encrypt for secure connections
2. **Domain name** — Point a domain instead of using IP
3. **Monitoring** — Set up CloudWatch to monitor CPU/memory
4. **Auto-scaling** — Add more instances if traffic increases
5. **CI/CD** — Automate deployment with GitHub Actions

---

## Your AWS Bill

**Current setup (t3.micro):**
- ~$0.01 per hour
- ~$7-8 per month (if running 24/7)
- Free tier applies if under 12 months old (750 hours/month)

**To stop charges:**
```
AWS Console → EC2 → Instances → Select instance
→ Instance State → Terminate
```

Terminating is permanent — you can't recover the instance.
