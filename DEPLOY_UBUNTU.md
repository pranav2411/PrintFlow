# Ubuntu Server Deployment Guide (from Mac)

This guide walks you through deploying **PrintFlow** on your Ubuntu server at `103.181.115.229` on a custom port without interfering with other websites running on your server.

---

## Step 1: Open Terminal on Your Mac

1. Press `Cmd + Space` on your Mac keyboard.
2. Type **Terminal** and press `Enter`.
3. Connect to your Ubuntu server via SSH:
   ```bash
   ssh root@103.181.115.229
   ```
   *(If your server user is `ubuntu` instead of `root`, run `ssh ubuntu@103.181.115.229`)*
4. Type your server password and press `Enter` (characters won't appear on screen while typing—this is normal).

---

## Step 2: See Which Ports Are Already Running

Run this command on your server to see all listening ports:
```bash
sudo ss -tuln
```
Look at the numbers after the colon in `0.0.0.0:XXXX`.
Common occupied ports: `80`, `443`, `3000`, `8080`.
We will use an available custom port like **`5055`** (or `7070` / `8090`).

---

## Step 3: Install Node.js 20 LTS & PM2 (Process Manager)

Run these commands one by one:
```bash
# 1. Update packages
sudo apt update && sudo apt install -y git curl

# 2. Install Node.js v20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 3. Verify Node and NPM versions
node -v
npm -v

# 4. Install PM2 (keeps your server running 24/7 in background)
sudo npm install -g pm2
```

---

## Step 4: Clone Your GitHub Repository

```bash
cd /var/www || cd ~
git clone https://github.com/pranav2411/PrintFlow.git
cd PrintFlow
```

---

## Step 5: Install Dependencies & Build Frontend

```bash
# Install root and backend dependencies
npm install

# Build the client production bundle
npm run build
```

---

## Step 6: Create Environment Configuration (`.env`)

Create your production `.env` file:
```bash
nano .env
```

Paste the following configuration:
```env
# Custom port (Pick 5055 or any free port)
PORT=5055

# SuperAdmin Login Credentials
ADMIN_USERNAME=admin
ADMIN_PASSWORD=PrintFlow#Secure2026!Adm

# Security & Geoapify API
JWT_SECRET=super_secret_jwt_key_printflow_2026_xyz
GEOAPIFY_API_KEY=dde88d34825a44a4b6883e59f79f4818

# Environment
NODE_ENV=production
```
*To save in nano: Press `Ctrl + O`, hit `Enter`, then press `Ctrl + X`.*

---

## Step 7: Open the Port in Firewall (If UFW is enabled)

If your Ubuntu server has UFW firewall active, allow traffic on port `5055`:
```bash
sudo ufw allow 5055/tcp
sudo ufw reload
```

---

## Step 8: Start the App With PM2

Start PrintFlow as a background daemon that automatically restarts if the server reboots:
```bash
# Start the app
pm2 start server/index.js --name "printflow"

# Save the process list
pm2 save

# Setup PM2 to run on system boot
pm2 startup
```
*(Copy and run whatever command PM2 outputs after running `pm2 startup`)*

### Helpful PM2 Commands:
- View status: `pm2 status`
- View live logs: `pm2 logs printflow`
- Restart app: `pm2 restart printflow`
- Stop app: `pm2 stop printflow`

---

## Step 9: Access Your Live Application

Your app is now live! Open your browser on your Mac or phone:

| Portal | URL | Credentials |
| :--- | :--- | :--- |
| **Customer Mobile Web App** | `http://103.181.115.229:5055` | Open to all customers |
| **Store POS Dashboard** | `http://103.181.115.229:5055/store` | `campus` / `campus123` |
| **Superadmin Dashboard** | `http://103.181.115.229:5055/admin` | `admin` / `PrintFlow#Secure2026!Adm` |

---

## Step 10 (Optional): Point a Domain via Nginx Reverse Proxy

If you already have Nginx running other sites on port 80/443 and want to use a domain name (like `print.yourdomain.com`):

1. Create a new site config:
   ```bash
   sudo nano /etc/nginx/sites-available/printflow
   ```
2. Add:
   ```nginx
   server {
       listen 80;
       server_name print.yourdomain.com;

       client_max_body_size 100M;

       location / {
           proxy_pass http://127.0.0.1:5055;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```
3. Enable and test:
   ```bash
   sudo ln -s /etc/nginx/sites-available/printflow /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl reload nginx
   ```
4. Add SSL with Certbot:
   ```bash
   sudo certbot --nginx -d print.yourdomain.com
   ```
