# deploy.ps1 - Deploy Federation Game to Hostinger VPS
# Run from PowerShell: .\DISTRIBUTED_MICROSERVICES_UNIVERSE\deploy.ps1

$VPS_IP = "187.77.3.56"
$VPS_USER = "root"
$DEPLOY_DIR = "/app/federation-game"
$GAME_DOMAIN = "game.deliberateensemble.works"

Write-Host "============================================" -ForegroundColor Cyan
Write-Host " FEDERATION GAME DEPLOYMENT" -ForegroundColor Cyan
Write-Host " Target: $VPS_USER@$VPS_IP" -ForegroundColor Cyan
Write-Host " Domain: $GAME_DOMAIN" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan

# Step 1: Upload files directly via scp (no tar needed)
Write-Host "`n[1/4] Creating deploy directory on VPS..." -ForegroundColor Yellow
ssh "$VPS_USER@$VPS_IP" "mkdir -p $DEPLOY_DIR/uss-chaosbringer $DEPLOY_DIR/frontend"

Write-Host "`n[2/4] Uploading game engine (this takes a minute)..." -ForegroundColor Yellow
scp -r "C:\workspace\uss-chaosbringer\" "${VPS_USER}@${VPS_IP}:${DEPLOY_DIR}/uss-chaosbringer/"
Write-Host "[OK] Game engine uploaded" -ForegroundColor Green

Write-Host "`n[3/4] Uploading API, Dockerfile, frontend..." -ForegroundColor Yellow
scp "C:\workspace\DISTRIBUTED_MICROSERVICES_UNIVERSE\game_api.py" "${VPS_USER}@${VPS_IP}:${DEPLOY_DIR}/"
scp "C:\workspace\DISTRIBUTED_MICROSERVICES_UNIVERSE\Dockerfile" "${VPS_USER}@${VPS_IP}:${DEPLOY_DIR}/"
scp "C:\workspace\DISTRIBUTED_MICROSERVICES_UNIVERSE\docker-compose.yml" "${VPS_USER}@${VPS_IP}:${DEPLOY_DIR}/"
scp "C:\workspace\DISTRIBUTED_MICROSERVICES_UNIVERSE\nginx.conf" "${VPS_USER}@${VPS_IP}:${DEPLOY_DIR}/"
scp "C:\workspace\DISTRIBUTED_MICROSERVICES_UNIVERSE\requirements.txt" "${VPS_USER}@${VPS_IP}:${DEPLOY_DIR}/"
scp "C:\workspace\DISTRIBUTED_MICROSERVICES_UNIVERSE\frontend\index.html" "${VPS_USER}@${VPS_IP}:${DEPLOY_DIR}/frontend/"
Write-Host "[OK] Files uploaded" -ForegroundColor Green

Write-Host "`n[4/4] Building and starting containers on VPS..." -ForegroundColor Yellow

# Run each command separately to avoid Windows line ending issues
ssh "$VPS_USER@$VPS_IP" "command -v docker || (curl -fsSL https://get.docker.com | sh && systemctl enable docker && systemctl start docker)"
ssh "$VPS_USER@$VPS_IP" "docker compose version || apt-get install -y docker-compose-plugin"
ssh "$VPS_USER@$VPS_IP" "apt-get install -y certbot 2>/dev/null; true"
ssh "$VPS_USER@$VPS_IP" "[ -f /etc/letsencrypt/live/game.deliberateensemble.works/fullchain.pem ] && echo 'SSL exists' || (docker stop federation-nginx 2>/dev/null; certbot certonly --standalone -d game.deliberateensemble.works --non-interactive --agree-tos --email admin@deliberateensemble.works)"
ssh "$VPS_USER@$VPS_IP" "cd /app/federation-game && docker compose down 2>/dev/null; true"
ssh "$VPS_USER@$VPS_IP" "cd /app/federation-game && docker compose build --no-cache"
ssh "$VPS_USER@$VPS_IP" "cd /app/federation-game && docker compose up -d && sleep 5 && docker compose ps"

Write-Host "`n============================================" -ForegroundColor Green
Write-Host " DEPLOYMENT COMPLETE" -ForegroundColor Green
Write-Host " Game: https://$GAME_DOMAIN" -ForegroundColor Green
Write-Host " API docs: https://$GAME_DOMAIN/docs" -ForegroundColor Green
Write-Host " Health: https://$GAME_DOMAIN/health" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
