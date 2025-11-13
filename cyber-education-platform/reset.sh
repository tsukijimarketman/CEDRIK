#!/bin/bash
echo "⚠️  This will DELETE all data and reset the platform!"
read -p "Are you sure? (yes/no): " confirm

if [ "$confirm" == "yes" ]; then
    echo "Stopping containers..."
    docker-compose down -v
    echo "Removing images..."
    docker-compose rm -f
    echo "✅ Platform reset complete!"
    echo "Run ./start.sh to start fresh"
else
    echo "Reset cancelled"
fi
