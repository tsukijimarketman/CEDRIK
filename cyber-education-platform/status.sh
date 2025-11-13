#!/bin/bash
echo "📊 Platform Status"
echo "=================="
echo ""
docker-compose ps
echo ""
echo "🌐 Services:"
echo "   Web UI: http://localhost:8080"
echo "   VNC: http://localhost:6080/vnc.html"
echo "   API: http://localhost:3000/api/scenarios"
