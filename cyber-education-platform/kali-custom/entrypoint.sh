#!/bin/bash

echo "============================================="
echo "Starting Kali VNC Server..."
echo "============================================="

# Create necessary directories
mkdir -p /root/.vnc /root/.config/tigervnc

# Kill any existing VNC sessions
vncserver -kill :1 > /dev/null 2>&1 || true
echo "Cleared any old VNC sessions"

# Create password file using the correct method
# The password needs to be passed to vncpasswd via stdin with confirmation
(echo "kali123"; echo "kali123") | vncpasswd /root/.vnc/passwd > /dev/null 2>&1
chmod 600 /root/.vnc/passwd
echo "Created/Updated VNC password file"

# Create xstartup if it doesn't exist
if [ ! -f /root/.vnc/xstartup ]; then
    cat > /root/.vnc/xstartup << 'XSTARTUP_EOF'
#!/bin/sh
unset SESSION_MANAGER
unset DBUS_SESSION_BUS_ADDRESS
exec startxfce4 &
XSTARTUP_EOF
    chmod +x /root/.vnc/xstartup
    echo "Created xstartup script"
fi

# Create TigerVNC config
cat > /root/.vnc/config << 'CONFIG_EOF'
$localhost = "no";
$geometry = "1920x1080";
$depth = 24;
CONFIG_EOF
echo "Created VNC config file"

# Start VNC server with SecurityTypes=VncAuth to use password file
# The -rfbauth option explicitly tells it to use our password file
vncserver :1 \
    -geometry 1920x1080 \
    -depth 24 \
    -localhost no \
    -SecurityTypes VncAuth \
    -rfbauth /root/.vnc/passwd \
    > /tmp/vnc-startup.log 2>&1

# Wait for VNC to start
sleep 5

# Check if VNC started successfully
if pgrep -x "Xtigervnc" > /dev/null; then
    echo "============================================="
    echo "✅ Kali VNC Server Started Successfully"
    echo "============================================="
    echo "VNC Display: :1"
    echo "VNC Port: 5901"
    echo "Resolution: 1920x1080"
    echo "Access via: http://localhost:6080/vnc.html"
    echo "Password: kali123"
    echo "============================================="
    
    # Show any startup warnings (but don't fail)
    if [ -f /tmp/vnc-startup.log ]; then
        echo "Startup log:"
        cat /tmp/vnc-startup.log
    fi
else
    echo "❌ VNC failed to start"
    echo "Startup log:"
    cat /tmp/vnc-startup.log
    echo ""
    echo "Attempting alternative startup method..."
    
    # Alternative: Start Xvnc directly
    Xtigervnc :1 \
        -geometry 1920x1080 \
        -depth 24 \
        -rfbauth /root/.vnc/passwd \
        -SecurityTypes VncAuth \
        -AlwaysShared \
        -AcceptKeyEvents \
        -AcceptPointerEvents \
        -AcceptSetDesktopSize \
        -SendCutText \
        -AcceptCutText \
        &
    
    sleep 3
    DISPLAY=:1 startxfce4 &
    
    sleep 3
    if pgrep -x "Xtigervnc" > /dev/null; then
        echo "✅ VNC started using alternative method"
    fi
fi

# Find and tail the log file
LOG_FILE=$(find /root/.vnc -name "*.log" 2>/dev/null | head -n 1)

if [ -n "$LOG_FILE" ] && [ -f "$LOG_FILE" ]; then
    echo ""
    echo "Following VNC log: $LOG_FILE"
    echo "============================================="
    tail -f "$LOG_FILE"
else
    echo "Keeping container alive and monitoring VNC process..."
    while true; do
        sleep 30
        if ! pgrep -x "Xtigervnc" > /dev/null; then
            echo "⚠️  VNC process died at $(date), restarting..."
            vncserver :1 \
                -geometry 1920x1080 \
                -depth 24 \
                -localhost no \
                -SecurityTypes VncAuth \
                -rfbauth /root/.vnc/passwd \
                2>&1
            sleep 5
        fi
    done
fi
