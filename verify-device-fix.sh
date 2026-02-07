#!/bin/bash

# Device Status Fix Verification Script
# This script helps verify that all device status and control fixes are working

echo "🔍 Device Status Fix Verification"
echo "=================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

DB_HOST=${DATABASE_HOST:-localhost}
DB_PORT=${DATABASE_PORT:-5432}
DB_NAME=${DATABASE_NAME:-digital_signage}
DB_USER=${DATABASE_USER:-postgres}
DB_PASSWORD=${DATABASE_PASSWORD:-postgres}

export PGPASSWORD=$DB_PASSWORD

echo "1️⃣  Checking Database Migration (is_playing column)"
echo "---------------------------------------------------"
COLUMN_CHECK=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT column_name FROM information_schema.columns WHERE table_name='devices' AND column_name='is_playing';" 2>/dev/null | xargs)

if [ "$COLUMN_CHECK" = "is_playing" ]; then
    echo -e "${GREEN}✅ is_playing column exists${NC}"
else
    echo -e "${RED}❌ is_playing column missing${NC}"
    echo "   Run: psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f database/migrations/add_device_is_playing.sql"
fi
echo ""

echo "2️⃣  Checking Current Devices"
echo "----------------------------"
DEVICE_COUNT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM devices;" 2>/dev/null | xargs)
echo "   Total devices: $DEVICE_COUNT"

if [ "$DEVICE_COUNT" -gt 0 ]; then
    echo ""
    echo "   Device Status Summary:"
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
        SELECT 
            device_name,
            CASE 
                WHEN last_heartbeat IS NULL THEN 'offline (never connected)'
                WHEN last_heartbeat > NOW() - INTERVAL '2 minutes' THEN 'online'
                ELSE 'offline (last seen: ' || TO_CHAR(last_heartbeat, 'HH24:MI:SS') || ')'
            END as status,
            COALESCE(is_playing, false) as is_playing,
            zone_id
        FROM devices 
        ORDER BY last_heartbeat DESC NULLS LAST
        LIMIT 10;
    " 2>/dev/null
fi
echo ""

echo "3️⃣  Checking Services"
echo "--------------------"

# Check API Gateway
if curl -s http://localhost:3000/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ API Gateway (port 3000) - Running${NC}"
else
    echo -e "${RED}❌ API Gateway (port 3000) - Not responding${NC}"
fi

# Check Device Service
if curl -s http://localhost:3005/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Device Service (port 3005) - Running${NC}"
else
    echo -e "${RED}❌ Device Service (port 3005) - Not responding${NC}"
fi

# Check Frontend
if curl -s http://localhost:5173 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Frontend (port 5173) - Running${NC}"
else
    echo -e "${RED}❌ Frontend (port 5173) - Not responding${NC}"
fi
echo ""

echo "4️⃣  Testing WebSocket Connection"
echo "--------------------------------"
# Check if wscat is available
if command -v wscat &> /dev/null; then
    echo "   Testing WebSocket endpoint..."
    timeout 2 wscat -c ws://localhost:3000/ws 2>&1 | head -1
else
    echo -e "${YELLOW}⚠️  wscat not installed (optional)${NC}"
    echo "   Install with: npm install -g wscat"
fi
echo ""

echo "5️⃣  Recent Heartbeats"
echo "--------------------"
HEARTBEAT_COUNT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM device_heartbeats WHERE created_at > NOW() - INTERVAL '5 minutes';" 2>/dev/null | xargs)
echo "   Heartbeats in last 5 minutes: $HEARTBEAT_COUNT"

if [ "$HEARTBEAT_COUNT" -gt 0 ]; then
    echo ""
    echo "   Recent heartbeat activity:"
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
        SELECT 
            d.device_name,
            TO_CHAR(h.created_at, 'HH24:MI:SS') as time,
            h.network_status
        FROM device_heartbeats h
        JOIN devices d ON h.device_id = d.id
        WHERE h.created_at > NOW() - INTERVAL '5 minutes'
        ORDER BY h.created_at DESC
        LIMIT 5;
    " 2>/dev/null
fi
echo ""

echo "6️⃣  Manual Testing Checklist"
echo "----------------------------"
echo "   [ ] Open http://localhost:5173/devices"
echo "   [ ] Verify devices are displayed"
echo "   [ ] Open a player: http://localhost:5173/player/{deviceId}"
echo "   [ ] Check device status changes to 'online'"
echo "   [ ] Click 'Turn Screen OFF' button"
echo "   [ ] Verify device shows '(Paused)'"
echo "   [ ] Click 'Turn Screen ON' button"
echo "   [ ] Verify playback resumes"
echo "   [ ] Click 'Reboot Player' button"
echo "   [ ] Verify player reloads and reconnects"
echo ""

echo "📝 Next Steps:"
echo "-------------"
echo "1. Review the DEVICE_STATUS_FIX.md file for detailed testing steps"
echo "2. Open browser DevTools to monitor WebSocket connections"
echo "3. Check console logs for '[Player]' and '[Devices]' messages"
echo "4. Test all device control buttons (Reboot, Screen On/Off)"
echo ""

unset PGPASSWORD
