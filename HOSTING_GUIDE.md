# PrintFlow Production Deployment & Hosting Guide

This guide walks you through hosting your **PrintFlow** application on cloud platforms or a VPS.

---

## 1. Credentials & Security (Admin & Stores)

All default credentials banners and helpers have been **completely removed** from the website UI. Credentials are no longer visible to anyone visiting your website.

### Root Superadmin Credentials:
- **Portal URL**: `/admin`
- **Username**: `admin`
- **Password**: `PrintFlow#Secure2026!Adm`

> [!NOTE]
> You can change the admin username and password anytime in `server/data/database.json` or by setting `ADMIN_PASSWORD` in your server environment variables.

### Storekeeper Counter Credentials:
- **Portal URL**: `/store`
- Store 1: `campus` / `campus123`
- Store 2: `metro` / `metro123`
*(Store passwords can be updated or new stores added directly inside the Superadmin Portal at `/admin`)*.

---

## 2. Option A: Free 1-Click Hosting on Render.com (Recommended)

Render offers free hosting with full support for Node.js, Express, Socket.io WebSockets, and static frontend serving.

1. **Push your code to GitHub**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/PrintFileSystem.git
   git push -u origin main
   ```

2. **Create a New Web Service on Render**:
   - Go to [render.com](https://render.com) and log in.
   - Click **New +** -> **Web Service**.
   - Connect your GitHub repository.

3. **Configure Settings**:
   - **Name**: `printflow` (or any name you like)
   - **Environment**: `Node`
   - **Build Command**:
     ```bash
     npm run install:all && npm run build
     ```
   - **Start Command**:
     ```bash
     npm start
     ```
   - **Instance Type**: `Free`

4. **Environment Variables**:
   Under the **Environment** tab on Render, add:
   - `NODE_ENV` = `production`
   - `JWT_SECRET` = (enter any long random string)
   - `ADMIN_USERNAME` = `admin`
   - `ADMIN_PASSWORD` = `PrintFlow#Secure2026!Adm`

5. Click **Deploy Web Service**! Render will build the Vite React frontend and start the backend. Your live URL will be ready at `https://printflow.onrender.com`.

---

## 3. Option B: Hosting on Railway.app

1. Go to [railway.app](https://railway.app) and sign in with GitHub.
2. Click **New Project** -> **Deploy from GitHub repo**.
3. Railway automatically detects `package.json` and runs:
   - Build: `npm run build`
   - Start: `npm start`
4. In **Variables**, add:
   - `PORT` = `5050`
   - `NODE_ENV` = `production`
5. In **Settings**, click **Generate Domain** to get your public HTTPS URL.

---

## 4. Option C: Hosting on a Linux VPS (Ubuntu / DigitalOcean / AWS EC2)

If you have an Ubuntu server:

1. **Clone repository and install dependencies**:
   ```bash
   git clone <YOUR_REPO_URL>
   cd PrintFileSystem
   npm run install:all
   npm run build
   ```

2. **Run with PM2 Process Manager**:
   ```bash
   sudo npm install -g pm2
   pm2 start server/index.js --name "printflow"
   pm2 startup
   pm2 save
   ```

3. **Configure Nginx Reverse Proxy with SSL (Certbot)**:
   ```nginx
   server {
       server_name yourdomain.com;

       location / {
           proxy_pass http://127.0.0.1:5050;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection "upgrade";
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
           client_max_body_size 100M;
       }
   }
   ```
   Run `sudo certbot --nginx -d yourdomain.com` for free HTTPS.
