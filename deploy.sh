#!/bin/bash
set -e

REMOTE_USER="ec2-user"
REMOTE_HOST="13.53.137.72"
REMOTE_PATH="/home/ec2-user/blockvote-app"
PEM_KEY="$HOME/.ssh/my-linux-key.pem"

echo "🔨 Building frontend..."
cd frontend
npm run build
cd ..

echo "📦 Syncing to server..."
rsync -avz \
  --delete \
  --exclude node_modules \
  --exclude .env \
  --exclude .git \
  -e "ssh -i $PEM_KEY" \
  . "$REMOTE_USER@$REMOTE_HOST:$REMOTE_PATH/"

echo "🚀 Restarting services on server..."
ssh -i "$PEM_KEY" "$REMOTE_USER@$REMOTE_HOST" << 'EOF'
  set -e
  cd /home/ec2-user/blockvote-app

  echo "Installing backend dependencies..."
  cd backend && npm install && cd ..

  echo "Setting environment variables..."
  if [ ! -f backend/.env ]; then
    echo "⚠️  Creating backend/.env (add your Pinata keys)"
    cat > backend/.env << 'ENVEOF'
PINATA_API_KEY=your_pinata_api_key
PINATA_SECRET_API_KEY=your_pinata_secret_key
PORT=3001
NODE_ENV=production
ENVEOF
    echo "⚠️  Edit /home/ec2-user/blockvote-app/backend/.env with your Pinata credentials"
  fi

  echo "Starting backend with PM2..."
  pm2 start ecosystem.config.js || pm2 restart ecosystem.config.js
  pm2 save

  echo "Reloading Nginx..."
  sudo nginx -s reload

  echo "✅ Deployment complete!"
  pm2 status
EOF

echo "✅ Deployed to http://13.53.137.72"
