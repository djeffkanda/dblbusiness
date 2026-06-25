# Presentation Tier

React + Vite single-page application for **bldbusiness**. Built to static files and served by **NGINX** on the public-facing EC2 instance.

## Local Development

```bash
cp .env.example .env
npm install
npm run dev
```

App available at `http://localhost:5173`.

## AWS Deployment

1. Build on presentation-tier EC2 (or CI):

```bash
npm install
# Set VITE_API_URL=/api for NGINX reverse proxy
echo "VITE_API_URL=/api" > .env
npm run build
```

2. Copy `dist/` to NGINX web root:

```bash
sudo cp -r dist/* /usr/share/nginx/html/
```

3. Configure NGINX (see `deploy/presentation-tier/nginx.conf`).

## Environment Variables

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | API base URL. Use `/api` in production (NGINX proxy) or `http://localhost:3200/api` locally |
