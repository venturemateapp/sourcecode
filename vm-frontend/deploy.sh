#!/bin/bash
# VentureMate Frontend Deployment Script (VM2)
# Usage: ./deploy.sh

set -e

# ==================== CONFIGURATION ====================
SERVER_HOST="139.162.170.220"
SERVER_USER="root"
SERVER_PASS="startupos.2026"
LOCAL_PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
REMOTE_PROJECT_DIR="/root/venturemate-vm2"
PORT="3000"
# =======================================================

echo "======================================"
echo "  VentureMate Frontend Deployment"
echo "======================================"
echo ""

# Check if sshpass is installed
if ! command -v sshpass &> /dev/null; then
    echo "❌ sshpass is not installed. Installing..."
    if command -v apt-get &> /dev/null; then
        sudo apt-get update && sudo apt-get install -y sshpass
    elif command -v yum &> /dev/null; then
        sudo yum install -y sshpass
    elif command -v brew &> /dev/null; then
        brew install hudochenkov/sshpass/sshpass
    else
        echo "❌ Please install sshpass manually"
        exit 1
    fi
fi

# SSH alias for convenience
SSH_CMD="sshpass -p '$SERVER_PASS' ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o ConnectTimeout=10"
SCP_CMD="sshpass -p '$SERVER_PASS' scp -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o ConnectTimeout=10"

echo "📁 Step 1: Preparing local project..."
cd "$LOCAL_PROJECT_DIR"

# Check if node_modules exists locally (for build)
if [ ! -d "node_modules" ]; then
    echo "   Installing dependencies locally..."
    npm install
fi

echo ""
echo "📦 Step 2: Creating deployment archive..."
echo "   Excluding: .git, node_modules, dist, *.zip, *.tar.gz"

# Create tar archive excluding unnecessary files
tar czf /tmp/vm2-deploy.tar.gz \
    --exclude='.git' \
    --exclude='node_modules' \
    --exclude='dist' \
    --exclude='*.zip' \
    --exclude='*.tar.gz' \
    --exclude='.DS_Store' \
    --exclude='*.log' \
    --exclude='.env.local' \
    --exclude='.vscode' \
    --exclude='*.md' \
    -C "$LOCAL_PROJECT_DIR" .

DEPLOY_SIZE=$(du -h /tmp/vm2-deploy.tar.gz | cut -f1)
echo "   Archive size: $DEPLOY_SIZE"

echo ""
echo "🚀 Step 3: Stopping existing service on port $PORT..."
eval "$SSH_CMD $SERVER_USER@$SERVER_HOST 'fuser -k ${PORT}/tcp 2>/dev/null || true'" 2>/dev/null || true
eval "$SSH_CMD $SERVER_USER@$SERVER_HOST 'pkill -f "npm start" 2>/dev/null || true'" 2>/dev/null || true
eval "$SSH_CMD $SERVER_USER@$SERVER_HOST 'pkill -f "vite" 2>/dev/null || true'" 2>/dev/null || true
eval "$SSH_CMD $SERVER_USER@$SERVER_HOST 'sleep 2'" 2>/dev/null || true
echo "   Service stopped"

echo ""
echo "⬆️  Step 4: Uploading code to server..."
eval "$SSH_CMD $SERVER_USER@$SERVER_HOST 'mkdir -p $REMOTE_PROJECT_DIR'" 2>/dev/null
eval "$SCP_CMD /tmp/vm2-deploy.tar.gz $SERVER_USER@$SERVER_HOST:/tmp/" 2>/dev/null
echo "   Upload complete"

echo ""
echo "📂 Step 5: Extracting and setting up project..."
eval "$SSH_CMD $SERVER_USER@$SERVER_HOST 'cd $REMOTE_PROJECT_DIR && rm -rf * .[^.]* 2>/dev/null || true && tar xzf /tmp/vm2-deploy.tar.gz && rm /tmp/vm2-deploy.tar.gz'" 2>/dev/null
echo "   Extraction complete"

echo ""
echo "📋 Step 6: Creating production .env file..."
PROD_ENV='VITE_API_URL=http://139.162.170.220:8080/api/v1
VITE_APP_NAME=VentureMate
VITE_APP_ENV=production'

echo "$PROD_ENV" | eval "$SSH_CMD $SERVER_USER@$SERVER_HOST 'cat > $REMOTE_PROJECT_DIR/.env'" 2>/dev/null
echo "   .env file created"

echo ""
echo "📦 Step 7: Installing dependencies on server..."
echo "   This may take a few minutes..."
eval "$SSH_CMD $SERVER_USER@$SERVER_HOST 'cd $REMOTE_PROJECT_DIR && npm install --production=false 2>&1'" 2>/dev/null | tail -5
echo "   Dependencies installed"

echo ""
echo "🔨 Step 8: Building the application..."
echo "   Building for production..."
eval "$SSH_CMD $SERVER_USER@$SERVER_HOST 'cd $REMOTE_PROJECT_DIR && npm run build 2>&1'" 2>/dev/null | tail -10

# Check if build succeeded
BUILD_SUCCESS=$(eval "$SSH_CMD $SERVER_USER@$SERVER_HOST 'test -d $REMOTE_PROJECT_DIR/dist && echo yes || echo no'" 2>/dev/null)

if [ "$BUILD_SUCCESS" = "yes" ]; then
    echo "   ✅ Build successful!"
else
    echo "   ❌ Build failed!"
    echo "   Checking for errors..."
    eval "$SSH_CMD $SERVER_USER@$SERVER_HOST 'cd $REMOTE_PROJECT_DIR && npm run build 2>&1 | tail -30'" 2>/dev/null || true
    exit 1
fi

echo ""
echo "🚀 Step 9: Starting the application..."
eval "$SSH_CMD $SERVER_USER@$SERVER_HOST 'cd $REMOTE_PROJECT_DIR && export PORT=$PORT && (nohup npm start > /tmp/vm2-app.log 2>&1 &) && sleep 2'" 2>/dev/null
echo "   Application started in background"

echo ""
echo "⏳ Step 10: Waiting for service to initialize..."
sleep 5

echo ""
echo "======================================"
echo "  ✅ Deployment Complete!"
echo "======================================"
echo ""

# Verification
echo "🔍 Step 11: Verification..."

# Check if process is running
PROCESS_STATUS=$(eval "$SSH_CMD $SERVER_USER@$SERVER_HOST 'pgrep -f "npm start" > /dev/null && echo ✅ Running || echo ❌ Not Running'" 2>/dev/null)
PORT_STATUS=$(eval "$SSH_CMD $SERVER_USER@$SERVER_HOST 'netstat -tlnp 2>/dev/null | grep -q ":$PORT " && echo ✅ Port $PORT Open || echo ❌ Port $PORT Closed'" 2>/dev/null || echo "⚠️  Cannot check port")

echo "   Process Status: $PROCESS_STATUS"
echo "   Port Status: $PORT_STATUS"

echo ""
echo "🌐 Application URLs:"
echo "   • Direct:     http://$SERVER_HOST:$PORT"
echo "   • Via Caddy:  http://$SERVER_HOST"
echo ""

# Health check
HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://$SERVER_HOST:$PORT/ 2>/dev/null || echo "000")
echo "🧪 Health Check: HTTP $HEALTH_STATUS"

if [ "$HEALTH_STATUS" = "200" ] || [ "$HEALTH_STATUS" = "304" ]; then
    echo ""
    echo "🎉 Application is running successfully!"
else
    echo ""
    echo "⚠️  Application may still be starting up"
    echo "   Check logs with:"
    echo "     ssh $SERVER_USER@$SERVER_HOST 'tail -f /tmp/vm2-app.log'"
fi

echo ""
echo "======================================"
echo "  Deployment finished at $(date)"
echo "======================================"
echo ""
echo "💡 Useful commands:"
echo "   View logs:    ssh $SERVER_USER@$SERVER_HOST 'tail -f /tmp/vm2-app.log'"
echo "   Restart app:  ssh $SERVER_USER@$SERVER_HOST 'cd $REMOTE_PROJECT_DIR && npm start'"
echo "   Stop app:     ssh $SERVER_USER@$SERVER_HOST 'pkill -f \"npm start\"'"

# Cleanup local archive
rm -f /tmp/vm2-deploy.tar.gz 2>/dev/null || true

echo ""
echo "✅ Done! Your terminal is free to use."
exit 0
