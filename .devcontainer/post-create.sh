#!/usr/bin/env bash
set -euo pipefail

# Support both /workspace (devcontainer mount) and /workspace/tier4_app layouts
if [ -d "/workspace/tier4_app/backend" ]; then
  APP_ROOT="/workspace/tier4_app"
elif [ -d "/workspace/backend" ]; then
  APP_ROOT="/workspace"
else
  echo "Could not find bldbusiness project root"
  exit 1
fi

echo "==> bldbusiness dev container setup ($APP_ROOT)"

cp -n "$APP_ROOT/backend/.env.example" "$APP_ROOT/backend/.env" 2>/dev/null || true
cp -n "$APP_ROOT/frontend/.env.example" "$APP_ROOT/frontend/.env" 2>/dev/null || true

echo "==> Installing backend dependencies"
cd "$APP_ROOT/backend" && npm install

echo "==> Installing frontend dependencies"
cd "$APP_ROOT/frontend" && npm install

echo "==> Ensuring auth schema"
cd "$APP_ROOT/backend" && node -e "
const db = require('./configs/db');
const bcrypt = require('bcryptjs');
(async () => {
  await db.query(\`
    CREATE TABLE IF NOT EXISTS user (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      email VARCHAR(180) NOT NULL UNIQUE,
      passwordHash VARCHAR(255) NOT NULL,
      role ENUM('admin', 'user') NOT NULL DEFAULT 'user',
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  \`);
  const hash = bcrypt.hashSync('admin123', 10);
  await db.query(
    'INSERT IGNORE INTO user (name, email, passwordHash, role) VALUES (?, ?, ?, ?)',
    ['Admin User', 'admin@bldbusiness.com', hash, 'admin']
  );
  process.exit(0);
})().catch(e => { console.error(e.message); process.exit(1); });
"

echo ""
echo "Ready! From $APP_ROOT run in separate terminals:"
echo "  Application tier:  cd $APP_ROOT/backend && npm run dev"
echo "  Presentation tier: cd $APP_ROOT/frontend && npm run dev"
echo ""
echo "Open http://localhost:5173 — login: admin@bldbusiness.com / admin123"
echo ""
