#!/bin/bash

echo "============================================="
echo "Starting Kali VNC Server with noVNC..."
echo "============================================="

# Create necessary directories
mkdir -p /root/.vnc /root/.config/tigervnc

# Kill any existing VNC sessions
vncserver -kill :1 > /dev/null 2>&1 || true
echo "✓ Cleared any old VNC sessions"

# Kill any existing websockify processes
pkill -f websockify 2>/dev/null || true
echo "✓ Cleared any old websockify processes"

# Create password file using the correct method
(echo "kali123"; echo "kali123") | vncpasswd /root/.vnc/passwd > /dev/null 2>&1
chmod 600 /root/.vnc/passwd
echo "✓ Created/Updated VNC password file"

# Create xstartup if it doesn't exist
if [ ! -f /root/.vnc/xstartup ]; then
    cat > /root/.vnc/xstartup << 'XSTARTUP_EOF'
#!/bin/sh
unset SESSION_MANAGER
unset DBUS_SESSION_BUS_ADDRESS
exec startxfce4 &
XSTARTUP_EOF
    chmod +x /root/.vnc/xstartup
    echo "✓ Created xstartup script"
fi

# Create TigerVNC config
cat > /root/.vnc/config << 'CONFIG_EOF'
$localhost = "no";
$geometry = "1920x1080";
$depth = 24;
CONFIG_EOF
echo "✓ Created VNC config file"

# Start VNC server with SecurityTypes=VncAuth to use password file
vncserver :1 \
    -geometry 1920x1080 \
    -depth 24 \
    -localhost no \
    -SecurityTypes VncAuth \
    -rfbauth /root/.vnc/passwd \
    > /tmp/vnc-startup.log 2>&1

# Wait for VNC to start
sleep 3

# Check if VNC started successfully
if pgrep -x "Xtigervnc" > /dev/null; then
    echo "✅ TigerVNC Server Started Successfully"
    echo "   Display: :1"
    echo "   Port: 5901"
else
    echo "❌ VNC failed to start"
    echo "Startup log:"
    cat /tmp/vnc-startup.log
    exit 1
fi

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# START NOVNC/WEBSOCKIFY
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo ""
echo "Starting noVNC WebSocket Proxy..."

# Check if websockify exists
if ! command -v websockify &> /dev/null; then
    echo "❌ websockify not found! Installing..."
    apt-get update -qq && apt-get install -y -qq websockify python3-websockify
fi

# Start websockify in background
# This bridges WebSocket (6080) to VNC (5901)
websockify --web=/opt/novnc 6080 localhost:5901 > /tmp/websockify.log 2>&1 &
WEBSOCKIFY_PID=$!

# Wait for websockify to start
sleep 2

# Verify websockify is running
if pgrep -f "websockify" > /dev/null; then
    echo "✅ noVNC WebSocket Proxy Started"
    echo "   Port: 6080"
    echo "   Web UI: http://localhost:6080/vnc.html"
else
    echo "❌ Failed to start websockify"
    cat /tmp/websockify.log
    exit 1
fi

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# FINAL STATUS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo ""
echo "============================================="
echo "✅ Kali VNC Environment Ready"
echo "============================================="
echo "VNC Server:"
echo "  • Display: :1"
echo "  • Port: 5901"
echo "  • Password: kali123"
echo ""
echo "Web Access (noVNC):"
echo "  • Port: 6080"
echo "  • URL: http://localhost:6080/vnc.html"
echo "  • Auto-connect URL:"
echo "    http://localhost:6080/vnc.html?autoconnect=1&password=kali123"
echo ""
echo "Resolution: 1920x1080 @ 24-bit"
echo "============================================="

# Show startup logs if there are warnings
if [ -f /tmp/vnc-startup.log ]; then
    echo ""
    echo "VNC Startup Log:"
    cat /tmp/vnc-startup.log
fi

# Monitor both processes and keep container alive
echo ""
echo "Monitoring VNC and noVNC processes..."
echo "Container will restart services if they crash"
echo ""

# Function to check and restart services
check_services() {
    # Check VNC
    if ! pgrep -x "Xtigervnc" > /dev/null; then
        echo "⚠️  VNC crashed at $(date), restarting..."
        vncserver :1 \
            -geometry 1920x1080 \
            -depth 24 \
            -localhost no \
            -SecurityTypes VncAuth \
            -rfbauth /root/.vnc/passwd \
            2>&1
        sleep 3
    fi
    
    # Check websockify
    if ! pgrep -f "websockify" > /dev/null; then
        echo "⚠️  websockify crashed at $(date), restarting..."
        websockify --web=/opt/novnc 6080 localhost:5901 > /tmp/websockify.log 2>&1 &
        sleep 2
    fi
}

# Main monitoring loop
while true; do
    check_services
    sleep 30
done