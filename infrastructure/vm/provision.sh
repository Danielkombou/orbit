#!/bin/bash
# ORBIT VM provisioning script
set -euo pipefail

echo "Provisioning ORBIT VM..."

# Install system deps
apt-get update && apt-get install -y \
  curl git build-essential

# Install Node.js via nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm install 22
nvm use 22

# Install pnpm
corepack enable
corepack prepare pnpm@11.9.0 --activate

# Install Python
apt-get install -y python3 python3-pip python3-venv

# Clone and setup ORBIT
git clone https://github.com/user/orbit /opt/orbit
cd /opt/orbit
pnpm install

echo "ORBIT VM provisioned successfully."
