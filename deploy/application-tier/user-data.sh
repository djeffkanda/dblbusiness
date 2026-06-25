#!/bin/bash
# User data script — Application Tier EC2 (Amazon Linux 2023)
# Installs Node.js LTS via nvm and clones the repo.

set -euo pipefail

yum update -y
yum install -y git

# Install nvm + Node LTS
export NVM_DIR="/home/ec2-user/.nvm"
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source "$NVM_DIR/nvm.sh"
nvm install --lts

# Clone and install backend (update REPO_URL)
REPO_URL="https://github.com/YOUR_ORG/tier4_app.git"
git clone "$REPO_URL" /home/ec2-user/tier4_app
cd /home/ec2-user/tier4_app/backend
npm install

echo "Application tier ready. Configure .env and start with: npm start"
