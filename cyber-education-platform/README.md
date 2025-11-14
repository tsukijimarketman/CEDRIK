# Cyber Education Platform

Multi-scenario cybersecurity learning environment with AI guidance and real Kali Linux desktop access.

## ✨ What's New

- **Instant Kali Startup**: All tools pre-installed! Container starts in ~10 seconds
- **No More Waiting**: VNC available immediately on every restart
- **Persistent Image**: Build once, use forever

## Quick Start

```bash
# Start the platform
./start.sh

# Open your browser
http://localhost:8080

# Access Kali desktop (VNC) - Ready in ~10 seconds!
http://localhost:6080/vnc.html
Password: kali123
```

## Scenarios Available

1. **DVWA** - Web Application Security (Beginner)
2. **SQLi Labs** - SQL Injection Deep Dive (Intermediate)
3. **WordPress** - CMS Security Testing (Intermediate)
4. **Metasploitable** - Network Penetration Testing (Advanced)
5. **WebGoat** - OWASP Interactive Lessons (Beginner)
6. **Juice Shop** - Modern Web Security (All Levels)

## Features

- 🖥️ **Real Kali Linux Desktop** - Full GUI access via web browser
- ⚡ **Instant Startup** - Tools pre-installed, no more waiting!
- 🤖 **AI Instructor** - Get guidance from OpenAI or Claude
- 🎯 **Multiple Scenarios** - 6 different vulnerable targets
- 📊 **Progress Tracking** - Save your learning progress
- 🔒 **Safe Environment** - Isolated Docker network

## First-Time Setup

The first build takes 10-15 minutes to create the Kali image with all tools:
- VNC Server & XFCE Desktop
- Metasploit, Nmap, SQLMap, Burp Suite
- Hydra, John, Aircrack-ng, Wireshark
- And many more security tools

**After the initial build, every startup takes only ~10 seconds!**

## AI Integration

Add your API keys to `.env`:

```bash
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GROQ_API_KEY=gsk_...
```

The platform works without AI keys (uses rule-based guidance).

## Management Commands

```bash
./start.sh      # Start all services (instant after first build!)
./stop.sh       # Stop all services  
./status.sh     # Check service status
./logs.sh       # View logs
./reset.sh      # Reset everything
```

## Architecture

```
Browser → Web UI (Port 8080)
       → VNC/Kali Desktop (Port 6080) - Instant startup!
       → API Server (Port 3000)
       → 6 Vulnerable Targets (Ports 8081-8086)
```

## Troubleshooting

**VNC not connecting?**
```bash
docker logs kali-workstation
# Should show "Kali VNC Server Started" in ~10 seconds
docker restart kali-workstation
```

**Scenario not loading?**
```bash
docker ps  # Check if container is running
docker logs scenario-[name]
```

**Rebuild Kali image (if needed)?**
```bash
docker-compose build kali-workstation
```

## What Changed from Original

**Before:**
- Kali installed tools on every startup (5-10 minutes wait)
- VNC unavailable until installation completed
- Downloaded gigabytes every time
- Frustrating startup experience

**After:**
- Kali image built once with all tools pre-installed
- Container starts in ~10 seconds
- VNC immediately available
- No downloads on startup
- Smooth experience every time! 🚀

## Learning Path

1. Start with DVWA (Beginner)
2. Progress to SQLi Labs (Intermediate)  
3. Try Juice Shop (Modern techniques)
4. Challenge yourself with Metasploitable (Advanced)

## Safety Notice

⚠️ **Educational Use Only**
- Only use in isolated environments
- Never attack systems you don't own
- Always get written authorization for pen tests
- Follow responsible disclosure practices

## Support

- Check logs: `./logs.sh`
- View status: `./status.sh`
- Reset platform: `./reset.sh`

Happy Ethical Hacking! 🔐
