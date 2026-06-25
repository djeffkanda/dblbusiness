# Application Tier

Express.js REST API for **bldbusiness**. Runs on a **private EC2 instance** and connects to the data tier over the VPC.

## Local Development

```bash
cp .env.example .env
npm install
npm run dev
```

API available at `http://localhost:3200/api`.

## AWS Deployment

1. Clone repo on application-tier EC2.
2. Copy `.env.example` → `.env` and set `DB_HOST` to the **data-tier private IP**.
3. Install dependencies and start:

```bash
npm install
npm start
# or with PM2:
npm run serve
```

4. Allow inbound port **3200** only from the presentation-tier security group.

## Environment Variables

| Variable | Description |
|----------|-------------|
| `PORT` | API listen port (default `3200`) |
| `DB_HOST` | Data tier MySQL host |
| `DB_PORT` | MySQL port |
| `DB_USER` | Database user |
| `DB_PASSWORD` | Database password |
| `DB_NAME` | Database name |
| `CORS_ORIGIN` | Allowed frontend origin |

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| GET/POST | `/api/agents` | List / create agents |
| GET/PUT/DELETE | `/api/agents/:id` | Agent CRUD |
| GET | `/api/properties/stats` | Dashboard statistics |
| GET/POST | `/api/properties` | List / create properties |
| GET/PUT/DELETE | `/api/properties/:id` | Property CRUD |

See `deploy/application-tier/` for systemd/PM2 templates.
