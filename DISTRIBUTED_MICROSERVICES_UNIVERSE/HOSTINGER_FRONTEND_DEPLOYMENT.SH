#!/bin/bash
# 
# HOSTINGER_FRONTEND_DEPLOYMENT.SH
# Deploy frontend files to Hostinger server via FTP
#

set -e

echo "🚀 INITIATING HOSTINGER FRONTEND DEPLOYMENT 🚀"
echo "Deploying frontend files to Hostinger server..."

# Configuration
HOSTINGER_FTP_SERVER="ftp.yourdomain.com"
HOSTINGER_FTP_USER="your_ftp_username"
HOSTINGER_FTP_PASS="your_ftp_password"
HOSTINGER_REMOTE_DIR="/public_html"

# Frontend build directory
FRONTEND_BUILD_DIR="./frontend_build"

# Build frontend if using a framework
if [ -f "package.json" ]; then
    echo "Building frontend application..."
    npm run build
    # Move build output to standard directory
    if [ -d "dist" ]; then
        cp -r dist/* "$FRONTEND_BUILD_DIR/"
    elif [ -d "build" ]; then
        cp -r build/* "$FRONTEND_BUILD_DIR/"
    fi
else
    # If not using framework, assume files are in public_html
    cp -r public_html/* "$FRONTEND_BUILD_DIR/"
fi

# Create public_html directory if it doesn't exist
mkdir -p "$FRONTEND_BUILD_DIR/public_html"

# Upload files to Hostinger via FTP
echo "Uploading files to Hostinger server..."
lftp -c "
open ftp://$HOSTINGER_FTP_USER:$HOSTINGER_FTP_PASS@$HOSTINGER_FTP_SERVER
cd $HOSTINGER_REMOTE_DIR
mirror --reverse --delete --verbose $FRONTEND_BUILD_DIR/public_html ./
bye
"

echo "✅ FRONTEND DEPLOYMENT COMPLETE ✅"
echo "Frontend files uploaded to Hostinger server"
echo "Visit your domain to see the updated site!"

exit 0
