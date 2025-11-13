FROM python:3.11-slim

WORKDIR /app

# Install websockify
RUN pip install websockify

# Download noVNC from GitHub
RUN apt-get update && \
    apt-get install -y git && \
    git clone --depth 1 https://github.com/novnc/noVNC.git /app/novnc && \
    apt-get remove -y git && \
    apt-get autoremove -y && \
    rm -rf /var/lib/apt/lists/*

EXPOSE 6080

# Start websockify with noVNC web interface
CMD ["websockify", "--web", "/app/novnc", "6080", "kali-workstation:5901"]
