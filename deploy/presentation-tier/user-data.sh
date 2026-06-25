#!/bin/bash
# User data script — Presentation Tier EC2 (Amazon Linux 2023)
# Installs NGINX and serves a placeholder until the React build is deployed.

set -euo pipefail

yum update -y
yum install -y nginx git

systemctl enable nginx
systemctl start nginx

cat > /usr/share/nginx/html/index.html <<'EOF'
<!DOCTYPE html>
<html>
<head><title>bldbusiness — Presentation Tier</title></head>
<body style="font-family:sans-serif;text-align:center;padding:4rem;">
  <h1>bldbusiness Presentation Tier</h1>
  <p>Deploy the React build from <code>frontend/dist</code> to replace this page.</p>
</body>
</html>
EOF

echo "Presentation tier NGINX ready."
