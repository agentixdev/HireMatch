#!/bin/bash
# Setup visa scraper cron on VPS
# Run: ssh user@187.77.138.237 'bash -s' < scripts/setup-vps-cron.sh

set -euo pipefail

echo "=== HireMatch VPS Visa Scraper Setup ==="

# Install Node.js 22 if not present
if ! command -v node &> /dev/null || [[ $(node -v) != v22* ]]; then
  echo "Installing Node.js 22..."
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
  sudo apt-get install -y nodejs
  echo "Node.js $(node -v) installed."
else
  echo "Node.js $(node -v) already installed."
fi

# Create scraper directory
sudo mkdir -p /opt/hirematch-scraper
sudo chown $USER:$USER /opt/hirematch-scraper

# Copy the scraper script (assumes it's piped or scp'd separately)
cat > /opt/hirematch-scraper/.env << 'ENVEOF'
HIREMATCH_API_URL=https://www.hirematch.com
VPS_SCRAPER_SECRET=CHANGE_ME
ENVEOF

# Setup daily cron at 1:00 AM UTC
# Node.js 22+ can run TypeScript directly with --experimental-strip-types
(crontab -l 2>/dev/null | grep -v hirematch-scraper; echo "0 1 * * * cd /opt/hirematch-scraper && /usr/bin/node --experimental-strip-types scraper.ts >> /var/log/hirematch-scraper.log 2>&1") | crontab -

echo ""
echo "Cron installed. Edit /opt/hirematch-scraper/.env with your VPS_SCRAPER_SECRET"
echo "Deploy scraper: scp scripts/vps-visa-scraper.ts user@187.77.138.237:/opt/hirematch-scraper/scraper.ts"
echo ""
echo "Node.js 22+ runs TypeScript directly via --experimental-strip-types."
echo "No compilation step needed."
