#!/bin/bash
# Deploy Ollama to VPS for FREE AI Ensemble
# Works on: Oracle Cloud, Hostinger, Alibaba ECS, any Linux VPS

set -e

echo "🚀 Deploying Ollama to VPS for FREE AI Ensemble"
echo "================================================"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
OLLAMA_HOST="${OLLAMA_HOST:-0.0.0.0}"
OLLAMA_PORT="${OLLAMA_PORT:-11434}"
MODELS="${MODELS:-llama3.2:8b mistral:7b}"

# Detect OS
detect_os() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS=$NAME
        VER=$VERSION_ID
    elif type lsb_release >/dev/null 2>&1; then
        OS=$(lsb_release -si)
        VER=$(lsb_release -sr)
    else
        OS=$(uname -s)
        VER=$(uname -r)
    fi
    echo -e "${CYAN}Detected OS: $OS $VER${NC}"
}

# Install Ollama
install_ollama() {
    echo -e "${CYAN}📥 Installing Ollama...${NC}"
    
    if command -v ollama &> /dev/null; then
        echo -e "${GREEN}✅ Ollama already installed${NC}"
        return 0
    fi
    
    # Install using official script
    curl -fsSL https://ollama.ai/install.sh | sh
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Ollama installed successfully${NC}"
    else
        echo -e "${RED}❌ Ollama installation failed${NC}"
        exit 1
    fi
}

# Configure Ollama for remote access
configure_ollama() {
    echo -e "${CYAN}⚙️ Configuring Ollama for remote access...${NC}"
    
    # Stop Ollama if running
    sudo systemctl stop ollama 2>/dev/null || true
    
    # Create systemd override directory
    sudo mkdir -p /etc/systemd/system/ollama.service.d
    
    # Create override configuration
    cat << EOF | sudo tee /etc/systemd/system/ollama.service.d/override.conf
[Service]
Environment="OLLAMA_HOST=${OLLAMA_HOST}"
EOF
    
    # Reload systemd
    sudo systemctl daemon-reload
    
    # Start Ollama
    sudo systemctl start ollama
    sudo systemctl enable ollama
    
    echo -e "${GREEN}✅ Ollama configured to listen on ${OLLAMA_HOST}:${OLLAMA_PORT}${NC}"
}

# Open firewall
configure_firewall() {
    echo -e "${CYAN}🔥 Configuring firewall...${NC}"
    
    # Try different firewall tools
    if command -v ufw &> /dev/null; then
        sudo ufw allow ${OLLAMA_PORT}/tcp
        echo -e "${GREEN}✅ UFW: Port ${OLLAMA_PORT} opened${NC}"
    elif command -v firewall-cmd &> /dev/null; then
        sudo firewall-cmd --permanent --add-port=${OLLAMA_PORT}/tcp
        sudo firewall-cmd --reload
        echo -e "${GREEN}✅ Firewalld: Port ${OLLAMA_PORT} opened${NC}"
    else
        # Use iptables directly
        sudo iptables -I INPUT -p tcp --dport ${OLLAMA_PORT} -j ACCEPT
        echo -e "${GREEN}✅ iptables: Port ${OLLAMA_PORT} opened${NC}"
        
        # Save iptables rules
        if command -v iptables-save &> /dev/null; then
            sudo iptables-save | sudo tee /etc/iptables.rules > /dev/null
        fi
    fi
}

# Pull models
pull_models() {
    echo -e "${CYAN}📦 Pulling models...${NC}"
    
    # Wait for Ollama to be ready
    sleep 5
    
    for model in $MODELS; do
        echo -e "${YELLOW}📥 Pulling $model...${NC}"
        ollama pull $model
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ $model ready${NC}"
        else
            echo -e "${RED}⚠️ Failed to pull $model${NC}"
        fi
    done
}

# Test installation
test_installation() {
    echo -e "${CYAN}🧪 Testing Ollama API...${NC}"
    
    # Test local API
    response=$(curl -s http://localhost:${OLLAMA_PORT}/api/tags)
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Ollama API is responding${NC}"
        echo "$response" | head -c 200
        echo ""
    else
        echo -e "${RED}❌ Ollama API test failed${NC}"
    fi
}

# Create connection info
create_connection_info() {
    echo -e "${CYAN}📝 Creating connection info...${NC}"
    
    # Get public IP
    PUBLIC_IP=$(curl -s ifconfig.me || curl -s icanhazip.com || echo "YOUR_VPS_IP")
    
    cat << EOF

================================================
🎉 VPS Ollama Deployment Complete!
================================================

Connection Details:
  URL: http://${PUBLIC_IP}:${OLLAMA_PORT}
  
Add to your .env.local:
  VPS_OLLAMA_URL=http://${PUBLIC_IP}:${OLLAMA_PORT}

Test from your local machine:
  curl http://${PUBLIC_IP}:${OLLAMA_PORT}/api/tags

Models installed:
$(ollama list 2>/dev/null || echo "  Run 'ollama list' to see models")

💰 Cost: \$0.00 (Running on your VPS!)

================================================
EOF
}

# Main execution
main() {
    detect_os
    install_ollama
    configure_ollama
    configure_firewall
    pull_models
    test_installation
    create_connection_info
}

# Run main function
main "$@"
