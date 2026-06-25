# bldbusiness

Full-stack house-selling application demonstrating **3-tier architecture** for AWS deployment via bastion host.

| Tier | Technology | Folder | Port |
|------|-----------|--------|------|
| **Presentation** | React + Vite + NGINX | `frontend/` | 5173 (dev) / 80 (prod) |
| **Application** | Node.js + Express | `backend/` | 3200 |
| **Data** | MySQL 8.0 | `data-tier/` | 3306 |

Inspired by [Learn-It-Right-Way/lirw-react-node-mysql-app](https://github.com/Learn-It-Right-Way/lirw-react-node-mysql-app).

## Project Structure

```
tier4_app/
├── .devcontainer/          # VS Code / Cursor dev container
├── branding/               # bldbusiness logo assets
├── data-tier/              # MySQL schema & config
├── backend/                # Express REST API
├── frontend/               # React SPA
├── deploy/                 # Per-tier AWS deployment configs
│   ├── data-tier/
│   ├── application-tier/
│   └── presentation-tier/
└── docker-compose.yml      # Local data-tier (MySQL)
```

Each tier has its own **README**, **`.env.example`**, and **deploy scripts** — configuration is isolated and easy to manage per EC2 instance.

## Authentication

The application uses **JWT-based authentication** for all create, update, and delete operations. Read endpoints (dashboard stats, property/agent listings) are public.

| Endpoint | Method | Auth |
|----------|--------|------|
| `/api/auth/register` | POST | Public |
| `/api/auth/login` | POST | Public |
| `/api/auth/me` | GET | Required |
| `/api/agents`, `/api/properties` | GET | Public |
| `/api/agents`, `/api/properties` | POST/PUT/DELETE | Required |

**Default admin account** (seeded in `data-tier/db.sql`):

- Email: `admin@bldbusiness.com`
- Password: `admin123`

Set `JWT_SECRET` in `backend/.env` before deploying to production.

If you already have a running MySQL volume from before auth was added, recreate it or run the `user` table DDL from `data-tier/db.sql` manually.

## Quick Start — Dev Container

The recommended way to develop locally. Mirrors the 3-tier separation:

1. Open in **VS Code / Cursor** and choose **"Reopen in Container"**
2. The dev container starts:
   - **Data tier** — MySQL 8.0 with schema auto-loaded
   - **Dev environment** — Node.js 22 with backend + frontend deps installed
3. In separate terminals inside the container:

```bash
# Application tier
cd backend && npm run dev

# Presentation tier
cd frontend && npm run dev
```

4. Open `http://localhost:5173`

### Without Dev Container

```bash
# Start data tier
docker compose up data-tier -d

# Backend
cp backend/.env.example backend/.env
# Set DB_HOST=localhost in backend/.env
cd backend && npm install && npm run dev

# Frontend
cp frontend/.env.example frontend/.env
cd frontend && npm install && npm run dev
```

## AWS 3-Tier Deployment (Bastion Host)

```
                    ┌─────────────────┐
   Internet ───────►│  Bastion Host   │ (SSH jump box)
                    └────────┬────────┘
                             │ SSH
         ┌───────────────────┼───────────────────┐
         ▼                   ▼                   ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│ Presentation    │ │ Application     │ │ Data            │
│ Tier (public)   │ │ Tier (private)  │ │ Tier (private)  │
│ NGINX + React   │ │ Express API     │ │ MySQL 8.0       │
│ port 80         │ │ port 3200       │ │ port 3306       │
└────────┬────────┘ └────────┬────────┘ └─────────────────┘
         │  /api proxy       │  SQL
         └──────────────────►│◄───────────────────────────
```

Deploy in order: **data tier → application tier → presentation tier**. Each private tier is reachable only via the bastion (or from the tier above it).

### Prerequisites

- AWS account with permissions to create EC2 instances, security groups, and key pairs
- A Git remote for this repo (the application-tier user-data script clones from GitHub)
- An EC2 key pair (`.pem` file) for SSH access
- Recommended instance type: `t3.micro` or `t3.small` per tier (Amazon Linux 2023 AMI)

### Step 1 — Push the repo to GitHub

The application tier clones the repo on first boot. Push your code, then note the clone URL:

```bash
git remote add origin https://github.com/YOUR_ORG/tier4_app.git
git push -u origin main
```

Update `REPO_URL` in `deploy/application-tier/user-data.sh` before launching the application-tier instance.

### Step 2 — Create security groups

Create four security groups in the same VPC. Replace `sg-xxxxxxxx` placeholders with real IDs when adding rules.

| Security group | Inbound rules |
|----------------|---------------|
| **bastion-sg** | SSH (22) from your IP |
| **presentation-sg** | HTTP (80) from `0.0.0.0/0` (or your IP for testing); SSH (22) from bastion-sg |
| **application-sg** | TCP 3200 from presentation-sg; SSH (22) from bastion-sg |
| **data-sg** | MySQL (3306) from application-sg; SSH (22) from bastion-sg |

No tier should accept database or API traffic from the public internet.

### Step 3 — Launch the bastion host

1. In the EC2 console, launch an instance:
   - AMI: **Amazon Linux 2023**
   - Subnet: **public**
   - Auto-assign public IP: **enabled**
   - Security group: **bastion-sg**
2. Note the bastion **public IP**.

### Step 4 — Launch the data tier

1. Launch an EC2 instance:
   - AMI: **Amazon Linux 2023**
   - Subnet: **private**
   - Security group: **data-sg**
   - User data: paste contents of `deploy/data-tier/user-data.sh`
2. Note the data tier **private IP** (e.g. `10.0.1.10`).
3. Wait 2–3 minutes for user data to finish, then SSH in via the bastion:

```bash
chmod 400 your_key.pem
eval "$(ssh-agent -s)"
ssh-add your_key.pem
ssh -A ec2-user@BASTION_PUBLIC_IP
# From bastion:
ssh ec2-user@DATA_TIER_PRIVATE_IP
```

4. Secure MySQL and load the schema:

```bash
# Get the temporary root password (first boot only)
sudo grep 'temporary password' /var/log/mysqld.log

# Harden MySQL (set a strong root password when prompted)
sudo mysql_secure_installation

# Copy schema from your machine (run on your laptop, not on the instance)
scp -o ProxyJump=ec2-user@BASTION_PUBLIC_IP data-tier/db.sql ec2-user@DATA_TIER_PRIVATE_IP:~/

# Back on the data-tier instance:
mysql -u root -p < db.sql
```

5. Confirm the database is ready:

```bash
mysql -u appuser -papppass -e "USE bldbusiness; SHOW TABLES;"
```

> **Production:** Change the default `apppass` password in `db.sql` before loading, and use the same value in the application tier `.env`.

### Step 5 — Launch the application tier

1. Edit `deploy/application-tier/user-data.sh` and set `REPO_URL` to your GitHub repo.
2. Launch an EC2 instance:
   - AMI: **Amazon Linux 2023**
   - Subnet: **private**
   - Security group: **application-sg**
   - User data: paste the updated `deploy/application-tier/user-data.sh`
3. Note the application tier **private IP** (e.g. `10.0.1.20`).
4. SSH in via the bastion and wait for `npm install` to finish (check `/var/log/cloud-init-output.log`).
5. Create the production environment file:

```bash
cd ~/tier4_app/backend
cp .env.example .env
```

Edit `.env` with your values:

```env
PORT=3200
DB_HOST=10.0.1.10          # data-tier private IP
DB_PORT=3306
DB_USER=appuser
DB_PASSWORD=apppass
DB_NAME=bldbusiness
CORS_ORIGIN=*
JWT_SECRET=your-long-random-secret-here
```

6. Install PM2 and start the API:

```bash
source ~/.nvm/nvm.sh
npm install -g pm2
cd ~/tier4_app
# Edit ecosystem.config.js: set DB_HOST and JWT_SECRET, then:
pm2 start deploy/application-tier/ecosystem.config.js
pm2 save
pm2 startup    # run the command it prints to survive reboots
```

7. Verify from the application-tier instance:

```bash
curl http://localhost:3200/health
curl http://localhost:3200/api/properties
```

### Step 6 — Launch the presentation tier

1. Launch an EC2 instance:
   - AMI: **Amazon Linux 2023**
   - Subnet: **public** (needs a public IP for browser access)
   - Auto-assign public IP: **enabled**
   - Security group: **presentation-sg**
   - User data: paste contents of `deploy/presentation-tier/user-data.sh`
2. Note the presentation tier **public IP** and **private IP**.
3. SSH in via the bastion.
4. Clone the repo and build the frontend:

```bash
git clone https://github.com/YOUR_ORG/tier4_app.git
cd tier4_app/frontend
source ~/.nvm/nvm.sh   # install nvm first if not present — see application tier user-data
nvm install --lts
npm install
echo "VITE_API_URL=/api" > .env
npm run build
sudo cp -r dist/* /usr/share/nginx/html/
```

5. Install the NGINX config (replace the application-tier private IP):

```bash
sudo cp ~/tier4_app/deploy/presentation-tier/nginx.conf /etc/nginx/conf.d/bldbusiness.conf
sudo sed -i 's/APPLICATION_TIER_PRIVATE_IP/10.0.1.20/g' /etc/nginx/conf.d/bldbusiness.conf
sudo rm -f /etc/nginx/conf.d/default.conf   # avoid conflicting server blocks
sudo nginx -t
sudo systemctl reload nginx
```

### Step 7 — Verify end-to-end

From your laptop (no bastion needed for HTTP):

```bash
curl http://PRESENTATION_PUBLIC_IP/health
curl http://PRESENTATION_PUBLIC_IP/api/properties
```

Open `http://PRESENTATION_PUBLIC_IP` in a browser. Log in with the seeded admin account (change the password after first login).

| Check | Expected result |
|-------|-----------------|
| `GET /health` | `{"status":"ok","tier":"application",...}` |
| `GET /api/properties` | JSON list of properties |
| Browser UI | Dashboard loads; login works |

### Step 8 — Production hardening (recommended)

Before exposing the app broadly:

- [ ] Set a strong `JWT_SECRET` in `backend/.env` / `ecosystem.config.js`
- [ ] Change default DB passwords (`apppass`, root password) and update all tiers
- [ ] Change or disable the default admin account (`admin@bldbusiness.com` / `admin123`)
- [ ] Restrict `CORS_ORIGIN` to your presentation-tier URL
- [ ] Restrict presentation-tier HTTP (port 80) to known IPs if possible
- [ ] Add HTTPS (ACM certificate + ALB, or Certbot on the presentation tier)
- [ ] Enable CloudWatch logging and EC2 instance alarms

### Connecting via Bastion

```bash
chmod 400 your_key.pem
eval "$(ssh-agent -s)"
ssh-add your_key.pem
ssh -A ec2-user@BASTION_PUBLIC_IP
# From bastion:
ssh ec2-user@PRIVATE_INSTANCE_IP
```

Use `-A` (agent forwarding) so you can `git clone` over HTTPS/SSH from private instances if needed.

### Per-Tier Reference

| Tier | Guide | Deploy assets |
|------|-------|---------------|
| Data | [data-tier/README.md](./data-tier/README.md) | `deploy/data-tier/user-data.sh` |
| Application | [backend/README.md](./backend/README.md) | `deploy/application-tier/` |
| Presentation | [frontend/README.md](./frontend/README.md) | `deploy/presentation-tier/nginx.conf` |

## Branding

Logo assets in `branding/`:
- `logo.png` — raster logo for web/favicon
- `logo.svg` — scalable vector logo

## License

MIT
