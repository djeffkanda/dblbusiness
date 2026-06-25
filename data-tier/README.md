# Data Tier

MySQL 8.0 database for **bldbusiness**. This tier runs on a **private EC2 instance** in AWS and is only reachable from the application tier.

## Local (Docker)

```bash
docker compose up data-tier -d
```

Schema and seed data load automatically from `db.sql`.

## AWS Deployment

1. Install MySQL 8.0 on the data-tier EC2 instance (see root `README.md`).
2. Copy `db.sql` to the instance and run:

```bash
mysql -u root -p < db.sql
```

3. Restrict inbound traffic: allow port **3306** only from the application-tier security group.

## Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `DB_ROOT_PASSWORD` | MySQL root password | `rootpass` |
| `DB_NAME` | Database name | `bldbusiness` |
| `DB_USER` | Application user | `appuser` |
| `DB_PASSWORD` | Application password | `apppass` |
| `DB_PORT` | MySQL port | `3306` |

Copy `.env.example` to `.env` for local Docker Compose overrides.
