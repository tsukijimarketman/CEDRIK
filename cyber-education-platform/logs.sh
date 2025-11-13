#!/bin/bash
echo "Select logs to view:"
echo "1. Kali Workstation"
echo "2. Bridge Server"
echo "3. All containers"
echo "4. Specific scenario"
read -p "Choice (1-4): " choice

case $choice in
    1) docker logs -f kali-workstation ;;
    2) docker logs -f cyber-bridge ;;
    3) docker-compose logs -f ;;
    4) 
        echo "Available scenarios:"
        docker ps --filter "name=scenario" --format "{{.Names}}"
        read -p "Container name: " container
        docker logs -f $container
        ;;
    *) echo "Invalid choice" ;;
esac
