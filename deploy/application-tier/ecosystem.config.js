# PM2 ecosystem file — Application Tier
# Usage: pm2 start deploy/application-tier/ecosystem.config.js

module.exports = {
  apps: [
    {
      name: 'bldbusiness-api',
      cwd: '/home/ec2-user/tier4_app/backend',
      script: 'server.js',
      instances: 1,
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: 'production',
        PORT: 3200,
        DB_HOST: 'DATA_TIER_PRIVATE_IP',
        DB_PORT: 3306,
        DB_USER: 'appuser',
        DB_PASSWORD: 'apppass',
        DB_NAME: 'bldbusiness',
        CORS_ORIGIN: '*',
      },
    },
  ],
};
