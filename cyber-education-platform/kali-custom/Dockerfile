FROM kalilinux/kali-rolling

# noninteractive environment for apt
ENV DEBIAN_FRONTEND=noninteractive
ENV DISPLAY=:1

# IMPORTANT: Install bash first before anything else
RUN apt-get update && apt-get install -y bash

# combine update + install to keep image layers small and avoid stale apt lists
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      tigervnc-standalone-server \
      tigervnc-tools \
      dbus-x11 \
      xfce4 \
      xfce4-terminal \
      xfce4-goodies \
      firefox-esr \
      nmap \
      sqlmap \
      nikto \
      netcat-traditional \
      hydra \
      john \
      aircrack-ng \
      wireshark \
      curl \
      wget \
      git \
      vim \
      nano \
      gobuster \
      dirbuster \
      exploitdb \
      wfuzz \
      crackmapexec \
      net-tools \
      iputils-ping \
      dnsutils \
      wpscan \
      whois \
      libcap2-bin \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Try installing metasploit-framework and burpsuite but don't fail the build if not available
RUN apt-get update && apt-get install -y metasploit-framework || echo "Metasploit install failed, continuing..." && \
    apt-get install -y burpsuite || echo "Burpsuite not available, skipping..." && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Optional convenience: set file capabilities so nmap can use raw sockets without requiring --privileged at runtime.
RUN if [ -x /usr/bin/nmap ]; then setcap 'cap_net_raw,cap_net_admin+ep' /usr/bin/nmap || true; fi

# Setup VNC directories
RUN mkdir -p /root/.vnc /root/.config/tigervnc

# Create VNC password file using vncpasswd to produce proper hashed format (password: kali123)
RUN printf "kali123\nkali123\n\n" | vncpasswd -f > /root/.vnc/passwd && \
    chmod 600 /root/.vnc/passwd

# Create VNC startup script
RUN printf '%s\n' '#!/bin/sh' 'unset SESSION_MANAGER' 'unset DBUS_SESSION_BUS_ADDRESS' 'exec startxfce4 &' > /root/.vnc/xstartup && \
    chmod +x /root/.vnc/xstartup

# Create TigerVNC config file to prevent migration warnings
RUN printf '%s\n' '$localhost = "no";' '$geometry = "1920x1080";' '$depth = 24;' > /root/.vnc/config

# Create entrypoint script directly in the image
# Use /bin/sh shebang instead of /bin/bash for better compatibility
RUN echo '#!/bin/sh' > /entrypoint.sh && \
    echo '' >> /entrypoint.sh && \
    echo 'echo "============================================="' >> /entrypoint.sh && \
    echo 'echo "Starting Kali VNC Server..."' >> /entrypoint.sh && \
    echo 'echo "============================================="' >> /entrypoint.sh && \
    echo '' >> /entrypoint.sh && \
    echo 'mkdir -p /root/.vnc /root/.config/tigervnc' >> /entrypoint.sh && \
    echo '' >> /entrypoint.sh && \
    echo 'vncserver -kill :1 > /dev/null 2>&1 || true' >> /entrypoint.sh && \
    echo 'echo "Cleared any old VNC sessions"' >> /entrypoint.sh && \
    echo '' >> /entrypoint.sh && \
    echo '(echo "kali123"; echo "kali123") | vncpasswd /root/.vnc/passwd > /dev/null 2>&1' >> /entrypoint.sh && \
    echo 'chmod 600 /root/.vnc/passwd' >> /entrypoint.sh && \
    echo 'echo "Created/Updated VNC password file"' >> /entrypoint.sh && \
    echo '' >> /entrypoint.sh && \
    echo 'if [ ! -f /root/.vnc/xstartup ]; then' >> /entrypoint.sh && \
    echo '    cat > /root/.vnc/xstartup << "XEOF"' >> /entrypoint.sh && \
    echo '#!/bin/sh' >> /entrypoint.sh && \
    echo 'unset SESSION_MANAGER' >> /entrypoint.sh && \
    echo 'unset DBUS_SESSION_BUS_ADDRESS' >> /entrypoint.sh && \
    echo 'exec startxfce4 &' >> /entrypoint.sh && \
    echo 'XEOF' >> /entrypoint.sh && \
    echo '    chmod +x /root/.vnc/xstartup' >> /entrypoint.sh && \
    echo 'fi' >> /entrypoint.sh && \
    echo '' >> /entrypoint.sh && \
    echo 'cat > /root/.vnc/config << "CEOF"' >> /entrypoint.sh && \
    echo '$localhost = "no";' >> /entrypoint.sh && \
    echo '$geometry = "1920x1080";' >> /entrypoint.sh && \
    echo '$depth = 24;' >> /entrypoint.sh && \
    echo 'CEOF' >> /entrypoint.sh && \
    echo '' >> /entrypoint.sh && \
    echo 'vncserver :1 -geometry 1920x1080 -depth 24 -localhost no -SecurityTypes VncAuth -rfbauth /root/.vnc/passwd > /tmp/vnc.log 2>&1' >> /entrypoint.sh && \
    echo 'sleep 5' >> /entrypoint.sh && \
    echo '' >> /entrypoint.sh && \
    echo 'if pgrep -x "Xtigervnc" > /dev/null; then' >> /entrypoint.sh && \
    echo '    echo "✅ Kali VNC Server Started Successfully"' >> /entrypoint.sh && \
    echo '    echo "VNC Port: 5901"' >> /entrypoint.sh && \
    echo '    echo "Password: kali123"' >> /entrypoint.sh && \
    echo 'else' >> /entrypoint.sh && \
    echo '    echo "❌ VNC failed to start"' >> /entrypoint.sh && \
    echo '    cat /tmp/vnc.log' >> /entrypoint.sh && \
    echo 'fi' >> /entrypoint.sh && \
    echo '' >> /entrypoint.sh && \
    echo 'LOG_FILE=$(find /root/.vnc -name "*.log" 2>/dev/null | head -n 1)' >> /entrypoint.sh && \
    echo 'if [ -n "$LOG_FILE" ]; then' >> /entrypoint.sh && \
    echo '    tail -f "$LOG_FILE"' >> /entrypoint.sh && \
    echo 'else' >> /entrypoint.sh && \
    echo '    while true; do sleep 30; done' >> /entrypoint.sh && \
    echo 'fi' >> /entrypoint.sh && \
    chmod +x /entrypoint.sh

# Verify the entrypoint was created correctly
RUN ls -la /entrypoint.sh && head -5 /entrypoint.sh

EXPOSE 5901

ENTRYPOINT ["/entrypoint.sh"]