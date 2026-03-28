#!/bin/bash
MSG=${1:-"update"}
source .deploy-secrets
git add -A && git commit -m "$MSG" && git push
sshpass -p "$VPS_PASSWORD" ssh -o StrictHostKeyChecking=no root@187.77.129.84 "
  cd /var/www/privilee-dashboard &&
  git pull &&
  npm install --production=false &&
  rm -rf .next &&
  npm run build &&
  pm2 restart privilee-dashboard
"
