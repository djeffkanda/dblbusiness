# bldbusiness — AWS Deployment Guide

Step-by-step guide for deploying **bldbusiness** on AWS with:

- **Aurora MySQL** (managed database — no data-tier EC2)
- **Application tier** — Node.js + Express on a private EC2 instance
- **Presentation tier** — React + NGINX on a public EC2 instance
- **Source code** — synced from S3 (files already uploaded, not a zip)
- **Access** — AWS Systems Manager (SSM) Session Manager (no bastion required)

Deploy in order: **Aurora → application tier → presentation tier → (optional) ALB**.

---

## Architecture

### Without ALB (direct to EC2)

```
                         ┌─────────────────────┐
   Browser ─────────────►│  Presentation EC2   │  public subnet, port 80
                         │  NGINX + React      │
                         └──────────┬──────────┘
                                    │ /api proxy → :3200
                                    ▼
                         ┌─────────────────────┐
                         │  Application EC2    │  private subnet, port 3200
                         │  Node.js + Express  │
                         └──────────┬──────────┘
                                    │ MySQL :3306
                                    ▼
                         ┌─────────────────────┐
                         │  Aurora MySQL       │  private subnets
                         └─────────────────────┘
```

### With ALB (recommended for production)

```
   Browser ──► ALB (public subnets, :443) ──► Presentation EC2 (:80) ──► Application EC2 (:3200) ──► Aurora
```

The ALB sits in front of the **presentation tier only**. NGINX on the EC2 still proxies `/api` to the application tier — no ALB config lives in this repo; it is created in the AWS console (Step 7).

```
   S3 bucket ──sync──► both EC2 instances (app code)
   SSM Session Manager ──► both EC2 instances (shell access)
```

| Component | Technology | Port |
|-----------|------------|------|
| Presentation | React + NGINX | 80 |
| Application | Node.js + Express + PM2 | 3200 |
| Data | Aurora MySQL 8.0 | 3306 |

---

## Prerequisites

- AWS account with permissions for EC2, RDS (Aurora), S3, IAM, and SSM
- A **VPC** with at least one **public** and one **private** subnet
- App source files uploaded to S3 (unzipped folder structure):

```
s3://YOUR-BUCKET/YOUR-PREFIX/
  backend/
  frontend/
  deploy/
  data-tier/
  branding/
```

- Replace `YOUR-BUCKET` and `YOUR-PREFIX` everywhere in this guide with your real values.

---

## Step 1 — Create Aurora MySQL

1. Open **RDS → Databases → Create database**.
2. Choose:
   - **Engine:** Aurora MySQL (compatible with MySQL 8.0)
   - **Templates:** Dev/Test (or Production)
   - **DB cluster identifier:** e.g. `bldbusiness-aurora`
   - **Master username:** e.g. `admin`
   - **Master password:** strong password (save it)
3. **Connectivity:**
   - Same **VPC** as your EC2 instances
   - **Subnet group:** private subnets
   - **Public access:** No
4. Create the cluster and wait until status is **Available**.
5. Copy the **Writer endpoint** (cluster endpoint), e.g.:

```
bldbusiness-aurora.cluster-abc123.us-east-1.rds.amazonaws.com
```

You will use this as `DB_HOST` in the application tier.

---

## Step 2 — Security groups

Create three security groups in the same VPC.

### aurora-sg

| Type | Port | Source |
|------|------|--------|
| MySQL/Aurora | 3306 | `application-sg` |

### application-sg

| Type | Port | Source |
|------|------|--------|
| Custom TCP | 3200 | `presentation-sg` |
| HTTPS | 443 | VPC CIDR (for SSM) |
| HTTP | 80 | VPC CIDR (for SSM/package updates) |

> SSM Session Manager uses outbound HTTPS; no inbound SSH rule is required if you use SSM only.

### presentation-sg

**Without ALB** (quick testing — browser hits EC2 directly):

| Type | Port | Source |
|------|------|--------|
| HTTP | 80 | `0.0.0.0/0` (or your IP for testing) |
| HTTPS | 443 | VPC CIDR (for SSM) |
| HTTP | 80 | VPC CIDR (for SSM/package updates) |

**With ALB** (production — only the load balancer reaches NGINX):

| Type | Port | Source |
|------|------|--------|
| HTTP | 80 | `alb-sg` |
| HTTPS | 443 | VPC CIDR (for SSM) |
| HTTP | 80 | VPC CIDR (for SSM/package updates) |

### alb-sg (only if using Step 7 — ALB)

| Type | Port | Source |
|------|------|--------|
| HTTP | 80 | `0.0.0.0/0` |
| HTTPS | 443 | `0.0.0.0/0` |

Attach **aurora-sg** to the Aurora cluster when creating or modifying it.

---

## Step 3 — IAM role for EC2 (S3 + SSM)

Create an IAM role for EC2 with these policies:

1. **AmazonSSMManagedInstanceCore** — enables SSM Session Manager
2. **Custom S3 read policy** (replace bucket/prefix):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:ListBucket"],
      "Resource": "arn:aws:s3:::YOUR-BUCKET",
      "Condition": {
        "StringLike": {
          "s3:prefix": ["YOUR-PREFIX/*"]
        }
      }
    },
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject"],
      "Resource": "arn:aws:s3:::YOUR-BUCKET/YOUR-PREFIX/*"
    }
  ]
}
```

Attach this role (**instance profile**) to **both** EC2 instances when you launch them.

---

## Step 4 — Launch the application tier EC2

1. **EC2 → Launch instance**
   - **Name:** `bldbusiness-application`
   - **AMI:** Amazon Linux 2023
   - **Instance type:** `t3.micro` or `t3.small`
   - **Subnet:** **private**
   - **Auto-assign public IP:** Disable
   - **Security group:** `application-sg`
   - **IAM instance profile:** role from Step 3
2. Launch and note the **private IP** (e.g. `10.0.3.188`).

### Connect via SSM

**EC2 → Instances → Select instance → Connect → Session Manager → Connect**

You will land as `ssm-user`. Switch to `ec2-user` for all app work:

```bash
sudo su - ec2-user
```

### Install Node.js (nvm)

Run as **ec2-user** — do not set `NVM_DIR` manually before install:

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.nvm/nvm.sh
nvm install --lts
node -v
npm -v
```

### Sync app from S3

```bash
mkdir -p ~/tier4_app
aws s3 sync s3://YOUR-BUCKET/YOUR-PREFIX/ ~/tier4_app/

# Confirm expected folders exist
ls ~/tier4_app
# backend/  deploy/  frontend/  data-tier/
```

If your S3 layout has an extra folder level, adjust the sync path:

```bash
aws s3 sync s3://YOUR-BUCKET/YOUR-PREFIX/dblbusiness/ ~/tier4_app/
```

### Install backend dependencies

```bash
source ~/.nvm/nvm.sh
cd ~/tier4_app/backend
npm install
```

### Load database schema into Aurora

Install the MySQL client (Amazon Linux 2023):

```bash
sudo yum install -y mariadb105
```

Run the schema (use your Aurora **master** user when prompted):

```bash
mysql -h YOUR_AURORA_CLUSTER_ENDPOINT -u admin -p < ~/tier4_app/data-tier/db.sql
```

Verify:

```bash
mysql -h YOUR_AURORA_CLUSTER_ENDPOINT -u appuser -papppass -e "USE bldbusiness; SHOW TABLES;"
```

> **Production:** Change `apppass` in `data-tier/db.sql` before loading, and use the same password in `.env` and `ecosystem.config.js`.

### Configure environment

```bash
cd ~/tier4_app/backend
cp .env.example .env
nano .env
```

Set these values:

```env
PORT=3200
DB_HOST=bldbusiness-aurora.cluster-abc123.us-east-1.rds.amazonaws.com
DB_PORT=3306
DB_USER=appuser
DB_PASSWORD=apppass
DB_NAME=bldbusiness
CORS_ORIGIN=*
JWT_SECRET=your-long-random-secret-here
```

Generate a strong JWT secret:

```bash
openssl rand -base64 48
```

### Edit PM2 config

```bash
nano ~/tier4_app/deploy/application-tier/ecosystem.config.js
```

Update at minimum:

- `DB_HOST` → Aurora cluster endpoint
- `DB_PASSWORD` → your app DB password
- Add `JWT_SECRET` to the `env` block (recommended)

Example `env` section:

```javascript
env: {
  NODE_ENV: 'production',
  PORT: 3200,
  DB_HOST: 'bldbusiness-aurora.cluster-abc123.us-east-1.rds.amazonaws.com',
  DB_PORT: 3306,
  DB_USER: 'appuser',
  DB_PASSWORD: 'your-strong-password',
  DB_NAME: 'bldbusiness',
  CORS_ORIGIN: '*',
  JWT_SECRET: 'your-long-random-secret-here',
},
```

### Start the API with PM2

```bash
source ~/.nvm/nvm.sh
npm install -g pm2
cd ~/tier4_app
pm2 start deploy/application-tier/ecosystem.config.js
pm2 save
pm2 startup
```

Run the command `pm2 startup` prints (with `sudo`) so the API survives reboots.

### Verify application tier

```bash
curl http://localhost:3200/health
curl http://localhost:3200/api/properties
```

Expected: `{"status":"ok",...}` and a JSON list of properties.

---

## Step 5 — Launch the presentation tier EC2

1. **EC2 → Launch instance**
   - **Name:** `bldbusiness-presentation`
   - **AMI:** Amazon Linux 2023
   - **Instance type:** `t3.micro` or `t3.small`
   - **Subnet:** **public**
   - **Auto-assign public IP:** Enable
   - **Security group:** `presentation-sg`
   - **IAM instance profile:** same role from Step 3
2. Note the **public IP** (for browser access) and **private IP**.

### Connect and switch user

```bash
sudo su - ec2-user
```

### Install Node.js and NGINX

```bash
# Node (same as application tier)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.nvm/nvm.sh
nvm install --lts

# NGINX
sudo yum install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

### Sync app from S3

```bash
mkdir -p ~/tier4_app
aws s3 sync s3://YOUR-BUCKET/YOUR-PREFIX/ ~/tier4_app/
```

### Build the frontend

```bash
source ~/.nvm/nvm.sh
cd ~/tier4_app/frontend
npm install
echo "VITE_API_URL=/api" > .env
npm run build
sudo cp -r dist/* /usr/share/nginx/html/
```

`VITE_API_URL=/api` makes the browser call the same host; NGINX proxies `/api` to the application tier.

### Configure NGINX

**Single application EC2 (fixed private IP):**

```bash
sudo cp ~/tier4_app/deploy/presentation-tier/nginx.conf /etc/nginx/conf.d/bldbusiness.conf
sudo sed -i 's/APPLICATION_TIER_PRIVATE_IP/10.0.3.188/g' /etc/nginx/conf.d/bldbusiness.conf
```

Replace `10.0.3.188` with your **application tier private IP**.

**ALB + Auto Scaling on application tier:** do **not** use a private IP — use `nginx-alb.conf` and **Step 9** instead.

Remove the default server block if it conflicts:

```bash
sudo rm -f /etc/nginx/conf.d/default.conf
sudo nginx -t
sudo systemctl reload nginx
```

---

## Step 6 — End-to-end verification

From your laptop, use the presentation tier **public IP** (or the **ALB DNS name** after Step 7):

```bash
curl http://PRESENTATION_PUBLIC_IP/health
curl http://PRESENTATION_PUBLIC_IP/api/properties
```

Open in a browser:

```
http://PRESENTATION_PUBLIC_IP
```

If Step 7 (ALB) is complete, use `https://YOUR-ALB-DNS-NAME` instead.

**Default admin login** (change after first login):

| Field | Value |
|-------|-------|
| Email | `admin@bldbusiness.com` |
| Password | `admin123` |

| Check | Expected |
|-------|----------|
| `GET /health` | `{"status":"ok","tier":"application",...}` |
| `GET /api/properties` | JSON property list |
| Browser UI | Dashboard loads; login works |

---

## Step 7 — Application Load Balancer (optional)

Add an **Application Load Balancer (ALB)** in front of the presentation tier for a stable DNS name, health checks, and HTTPS via ACM. No files in this repo need to change — NGINX on the presentation EC2 keeps serving traffic on port 80.

Complete **Steps 4–6** first so the presentation EC2 is running NGINX and returns `200` on `/health`.

### 7.1 — Request an ACM certificate (HTTPS)

1. Open **Certificate Manager (ACM)** in the **same region** as your ALB.
2. **Request a public certificate**.
3. Add your domain, e.g. `app.example.com` (or use the ALB DNS name without a custom domain — skip ACM and use HTTP-only in 7.5).
4. Validate via DNS (Route 53) or email.
5. Wait until status is **Issued**.

> ACM certificates for ALB must be in the same region as the load balancer (not CloudFront us-east-1 unless ALB is there too).

### 7.2 — Create a target group

1. **EC2 → Target Groups → Create target group**.
2. Settings:

| Setting | Value |
|---------|-------|
| Target type | **Instances** |
| Target group name | `bldbusiness-presentation-tg` |
| Protocol | **HTTP** |
| Port | **80** |
| VPC | Same VPC as your EC2 instances |
| Health check protocol | HTTP |
| Health check path | `/health` |
| Healthy threshold | 2 |
| Unhealthy threshold | 3 |
| Timeout | 5 seconds |
| Interval | 30 seconds |
| Success codes | `200` |

3. **Next** → Register targets → select the **presentation tier EC2** → **Include as pending below** → **Create target group**.
4. Wait until the target shows **Healthy** (may take 1–2 minutes). If **Unhealthy**, see [ALB target unhealthy](#alb-target-unhealthy) in Troubleshooting.

### 7.3 — Create the load balancer

1. **EC2 → Load Balancers → Create load balancer → Application Load Balancer**.
2. Settings:

| Setting | Value |
|---------|-------|
| Name | `bldbusiness-alb` |
| Scheme | **Internet-facing** |
| IP address type | IPv4 |
| Network mapping | Select your VPC + **at least two public subnets** in different AZs |
| Security group | **alb-sg** (from Step 2) |

3. **Listeners and routing** — configure in 7.5 (HTTP and/or HTTPS).
4. Create the load balancer.
5. Copy the **DNS name**, e.g. `bldbusiness-alb-123456789.us-east-1.elb.amazonaws.com`.

### 7.4 — Update presentation security group

Lock down the presentation EC2 so only the ALB can reach NGINX:

1. **EC2 → Security Groups → presentation-sg**.
2. **Remove** the inbound rule allowing HTTP 80 from `0.0.0.0/0`.
3. **Add** inbound rule:

| Type | Port | Source |
|------|------|--------|
| HTTP | 80 | `alb-sg` |

Traffic flow: `Internet → alb-sg → presentation-sg:80 → NGINX`.

### 7.5 — Configure listeners

**HTTPS (recommended)**

1. **Load Balancers → your ALB → Listeners → Add listener**.
2. Protocol **HTTPS**, port **443**.
3. Default action: **Forward to** `bldbusiness-presentation-tg`.
4. Security policy: `ELBSecurityPolicy-TLS13-1-2-2021-06` (or default).
5. Certificate: select your **ACM certificate** from 7.1.

**HTTP → HTTPS redirect (optional but recommended)**

1. Add listener: protocol **HTTP**, port **80**.
2. Default action: **Redirect to URL** → HTTPS, port 443, status `HTTP_301`.

**HTTP only (no custom domain / no ACM)**

1. Add listener: protocol **HTTP**, port **80**.
2. Default action: **Forward to** `bldbusiness-presentation-tg`.

### 7.6 — Update CORS (if restricted)

If you set `CORS_ORIGIN` to a specific URL, update `backend/.env` and `ecosystem.config.js` on the application tier:

```env
CORS_ORIGIN=https://app.example.com
```

Or, if using the ALB DNS name without a custom domain:

```env
CORS_ORIGIN=https://bldbusiness-alb-123456789.us-east-1.elb.amazonaws.com
```

Restart the API:

```bash
sudo su - ec2-user
pm2 restart bldbusiness-api
```

### 7.7 — Custom domain (optional)

1. **Route 53 → Hosted zones → your domain → Create record**.
2. Record type **A** → **Alias** → Alias to Application Load Balancer → select your ALB.
3. Use `https://app.example.com` for browser access and `CORS_ORIGIN`.

### 7.8 — Verify ALB

```bash
curl https://YOUR-ALB-DNS-NAME/health
curl https://YOUR-ALB-DNS-NAME/api/properties
```

Open `https://YOUR-ALB-DNS-NAME` (or your custom domain) in a browser.

| Check | Expected |
|-------|----------|
| Target group | Presentation EC2 **Healthy** |
| `GET /health` via ALB | `{"status":"ok",...}` |
| `GET /api/properties` via ALB | JSON property list |
| Direct EC2 IP | Should **fail** or time out (port 80 blocked from internet) |

### ALB summary

| AWS resource | Purpose |
|--------------|---------|
| `alb-sg` | Internet → ALB on 80/443 |
| `presentation-sg` | ALB → NGINX on 80 only |
| Target group | Health check `/health`, forward to presentation EC2 |
| ALB listener :443 | HTTPS termination (ACM cert) |
| ALB listener :80 | Redirect to HTTPS or forward HTTP |

No ALB configuration file exists in this repository — everything above is managed in the **AWS Console** (or your own IaC).

---

## Step 8 — Production hardening (recommended)

- [ ] Set a strong `JWT_SECRET` in `backend/.env` and `ecosystem.config.js`
- [ ] Change default DB password (`apppass`) in Aurora, `.env`, and `ecosystem.config.js`
- [ ] Change or disable the default admin account
- [ ] Complete **Step 7 (ALB)** with HTTPS instead of exposing EC2 public IP on port 80
- [ ] Set `CORS_ORIGIN` to your ALB URL or custom domain instead of `*`
- [ ] Enable Aurora automated backups and set a backup retention period
- [ ] Enable ALB access logs (S3 bucket) for request auditing
- [ ] Enable CloudWatch alarms on EC2, ALB, and Aurora

---

## Step 9 — Auto Scaling + internal ALB (optional)

Use this when the **application tier** (or both tiers) runs in an **Auto Scaling Group (ASG)**. Instance private IPs change when instances launch or terminate — you cannot hardcode `10.0.3.188` in NGINX.

### Architecture

```
Internet
   │
   ▼
┌──────────────────────┐
│  Public ALB          │  Step 7 — internet-facing, HTTPS
│  (presentation)      │
└──────────┬───────────┘
           │ :80
           ▼
┌──────────────────────┐
│  Presentation ASG  │  NGINX + React (one or more EC2)
└──────────┬───────────┘
           │ proxy /api → internal ALB DNS (not a private IP)
           ▼
┌──────────────────────┐
│  Internal ALB        │  private subnets only
│  (application)       │
└──────────┬───────────┘
           │ :3200
           ▼
┌──────────────────────┐
│  Application ASG   │  Node.js + PM2 (scales in/out)
└──────────┬───────────┘
           │
           ▼
      Aurora MySQL
```

| Question | Answer |
|----------|--------|
| Replace `10.0.3.188` with what? | **Internal ALB DNS name** — never a private IP |
| Public ALB (Step 7) | Fronts **presentation** ASG |
| Internal ALB | Fronts **application** ASG |
| NGINX config file | `deploy/presentation-tier/nginx-alb.conf` |

### 9.1 — Security groups (add / update)

**internal-alb-sg** (internal application ALB):

| Type | Port | Source |
|------|------|--------|
| HTTP | 80 | `presentation-sg` |

**application-sg** (update for ASG):

| Type | Port | Source |
|------|------|--------|
| Custom TCP | 3200 | `internal-alb-sg` |

Remove the rule allowing port 3200 directly from `presentation-sg` — traffic must go through the internal ALB.

**presentation-sg** — unchanged from Step 7 (port 80 from public `alb-sg` only).

### 9.2 — Internal ALB + application target group

1. **EC2 → Target Groups → Create target group**

| Setting | Value |
|---------|-------|
| Name | `bldbusiness-application-tg` |
| Protocol | **HTTP** |
| Port | **3200** |
| Health check path | `/health` |
| Success codes | `200` |

2. **EC2 → Load Balancers → Create → Application Load Balancer**

| Setting | Value |
|---------|-------|
| Name | `bldbusiness-app-internal-alb` |
| Scheme | **Internal** |
| Subnets | **Private** subnets (2+ AZs) |
| Security group | `internal-alb-sg` |

3. **Listener:** HTTP port **80** → forward to `bldbusiness-application-tg` (targets receive traffic on **3200** per target group settings).

4. Copy the **internal ALB DNS name**, e.g.:

```
internal-bldbusiness-app-987654321.us-east-1.elb.amazonaws.com
```

### 9.3 — Application Auto Scaling Group

1. Create a **launch template** (Amazon Linux 2023, private subnet, `application-sg`, IAM role from Step 3).
2. **User data** (runs on each new instance): install nvm, `aws s3 sync`, `npm install`, PM2 start — same commands as Step 4.
3. **EC2 → Auto Scaling Groups → Create**

| Setting | Value |
|---------|-------|
| Launch template | Your application template |
| VPC / subnets | **Private** subnets |
| Load balancing | Attach to `bldbusiness-application-tg` |
| Desired / min / max | e.g. 1 / 1 / 3 |

4. Wait until instances show **Healthy** in the application target group.

### 9.4 — Presentation Auto Scaling Group (optional)

If the presentation tier also scales:

1. Launch template with NGINX, frontend build, and `nginx-alb.conf` (9.5).
2. ASG in **private** subnets (recommended when behind public ALB).
3. Attach to the **public** presentation target group from Step 7.
4. Do **not** assign individual public IPs — the public ALB is the only entry point.

### 9.5 — NGINX: use internal ALB DNS (not private IP)

On each presentation instance:

```bash
# Get VPC DNS resolver (usually VPC CIDR .2, e.g. 10.0.0.2)
VPC_DNS=$(grep nameserver /etc/resolv.conf | awk '{print $2}')

sudo cp ~/tier4_app/deploy/presentation-tier/nginx-alb.conf /etc/nginx/conf.d/bldbusiness.conf
sudo sed -i "s/INTERNAL_APP_ALB_DNS/internal-bldbusiness-app-987654321.us-east-1.elb.amazonaws.com/g" /etc/nginx/conf.d/bldbusiness.conf
sudo sed -i "s/VPC_DNS_RESOLVER/$VPC_DNS/g" /etc/nginx/conf.d/bldbusiness.conf

sudo rm -f /etc/nginx/conf.d/default.conf
sudo nginx -t
sudo systemctl reload nginx
```

The `resolver` directive is required so NGINX re-resolves the internal ALB DNS when application instances are added or removed.

**Optional:** create a Route 53 **private hosted zone** record (e.g. `app.internal`) as a CNAME to the internal ALB, and use that name in `nginx-alb.conf` instead of the long ALB DNS string.

### 9.6 — Which NGINX config to use

| Setup | Config file | `proxy_pass` target |
|-------|-------------|---------------------|
| 1 app EC2, no ASG | `nginx.conf` | Application **private IP** `:3200` |
| App ASG + internal ALB | `nginx-alb.conf` | **Internal ALB DNS** (port 80 on ALB) |
| Single combined EC2 | `nginx.conf` | `127.0.0.1:3200` |

### 9.7 — Verify

```bash
# From a presentation instance — internal ALB reachable
curl http://internal-bldbusiness-app-987654321.us-east-1.elb.amazonaws.com/health

# Through the public ALB
curl https://YOUR-PUBLIC-ALB-DNS/health
curl https://YOUR-PUBLIC-ALB-DNS/api/properties
```

Scale the application ASG up/down and confirm `/api/properties` still works — no NGINX IP changes needed.

---

## Redeploy after S3 updates

When you upload changed files to S3:

### Application tier

```bash
sudo su - ec2-user
aws s3 sync s3://YOUR-BUCKET/YOUR-PREFIX/ ~/tier4_app/
source ~/.nvm/nvm.sh
cd ~/tier4_app/backend
npm install
pm2 restart bldbusiness-api
```

### Presentation tier

```bash
sudo su - ec2-user
aws s3 sync s3://YOUR-BUCKET/YOUR-PREFIX/ ~/tier4_app/
source ~/.nvm/nvm.sh
cd ~/tier4_app/frontend
npm install
npm run build
sudo cp -r dist/* /usr/share/nginx/html/
```

---

## Troubleshooting

### nvm: "directory does not exist"

You are likely `ssm-user` with `NVM_DIR` pointing at `/home/ec2-user/.nvm`. Fix:

```bash
sudo su - ec2-user
unset NVM_DIR
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
```

### `aws s3 sync` access denied

- Confirm the EC2 **instance profile** is attached
- Test: `aws sts get-caller-identity`
- List objects: `aws s3 ls s3://YOUR-BUCKET/YOUR-PREFIX/`
- IAM policy needs both `s3:ListBucket` and `s3:GetObject`

### API cannot reach Aurora

- Aurora security group allows **3306** from `application-sg`
- `DB_HOST` is the **cluster endpoint**, not the instance endpoint
- Application EC2 is in the **same VPC** as Aurora
- Test from application EC2: `mysql -h ENDPOINT -u appuser -p`

### NGINX returns 502 on `/api`

**Single EC2 (fixed IP):**

- Application tier PM2 is running: `pm2 status`
- NGINX `proxy_pass` matches application tier **private IP**
- `presentation-sg` can reach `application-sg` on port **3200**

**ALB + Auto Scaling:**

- Use `nginx-alb.conf`, not `nginx.conf` with a private IP
- Internal ALB targets are **Healthy** in `bldbusiness-application-tg`
- `internal-alb-sg` allows HTTP **80** from `presentation-sg`
- `application-sg` allows **3200** from `internal-alb-sg` (not from presentation directly)
- NGINX has `resolver` set to your VPC DNS (`grep nameserver /etc/resolv.conf`)

### SSM Session Manager not available

- EC2 has the **AmazonSSMManagedInstanceCore** policy
- Instance has outbound internet (NAT gateway) or VPC endpoints for SSM
- Wait 2–3 minutes after first launch for SSM agent to register

### ALB target unhealthy

- On the presentation EC2: `curl http://localhost/health` must return `200`
- Target group health check path is `/health` (not `/`)
- `presentation-sg` allows HTTP **80** from `alb-sg`
- Presentation EC2 is registered in the target group on port **80**
- NGINX is running: `sudo systemctl status nginx`
- Check target group **Health check details** tab for the exact failure reason

### ALB returns 502 Bad Gateway

- Target is registered and **Healthy** in the target group
- **Public ALB:** presentation NGINX is running; test `curl http://localhost/health` on a presentation instance
- **Internal ALB:** application PM2 is running; test `curl http://localhost:3200/health` on an app instance
- With ASG: NGINX uses **internal ALB DNS** (`nginx-alb.conf`), not a private IP

### HTTPS certificate errors

- ACM certificate is **Issued** and in the **same region** as the ALB
- Listener on port 443 uses that certificate
- Custom domain DNS points to the ALB (Alias A record), not the EC2 IP

---

## Optional — single EC2 (simplest layout)

If you want one server instead of two EC2 instances:

1. Run NGINX + Node on the **same** public EC2 instance.
2. In `nginx.conf`, proxy to `127.0.0.1:3200` instead of the application tier IP.
3. Skip the separate application-tier instance and its security group rules.
4. Aurora security group allows **3306** from that single EC2 security group.

This reduces cost and complexity while keeping Aurora as the managed database.

---

## Reference — key paths on EC2

| Path | Purpose |
|------|---------|
| `/home/ec2-user/tier4_app/` | App root (synced from S3) |
| `/home/ec2-user/tier4_app/backend/.env` | API environment variables |
| `/home/ec2-user/tier4_app/deploy/application-tier/ecosystem.config.js` | PM2 config |
| `/home/ec2-user/tier4_app/deploy/presentation-tier/nginx.conf` | NGINX — single app EC2 (private IP) |
| `/home/ec2-user/tier4_app/deploy/presentation-tier/nginx-alb.conf` | NGINX — app ASG + internal ALB |
| `/usr/share/nginx/html/` | Built React static files |

## Reference — deploy assets in this repo

| File | Use |
|------|-----|
| `data-tier/db.sql` | Aurora schema + seed data |
| `deploy/application-tier/ecosystem.config.js` | PM2 process manager |
| `deploy/presentation-tier/nginx.conf` | NGINX → fixed app EC2 private IP |
| `deploy/presentation-tier/nginx-alb.conf` | NGINX → internal ALB (ASG) |
| `backend/.env.example` | Template for API env vars |
