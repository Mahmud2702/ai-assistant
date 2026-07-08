#!/bin/bash

# ── AI Assistant Manager ──────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_header() {
    echo -e "\n${BLUE}═══════════════════════════════════${NC}"
    echo -e "${BLUE}   🤖 AI Assistant Manager${NC}"
    echo -e "${BLUE}═══════════════════════════════════${NC}\n"
}

case "$1" in

  start)
    print_header
    echo -e "${GREEN}▶ System চালু করছি...${NC}"
    docker compose up -d --build
    echo -e "\n${GREEN}✅ System চালু হয়েছে!${NC}"
    echo -e "📡 API: http://localhost:8800"
    echo -e "📖 Docs: http://localhost:8800/docs"
    echo ""
    echo -e "${YELLOW}📱 WhatsApp QR Code দেখতে:${NC}"
    echo -e "   docker logs -f whatsapp-bot"
    ;;

  stop)
    echo -e "${RED}⏹ System বন্ধ করছি...${NC}"
    docker compose down
    echo -e "${GREEN}✅ বন্ধ হয়েছে${NC}"
    ;;

  restart)
    echo -e "${YELLOW}🔄 Restart করছি...${NC}"
    docker compose restart
    echo -e "${GREEN}✅ Restart সম্পন্ন${NC}"
    ;;

  logs)
    SERVICE=${2:-""}
    if [ -z "$SERVICE" ]; then
      docker compose logs -f --tail=50
    else
      docker logs -f "$SERVICE" --tail=50
    fi
    ;;

  qr)
    echo -e "${YELLOW}📱 WhatsApp QR Code:${NC}"
    docker logs -f whatsapp-bot 2>&1 | grep -A 30 "QR Code"
    ;;

  status)
    print_header
    echo -e "${BLUE}📊 Container Status:${NC}"
    docker compose ps
    echo ""
    echo -e "${BLUE}🌐 API Health:${NC}"
    curl -s http://localhost:8800/health | python3 -m json.tool 2>/dev/null || echo "API চালু নেই"
    ;;

  test)
    echo -e "${YELLOW}🧪 API Test করছি...${NC}"
    echo ""
    echo "Health Check:"
    curl -s http://localhost:8800/health
    echo ""
    echo ""
    echo "Text Summary Test:"
    curl -s -X POST http://localhost:8800/text/process \
      -H "Content-Type: application/json" \
      -H "x-api-key: legallens_secret_2024" \
      -d '{"text": "আজকে আমরা একটা নতুন project শুরু করলাম। এই project এ আমরা AI দিয়ে documents process করব।", "mode": "summary"}'
    echo ""
    ;;

  update)
    echo -e "${YELLOW}🔄 Update করছি...${NC}"
    docker compose pull
    docker compose up -d --build
    echo -e "${GREEN}✅ Update সম্পন্ন${NC}"
    ;;

  *)
    print_header
    echo "ব্যবহার: ./manage.sh [command]"
    echo ""
    echo "Commands:"
    echo "  start     — সব service চালু করো"
    echo "  stop      — সব service বন্ধ করো"
    echo "  restart   — restart করো"
    echo "  status    — status দেখো"
    echo "  logs      — logs দেখো"
    echo "  logs api  — শুধু API logs"
    echo "  logs whatsapp-bot — WhatsApp logs"
    echo "  qr        — WhatsApp QR code দেখো"
    echo "  test      — API test করো"
    echo "  update    — latest version নাও"
    ;;

esac
