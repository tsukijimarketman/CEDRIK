FROM kalilinux/kali-rolling

# noninteractive environment for apt
ENV DEBIAN_FRONTEND=noninteractive
ENV DISPLAY=:1

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
# This sets CAP_NET_RAW and CAP_NET_ADMIN on the nmap binary.
# Note: file capabilities only help when the container's runtime does not drop those capabilities.
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

# Copy entrypoint and make executable (ensure entrypoint.sh exists in build context)
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 5901

ENTRYPOINT ["/entrypoint.sh"]

