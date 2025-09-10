#!/bin/bash

echo "🔍 Checking PostgreSQL Installation on Your Server"
echo "=================================================="

# Check if we can connect to the server
echo "📡 Testing server connection..."
if ! ping -c 1 $1 > /dev/null 2>&1; then
    echo "❌ Cannot reach server at $1"
    echo "💡 Make sure to replace YOUR_SERVER_IP with your actual server IP"
    echo "Usage: ./check-postgresql.sh YOUR_SERVER_IP"
    exit 1
fi

echo "✅ Server is reachable at $1"
echo ""

# Commands to run on the server
echo "🔧 Running PostgreSQL checks on server..."
echo ""

# Check if PostgreSQL is installed
echo "1️⃣ Checking if PostgreSQL is installed:"
ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no ubuntu@$1 "which psql && psql --version || echo 'PostgreSQL not found'"
echo ""

# Check if PostgreSQL service is running
echo "2️⃣ Checking if PostgreSQL service is running:"
ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no ubuntu@$1 "sudo systemctl status postgresql --no-pager -l || echo 'Service check failed'"
echo ""

# Check if PostgreSQL is listening on port 5432
echo "3️⃣ Checking if PostgreSQL is listening on port 5432:"
ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no ubuntu@$1 "sudo netstat -tlnp | grep 5432 || echo 'Port 5432 not listening'"
echo ""

# Check for existing databases
echo "4️⃣ Checking for existing databases:"
ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no ubuntu@$1 "sudo -u postgres psql -l 2>/dev/null || echo 'Cannot access PostgreSQL databases'"
echo ""

echo "✅ PostgreSQL check complete!"
echo ""
echo "📋 Next Steps:"
echo "   - If PostgreSQL is installed and running: You're ready to create your database"
echo "   - If PostgreSQL is not installed: Run the installation script"
echo "   - If PostgreSQL is installed but not running: Start the service"
