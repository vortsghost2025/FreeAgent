#!/bin/bash
# deploy.sh - One-command deployment to Hostinger VPS
# Usage: ./deploy.sh
# Runs on YOUR LOCAL MACHINE, deploys to VPS at 187.77.3.56

set -e

VPS_IP="187.77.3.56"
VPS_USER="root"
DEPLOY_DIR="/app/federation-game"
GAME_DOMAIN="game.deliberateensemble.works"

echo "============================================"
echo " FEDERATION GAME DEPLOYMENT"
echo " Target: $VPS_USER@$VPS_IP"
echo " Domain: $GAME_DOMAIN"
echo "============================================"

# Step 1: Package the game
echo ""
echo "[1/6] Packaging game files..."
cd "$(dirname "$0")/.."

# Create deployment package
tar -czf /tmp/federation-game.tar.gz \
    --exclude='*.pyc' \
    --exclude='__pycache__' \
    --exclude='.venv*' \
    --exclude='node_modules' \
    --exclude='*.log' \
    --exclude='federation_saves' \
    --exclude='tmpclaude-*' \
    uss-chaosbringer/ \
    DISTRIBUTED_MICROSERVICES_UNIVERSE/game_api.py \
    DISTRIBUTED_MICROSERVICES_UNIVERSE/Dockerfile \
    DISTRIBUTED_MICROSERVICES_UNIVERSE/docker-compose.yml \
    DISTRIBUTED_MICROSERVICES_UNIVERSE/nginx.conf \
    DISTRIBUTED_MICROSERVICES_UNIVERSE/requirements.txt \
    DISTRIBUTED_MICROSERVICES_UNIVERSE/frontend/

echo "[OK] Package created: /tmp/federation-game.tar.gz"

# Step 2: Upload to VPS
echo ""
echo "[2/6] Uploading to VPS..."
ssh $VPS_USER@$VPS_IP "mkdir -p $DEPLOY_DIR"
scp /tmp/federation-game.tar.gz $VPS_USER@$VPS_IP:/tmp/
echo "[OK] Upload complete"

# Step 3: Extract on VPS
echo ""
echo "[3/6] Extracting on VPS..."
ssh $VPS_USER@$VPS_IP "
    cd $DEPLOY_DIR &&
    tar -xzf /tmp/federation-game.tar.gz &&
    cp DISTRIBUTED_MICROSERVICES_UNIVERSE/Dockerfile . &&
    cp DISTRIBUTED_MICROSERVICES_UNIVERSE/docker-compose.yml . &&
    cp DISTRIBUTED_MICROSERVICES_UNIVERSE/nginx.conf . &&
    cp DISTRIBUTED_MICROSERVICES_UNIVERSE/requirements.txt . &&
    cp DISTRIBUTED_MICROSERVICES_UNIVERSE/game_api.py . &&
    cp -r DISTRIBUTED_MICROSERVICES_UNIVERSE/frontend ./frontend
"
echo "[OK] Extracted"

# Step 4: Install Docker if needed
echo ""
echo "[4/6] Checking Docker..."
ssh $VPS_USER@$VPS_IP "
    if ! command -v docker &> /dev/null; then
        echo 'Installing Docker...'
        curl -fsSL https://get.docker.com | sh
        systemctl enable docker
        systemctl start docker
    else
        echo 'Docker already installed'
    fi
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null 2>&1; then
        apt-get install -y docker-compose-plugin
    fi
"
echo "[OK] Docker ready"

# Step 5: SSL cert (certbot)
echo ""
echo "[5/6] SSL Certificate..."
ssh $VPS_USER@$VPS_IP "
    if [ ! -f /etc/letsencrypt/live/$GAME_DOMAIN/fullchain.pem ]; then
        apt-get install -y certbot
        # Stop any service on port 80 temporarily
        docker stop federation-nginx 2>/dev/null || true
        certbot certonly --standalone -d $GAME_DOMAIN --non-interactive --agree-tos --email admin@deliberateensemble.works
        echo 'SSL cert obtained'
    else
        echo 'SSL cert already exists'
    fi
"
echo "[OK] SSL ready"

# Step 6: Build and start containers
echo ""
echo "[6/6] Starting containers..."
ssh $VPS_USER@$VPS_IP "
    cd $DEPLOY_DIR &&
    docker compose down 2>/dev/null || true &&
    docker compose build --no-cache &&
    docker compose up -d &&
    sleep 5 &&
    docker compose ps
"

echo ""
echo "============================================"
echo " DEPLOYMENT COMPLETE"
echo " Game live at: https://$GAME_DOMAIN"
echo " API docs at:  https://$GAME_DOMAIN/docs"
echo " Health check: https://$GAME_DOMAIN/health"
echo "============================================"

# Quick health check
sleep 3
if curl -sf "http://$VPS_IP:8000/health" > /dev/null 2>&1; then
    echo "[OK] Health check passed - game is running!"
else
    echo "[!!] Health check pending - check logs with:"
    echo "     ssh root@$VPS_IP 'docker logs federation-game'"
fi
