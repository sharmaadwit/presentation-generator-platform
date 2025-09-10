#!/bin/bash

echo "🔍 PostgreSQL Installation Check"
echo "================================"

# Check if PostgreSQL is installed
echo "1️⃣ Checking if PostgreSQL is installed:"
if command -v psql &> /dev/null; then
    echo "✅ PostgreSQL is installed"
    psql --version
else
    echo "❌ PostgreSQL is NOT installed"
fi
echo ""

# Check if PostgreSQL service is running
echo "2️⃣ Checking if PostgreSQL service is running:"
if systemctl is-active --quiet postgresql; then
    echo "✅ PostgreSQL service is running"
    sudo systemctl status postgresql --no-pager -l
else
    echo "❌ PostgreSQL service is NOT running"
    echo "💡 Try: sudo systemctl start postgresql"
fi
echo ""

# Check if PostgreSQL is listening on port 5432
echo "3️⃣ Checking if PostgreSQL is listening on port 5432:"
if sudo netstat -tlnp | grep -q 5432; then
    echo "✅ PostgreSQL is listening on port 5432"
    sudo netstat -tlnp | grep 5432
else
    echo "❌ PostgreSQL is NOT listening on port 5432"
fi
echo ""

# Check for existing databases
echo "4️⃣ Checking for existing databases:"
if sudo -u postgres psql -l 2>/dev/null; then
    echo "✅ Can access PostgreSQL databases"
else
    echo "❌ Cannot access PostgreSQL databases"
fi
echo ""

echo "📋 Summary:"
echo "   - If you see ✅ for all checks: PostgreSQL is ready!"
echo "   - If you see ❌ for installation: Run the install script"
echo "   - If you see ❌ for service: Run 'sudo systemctl start postgresql'"
echo "   - If you see ❌ for port: Check firewall settings"
