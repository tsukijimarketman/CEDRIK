const express = require("express")
const { exec } = require("child_process")
const WebSocket = require("ws")
const cors = require("cors")
const { Pool } = require("pg")
const jwt = require("jsonwebtoken")
const Groq = require("groq-sdk")
const RAGManager = require('./rag-manager');
const kaliManager = require('./kali-manager');
const Docker = require('dockerode');
const docker = new Docker({ socketPath: '/var/run/docker.sock' });

const BACKEND_MAIN_API_URL = process.env.BACKEND_MAIN_API_URL;

const app = express()
const PORT = 3000

app.use(cors())
app.use(express.json())


// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

// Initialize Groq client
const groq = process.env.GROQ_API_KEY
  ? new Groq({ apiKey: process.env.GROQ_API_KEY })
  : null
// Initialize Rag 
  const ragManager = new RAGManager();
ragManager.initialize().catch(console.error);


// Define our two specialized agents
const AGENTS = {
  professor: {
    name: "Professor Cedrik",
    emoji: "👨‍🏫",
    model: "llama-3.1-8b-instant", // Fast, good for teaching
    color: "#667eea",
    specialty: "Teaching & Guidance",
  },
  hacker: {
    name: "H4ck3r Man Pancho",
    emoji: "🎯",
    model: "llama-3.3-70b-versatile", // More powerful for technical details
    color: "#f59e0b",
    specialty: "Technical Execution",
  },
}

// WebSocket server
const wss = new WebSocket.Server({ noServer: true })
const sessions = new Map()

// FIXED: Use container hostnames instead of localhost
const SCENARIOS = {
  "web-dvwa": {
    id: "web-dvwa",
    name: "Web Application Security (DVWA)",
    description: "Learn SQL injection, XSS, CSRF, and more web vulnerabilities",
    difficulty: "Beginner",
    container: "scenario-webapp",
    target: "http://dvwa.lab", // Container hostname (from docker-compose)
    external_url: "http://localhost:8081", // For user's browser
    port: 8081,
    estimated_time: "2-3 hours",
    skills: ["SQL Injection", "XSS", "CSRF", "Command Injection"],
    ai_context: {
      environment:
        "DVWA (Damn Vulnerable Web Application) running on Apache/PHP/MySQL",
      default_credentials: { username: "admin", password: "password" },
      security_levels: ["Low", "Medium", "High", "Impossible"],
      common_tools: ["sqlmap", "burpsuite", "curl", "firefox developer tools"],
      vulnerabilities: {
        "SQL Injection": {
          location: "User ID input field",
          technique: "Use single quotes to break SQL query, then UNION SELECT",
          example_payload: "1' OR '1'='1",
          verification: "Look for multiple users displayed or error messages",
        },
        "XSS Reflected": {
          location: "Name input field",
          technique: "Inject JavaScript that executes in victim browser",
          example_payload: '<script>alert("XSS")</script>',
          verification: "Alert box appears when payload is reflected",
        },
        "Command Injection": {
          location: "Ping functionality",
          technique: "Chain commands using ; or && or ||",
          example_payload: "127.0.0.1; ls -la",
          verification: "Directory listing appears after ping output",
        },
      },
    },
    exercises: [
      {
        id: 1,
        title: "Initial Setup & Login",
        description: "Access DVWA and login with default credentials",
        objectives: [
          "Firefox will open automatically to http://dvwa.lab",
          "Login with username: admin, password: password",
          'Click "Create / Reset Database" button',
          "Login again after database is created",
          "Set security level to Low (DVWA Security menu)",
          "Navigate to SQL Injection page",
        ],
        hints: [
          "DVWA requires database setup on first use",
          "After creating database, login credentials are: admin / password",
          "Security level is in the left sidebar menu",
          "Low security has no protections - perfect for learning",
        ],
        challenges: [
        { id: "dvwa-setup-login", name: "Successfully login to DVWA" },
        { id: "dvwa-setup-database", name: "Create/Reset the database" },
        { id: "dvwa-setup-security", name: "Set security level to Low" },
        { id: "dvwa-setup-navigate", name: "Navigate to SQL Injection module" }
      ],
        validation_command: null,
        success_indicators: [
          "Logged in successfully",
          "Can see vulnerability modules",
        ],
      },
      {
        id: 2,
        title: "SQL Injection - Login Bypass",
        description:
          "Bypass authentication using SQL injection in the User ID field",
        objectives: [
          "Navigate to SQL Injection module",
          "Understand how the query works: SELECT * FROM users WHERE user_id = $id",
          "Inject payload to retrieve all users",
          "Extract admin password hash",
        ],
        hints: [
          "Try entering: 1' OR '1'='1",
          "The quote breaks out of the SQL string",
          "OR '1'='1 makes the condition always true",
          "Use UNION SELECT to extract data from other tables",
        ],
        challenges: [
        { id: "dvwa-sqli-error", name: "Trigger SQL error with single quote" },
        { id: "dvwa-sqli-bypass", name: "Bypass with 1' OR '1'='1" },
        { id: "dvwa-sqli-union", name: "Find column count with UNION" },
        { id: "dvwa-sqli-extract", name: "Extract admin hash from database" }
      ],
        validation_command: null,
        success_indicators: ["Multiple users displayed", "Admin hash visible"],
      },
      {
        id: 3,
        title: "Cross-Site Scripting (XSS)",
        description: "Inject JavaScript code that executes in the browser",
        objectives: [
          "Navigate to XSS (Reflected) module",
          "Inject a simple alert payload",
          "Try different XSS payloads",
          "Understand why XSS is dangerous",
        ],
        hints: [
          'Start simple: <script>alert("XSS")</script>',
          "If filtered, try: <img src=x onerror=alert(1)>",
          "XSS can steal cookies, redirect users, modify page content",
          "Real attacks use document.cookie to steal sessions",
        ],
        challenges: [
        { id: "dvwa-xss-basic", name: "Execute basic <script>alert()</script>" },
        { id: "dvwa-xss-img", name: "Use <img> tag with onerror" },
        { id: "dvwa-xss-cookie", name: "Access document.cookie with XSS" },
        { id: "dvwa-xss-persistent", name: "Try stored XSS in another module" }
      ],
        validation_command: null,
        success_indicators: ["JavaScript executes", "Alert box appears"],
      },
    ],
  },
  "sqli-labs": {
    id: "sqli-labs",
    name: "SQL Injection Deep Dive",
    description: "Master SQL injection techniques with 75+ levels",
    difficulty: "Intermediate",
    container: "scenario-sqli",
    target: "http://sqli.lab/sqli-labs",
    external_url: "http://localhost:8082/sqli-labs",
    port: 8082,
    estimated_time: "5-8 hours",
    skills: ["SQL Injection", "Database Enumeration", "Blind SQLi"],
    ai_context: {
      environment:
        "Progressive SQL injection challenges from basic to advanced",
      database: "MySQL",
      common_tools: ["sqlmap", "curl", "burpsuite"],
      techniques: {
        "Error-based": "Force errors to extract data",
        "Union-based": "Combine queries to extract data",
        "Boolean-based blind": "Use true/false responses",
        "Time-based blind": "Use delays to confirm injection",
      },
      sqlmap_usage: {
        basic: "sqlmap -u 'http://sqli.lab/sqli-labs/Less-1/?id=1' --dbs",
        enumerate:
          "sqlmap -u 'http://sqli.lab/sqli-labs/Less-1/?id=1' -D database_name --tables",
        dump: "sqlmap -u 'http://sqli.lab/sqli-labs/Less-1/?id=1' -D database_name -T table_name --dump",
      },
    },
    exercises: [
      {
        id: 1,
        title: "Error-Based SQL Injection (Less-1)",
        description: "Exploit error messages to extract database information",
        objectives: [
          "Access http://sqli.lab/sqli-labs/Less-1/",
          "Add a single quote to trigger error",
          "Use ORDER BY to find column count",
          "Use UNION SELECT to extract data",
        ],
        hints: [
          "Start with: ?id=1'",
          "Find columns: ?id=1' ORDER BY 1--+",
          "Extract data: ?id=-1' UNION SELECT 1,2,3--+",
          "Use sqlmap for automated exploitation",
        ],
        challenges: [
        { id: "sqli-less1-error", name: "Trigger SQL error message" },
        { id: "sqli-less1-orderby", name: "Find column count with ORDER BY" },
        { id: "sqli-less1-union", name: "Successfully use UNION SELECT" },
        { id: "sqli-less1-extract", name: "Extract database name or version" }
      ],
        validation_command:
          "curl -s 'http://sqli.lab/sqli-labs/Less-1/?id=1%27' | grep -i error",
        success_indicators: ["SQL error visible", "Data extracted via UNION"],
      },
    ],
  },
  "wordpress": {
    id: "wordpress",
    name: "WordPress Security Testing",
    description: "Learn to find and exploit WordPress vulnerabilities",
    difficulty: "Intermediate",
    container: "scenario-wordpress",
    target: "http://wordpress.lab",
    external_url: "http://localhost:8083",
    port: 8083,
    estimated_time: "3-4 hours",
    skills: ["WordPress Enumeration", "Plugin Vulnerabilities", "Brute Force"],
    ai_context: {
      environment: "Vulnerable WordPress installation",
      common_tools: ["wpscan", "curl", "hydra"],
      tips: [
        "Use wpscan to enumerate users and plugins",
        "Check /wp-json/wp/v2/users for user enumeration",
        "Look for vulnerable plugins",
        "Try default credentials on /wp-admin",
      ],
    },
    exercises: [
      {
        id: 1,
        title: "WordPress User Enumeration",
        description: "Find valid WordPress usernames",
        objectives: [
          "Access http://wordpress.lab",
          "Use wpscan or manual techniques to find users",
          "Identify at least 2 usernames",
        ],
        hints: [
          "Try: wpscan --url http://wordpress.lab --enumerate u",
          "Or check: http://wordpress.lab/wp-json/wp/v2/users",
          "Look at blog post authors",
        ],
        challenges: [
          { id: "wp-user-wpscan", name: "Enumerate users using WPScan tool" },
  { id: "wp-user-json", name: "Enumerate users via /wp-json/wp/v2/users API" },
  { id: "wp-user-authors", name: "Identify users from blog post authors" }

        ],
        validation_command: null,
        success_indicators: ["Found admin username", "Found other users"],
      },
    ],
  },
  "metasploitable": {
    id: "metasploitable",
    name: "Network Penetration Testing",
    description: "Practice network exploitation on Metasploitable",
    difficulty: "Advanced",
    container: "scenario-metasploitable",
    target: "http://metasploitable.lab",
    external_url: "http://localhost:8084",
    port: 8084,
    estimated_time: "4-6 hours",
    skills: ["Port Scanning", "Service Exploitation", "Privilege Escalation"],
    ai_context: {
      environment:
        "Intentionally vulnerable Linux system with multiple services",
      common_tools: ["nmap", "metasploit", "netcat", "ssh"],
      services: {
        "FTP": "Port 21 - vsftpd 2.3.4 (backdoored)",
        "SSH": "Port 22 - OpenSSH",
        "HTTP": "Port 80 - Apache with vulnerable apps",
        "SMB": "Port 139/445 - Samba with vulnerabilities",
      },
    },
    exercises: [
      {
        id: 1,
        title: "Network Reconnaissance",
        description: "Discover open ports and services",
        objectives: [
          "Use nmap to scan metasploitable.lab",
          "Identify at least 5 open ports",
          "Determine service versions",
          "Research vulnerabilities for found services",
        ],
        hints: [
          "Run: nmap -sV -sC metasploitable.lab",
          "The -sV flag detects service versions",
          "The -sC flag runs default scripts",
          "Look for outdated or vulnerable versions",
        ],
        challenges: [
        { id: "metasploit-scan-basic", name: "Run basic nmap scan" },
        { id: "metasploit-scan-version", name: "Detect service versions (-sV)" },
        { id: "metasploit-scan-5ports", name: "Identify at least 5 open ports" },
        { id: "metasploit-research-vuln", name: "Research vulnerability for one service" }
      ],
        validation_command: "nmap -p- metasploitable.lab",
        success_indicators: [
          "Found FTP on port 21",
          "Found SSH on port 22",
          "Found HTTP on port 80",
        ],
      },
    ],
  },
  "webgoat": {
    id: "webgoat",
    name: "OWASP WebGoat",
    description: "Interactive security lessons from OWASP",
    difficulty: "Beginner",
    container: "scenario-webgoat",
    target: "http://webgoat.lab:8080/WebGoat",
    external_url: "http://localhost:8085/WebGoat",
    port: 8085,
    estimated_time: "8-10 hours",
    skills: ["OWASP Top 10", "Authentication", "Session Management"],
    ai_context: {
      environment: "Interactive lessons with built-in feedback",
      tips: [
        "Register a new account to access lessons",
        "Each lesson provides hints",
        "Start with General category for basics",
        "Progress through categories by difficulty",
      ],
    },
    exercises: [
      {
  id: 1,
  title: "HTTP Basics",
  description: "Learn the fundamentals of HTTP requests and responses using WebGoat's interactive lesson",
  objectives: [
    "Access http://webgoat.lab:8080/WebGoat",
    "Register a new account if needed",
    "Navigate to the General category and select HTTP Basics",
    "Enter your name in the input field and submit",
    "Observe the HTTP request and response details",
    "Complete the lesson by entering the reversed name as requested"
  ],
  hints: [
    "Use browser developer tools (F12) to inspect the network tab",
    "The 'magic number' is often the length or a hash of your input",
    "Focus on understanding GET vs POST and headers",
    "If stuck, check the built-in hints in WebGoat"
  ],
  challenges: [
    { id: "webgoat-http-submit", name: "Submit name in HTTP Basics form" },
    { id: "webgoat-http-observe", name: "Observe and note the HTTP response code" },
    { id: "webgoat-http-complete", name: "Successfully complete the HTTP Basics lesson" }
  ],
  validation_command: null,
  success_indicators: ["Lesson marked as complete", "Understood HTTP flow"]
}
    ],
  },
  "juiceshop": {
    id: "juiceshop",
    name: "OWASP Juice Shop",
    description: "Modern vulnerable web application with 100+ challenges",
    difficulty: "All Levels",
    container: "scenario-juiceshop",
    target: "http://juiceshop.lab:3000",
    external_url: "http://localhost:8086",
    port: 8086,
    estimated_time: "10-20 hours",
    skills: ["Modern Web Security", "API Testing", "Client-Side Security"],
    ai_context: {
      environment: "Modern e-commerce app built with Angular/Node.js/Express",
      features: "REST API, JWT authentication, file upload, product reviews",
      common_tools: ["burpsuite", "browser devtools", "curl", "jwt.io"],
      vulnerabilities: {
        "SQL Injection": {
          location: "Login form",
          technique: "Bypass authentication with SQL injection",
          example_payload: "admin'--",
          verification: "Logged in as admin without password",
        },
        "XSS": {
          location: "Search bar, product reviews",
          technique: "Inject HTML/JavaScript",
          example_payload: '<iframe src="javascript:alert(`xss`)">',
          verification: "Script executes when viewing page",
        },
        "Broken Authentication": {
          location: "JWT tokens in localStorage",
          technique: "Decode and modify JWT tokens",
          tool: "jwt.io or burpsuite",
          verification: "Access restricted endpoints",
        },
      },
      tips: [
        "Use browser DevTools Network tab to see API calls",
        "Check localStorage for JWT tokens",
        "Look at HTML comments and source code",
        "Try default/common credentials",
      ],
    },
    exercises: [
      {
        id: 1,
        title: "SQL Injection Login Bypass",
        description: "Bypass the login without knowing the password",
        objectives: [
          "Open http://juiceshop.lab:3000",
          "Click Account > Login",
          "Inject SQL payload in email field",
          "Successfully login as admin",
        ],
        hints: [
          "Try: admin'--",
          "The -- comments out the password check",
          "You can also use: ' OR 1=1--",
          "Watch for SQL error messages in response",
        ],
        challenges: [ // NEW FIELD
        { id: "juice-sqli-login", name: "Bypass login with SQL injection" },
        { id: "juice-sqli-union", name: "Extract data with UNION attack" },
        { id: "juice-xss-search", name: "Find XSS in search" },
        { id: "juice-xss-stored", name: "Create stored XSS" }],
        validation_command: null,
        success_indicators: ["Logged in as admin", "JWT token received"],
      },
    ],
  },
}

const EXERCISE_REQUIREMENTS = {
  MIN_CHALLENGES: 3,
  REFLECTION_BULLETS: 3,
  REFLECTION_TYPES: ['evidence', 'prevention', 'detection']
};

// Validation functions for exercise completion
const ExerciseValidators = {
  // Validate challenge completion count
  validateChallengeCount: (completions) => {
    const count = completions.length;
    return {
      valid: count >= EXERCISE_REQUIREMENTS.MIN_CHALLENGES,
      count: count,
      required: EXERCISE_REQUIREMENTS.MIN_CHALLENGES,
      message: count >= EXERCISE_REQUIREMENTS.MIN_CHALLENGES 
        ? `✅ Completed ${count} challenges (${EXERCISE_REQUIREMENTS.MIN_CHALLENGES} required)`
        : `Need ${EXERCISE_REQUIREMENTS.MIN_CHALLENGES - count} more challenge(s)`
    };
  },

  // Validate mitigation note content
  validateMitigationNote: (note) => {
    if (!note || note.trim().length < 50) {
      return {
        valid: false,
        message: 'Mitigation note must be at least 50 characters and contain meaningful defensive measures'
      };
    }

    // Check for key defensive concepts
    const defensiveKeywords = ['sanitize', 'validate', 'escape', 'parameterized', 'whitelist', 'encode', 'filter', 'CSP', 'principle of least privilege'];
    const hasDefensiveConcept = defensiveKeywords.some(keyword => 
      note.toLowerCase().includes(keyword.toLowerCase())
    );

    return {
      valid: hasDefensiveConcept && note.length >= 50,
      message: hasDefensiveConcept 
        ? '✅ Mitigation note includes defensive concepts'
        : '❌ Include specific defensive measures (e.g., input sanitization, parameterized queries, CSP)'
    };
  },

  // Validate three bullets reflection
  validateReflection: (reflection) => {
    if (!reflection || !reflection.bullets || reflection.bullets.length < 3) {
      return {
        valid: false,
        message: 'Reflection must include 3 bullets: Evidence, Prevention, Detection',
        required: EXERCISE_REQUIREMENTS.REFLECTION_TYPES
      };
    }

    const bullets = reflection.bullets;
    const hasEvidence = bullets.some(b => b.type === 'evidence' && b.content.length > 20);
    const hasPrevention = bullets.some(b => b.type === 'prevention' && b.content.length > 20);
    const hasDetection = bullets.some(b => b.type === 'detection' && b.content.length > 20);

    return {
      valid: hasEvidence && hasPrevention && hasDetection,
      evidence: hasEvidence,
      prevention: hasPrevention,
      detection: hasDetection,
      message: (hasEvidence && hasPrevention && hasDetection)
        ? '✅ Complete reflection with all three components'
        : `❌ Missing: ${!hasEvidence ? 'Evidence ' : ''}${!hasPrevention ? 'Prevention ' : ''}${!hasDetection ? 'Detection' : ''}`
    };
  }
};

async function validateWithAI(content, type, scenario, exercise) {
  if (!groq) {
    console.log('⚠️ No Groq API key - using fallback validation');
    return fallbackValidation(content, type);
  }

  const validationPrompts = {
    mitigation: `You are a cybersecurity expert reviewing a student's mitigation strategy.

SCENARIO: ${scenario.name}
EXERCISE: ${exercise.title}
VULNERABILITY TYPE: ${exercise.description}

STUDENT'S MITIGATION NOTE:
"${content}"

Evaluate this mitigation note on the following criteria:
1. Does it identify SPECIFIC defensive measures? (not just generic "be careful")
2. Are the solutions TECHNICALLY SOUND for this vulnerability?
3. Does it mention at least 2-3 concrete security controls?
4. Is it relevant to the actual vulnerability being exploited?

You must respond ONLY with valid JSON in this exact format (no other text):
{
  "valid": true,
  "score": 85,
  "feedback": "Good explanation of input validation and parameterized queries. Consider adding CSP headers.",
  "suggestions": ["Add Content Security Policy details", "Mention WAF configuration"]
}

Be STRICT. Students should demonstrate real understanding, not just buzzwords.
Score 70+ to pass. Response must be valid JSON only.`,

    reflection: `You are a cybersecurity educator reviewing a student's reflection on what they learned.

SCENARIO: ${scenario.name}
EXERCISE: ${exercise.title}

STUDENT'S REFLECTION:
Evidence: "${content.evidence}"
Prevention: "${content.prevention}"
Detection: "${content.detection}"

Evaluate each component:

1. EVIDENCE: Does it show they actually found/exploited something? Is it specific?
2. PREVENTION: Are the prevention methods concrete and relevant?
3. DETECTION: Would these detection methods actually work in practice?

You must respond ONLY with valid JSON in this exact format (no other text):
{
  "valid": true,
  "score": 78,
  "evidence_valid": true,
  "prevention_valid": true,
  "detection_valid": false,
  "feedback": "Good evidence and prevention, but detection methods need more detail",
  "component_feedback": {
    "evidence": "Clear description of SQL injection found",
    "prevention": "Good mention of parameterized queries",
    "detection": "Too vague - specify exact log patterns or IDS rules"
  }
}

Be STRICT. Each component should demonstrate genuine learning and technical accuracy.
Score 70+ to pass. Response must be valid JSON only.`
  };

  try {
    console.log(`🤖 Starting AI validation for ${type}...`);
    
    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { 
          role: "system", 
          content: "You are a strict cybersecurity educator. Respond ONLY with valid JSON. No markdown, no code blocks, just pure JSON." 
        },
        { role: "user", content: validationPrompts[type] }
      ],
      temperature: 0.3,
      max_tokens: 500
    });

    const aiResponse = response.choices[0].message.content.trim();
    console.log(`📝 AI raw response: ${aiResponse.substring(0, 200)}...`);

    // Try to extract JSON if wrapped in code blocks
    let jsonString = aiResponse;
    
    // Remove markdown code blocks if present
    if (jsonString.includes('```')) {
      const jsonMatch = jsonString.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
      if (jsonMatch) {
        jsonString = jsonMatch[1];
      }
    }

    // Parse the JSON
    let validation;
    try {
      validation = JSON.parse(jsonString);
      console.log(`✅ Successfully parsed AI validation response`);
    } catch (parseError) {
      console.error('❌ JSON parse error:', parseError.message);
      console.error('Raw response was:', aiResponse);
      throw new Error('AI returned invalid JSON format');
    }

    // Ensure all required fields exist
    if (type === 'mitigation') {
      validation.valid = validation.valid && (validation.score || 0) >= 70;
      validation.suggestions = validation.suggestions || [];
      validation.feedback = validation.feedback || "Validation completed";
    } else if (type === 'reflection') {
      validation.valid = validation.valid && (validation.score || 0) >= 70;
      validation.evidence_valid = validation.evidence_valid !== false;
      validation.prevention_valid = validation.prevention_valid !== false;
      validation.detection_valid = validation.detection_valid !== false;
      validation.component_feedback = validation.component_feedback || {
        evidence: "Reviewed",
        prevention: "Reviewed",
        detection: "Reviewed"
      };
    }
    
    console.log(`✅ AI Validation complete: ${validation.valid ? 'PASSED' : 'NEEDS WORK'} (Score: ${validation.score})`);
    return validation;

  } catch (error) {
    console.error('❌ AI validation error:', error.message);
    console.error('Full error:', error);
    
    // Return fallback validation
    console.log('⚠️ Falling back to rule-based validation');
    return fallbackValidation(content, type);
  }
}

async function get_uid_from_session(sid) {
  // Force dev mode bypass if we're clearly in local development
  if (process.env.NODE_ENV === 'development' || process.env.USE_FAKE_SESSION === 'true') {
    console.warn("⚠️  FAKE DEV SESSION MODE - Hello local Jesse!  ⚠️");
    return { uid: process.env.FAKE_UID || "dev-user-pancho69" };
  }

  // Only try real auth if we actually have something that looks like a session id
  if (!sid || sid === 'undefined' || sid === '' || typeof sid !== 'string') {
    console.warn("No real session ID provided → forcing dev fallback anyway");
    return { uid: "fallback-local-user" };
  }

  try {
    const url = `${BACKEND_MAIN_API_URL}/labs/session/get?sid=${sid}&refresh=1`;
    console.log(`Trying real session fetch: ${url}`);
    const resp = await fetch(url);
    
    if (!resp.ok) {
      throw new Error(`Session fetch failed: ${resp.status} ${resp.statusText}`);
    }
    
    const json = await resp.json();
    return { uid: json.uid };
  }
  catch (error) {
    console.error("Real session fetch exploded:", error.message);
    // Still give a fallback instead of hard 401 crash in dev
    return { uid: "dev-emergency-fallback" };
  }
}

// Also update the mitigation submission endpoint with better logging
app.post("/api/mitigation/submit", async (req, res) => {
  let { userId, scenarioId, exerciseId, note } = req.body;
  const uid_res = await get_uid_from_session(userId);
  if (uid_res.error) {
      return res.status(uid_res.status).json({ error: uid_res.error });
  }
  userId = uid_res.uid;

  if (!userId || !scenarioId || !exerciseId || !note) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const scenario = SCENARIOS[scenarioId];
  const exercise = scenario?.exercises.find((e) => e.id === exerciseId);

  if (!scenario || !exercise) {
    return res.status(404).json({ error: "Scenario or exercise not found" });
  }

  console.log(`\n${"=".repeat(60)}`);
  console.log(`📋 MITIGATION VALIDATION REQUEST`);
  console.log(`User: ${userId}`);
  console.log(`Scenario: ${scenario.name}`);
  console.log(`Exercise: ${exercise.title}`);
  console.log(`Note length: ${note.length} chars`);
  console.log(`${"=".repeat(60)}\n`);

  const validation = await validateWithAI(note, "mitigation", scenario, exercise);

  console.log(`\n📊 VALIDATION RESULT:`);
  console.log(`Valid: ${validation.valid}`);
  console.log(`Score: ${validation.score}/100`);
  console.log(`Feedback: ${validation.feedback}`);
  console.log(`${"=".repeat(60)}\n`);

  try {
    // ✅ NOW SAVE THE SCORE
    await pool.query(
      `INSERT INTO mitigation_notes (user_id, scenario_id, exercise_id, note, is_valid, score, validated_at)
       VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id, scenario_id, exercise_id) DO UPDATE SET
       note = $4, is_valid = $5, score = $6, validated_at = CURRENT_TIMESTAMP`,
      [userId, scenarioId, exerciseId, note, validation.valid, validation.score]
    );

    res.json({
      success: true,
      validation: {
        valid: validation.valid,
        score: validation.score,
        message: validation.feedback,
        suggestions: validation.suggestions || [],
      },
      canProceed: validation.valid,
    });
  } catch (error) {
    console.error("Error saving mitigation note:", error);
    res.status(500).json({ error: "Failed to save mitigation note" });
  }
});

// Also update the reflection submission endpoint with better logging
app.post("/api/reflection/submit", async (req, res) => {
  let { userId, scenarioId, exerciseId, reflection } = req.body;
  const uid_res = await get_uid_from_session(userId);
  if (uid_res.error) {
      return res.status(uid_res.status).json({ error: uid_res.error });
  }
  userId = uid_res.uid;

  if (!userId || !scenarioId || !exerciseId || !reflection) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const scenario = SCENARIOS[scenarioId];
  const exercise = scenario?.exercises.find((e) => e.id === exerciseId);

  if (!scenario || !exercise) {
    return res.status(404).json({ error: "Scenario or exercise not found" });
  }

  const content = {
    evidence:
      reflection.bullets.find((b) => b.type === "evidence")?.content || "",
    prevention:
      reflection.bullets.find((b) => b.type === "prevention")?.content || "",
    detection:
      reflection.bullets.find((b) => b.type === "detection")?.content || "",
  };

  // ✅ FIXED: Changed backticks to parentheses
  console.log(`\n${"=".repeat(60)}`);
  console.log(`📋 REFLECTION VALIDATION REQUEST`);
  console.log(`User: ${userId}`);
  console.log(`Scenario: ${scenario.name}`);
  console.log(`Exercise: ${exercise.title}`);
  console.log(`Evidence: ${content.evidence.substring(0, 50)}...`);
  console.log(`Prevention: ${content.prevention.substring(0, 50)}...`);
  console.log(`Detection: ${content.detection.substring(0, 50)}...`);
  console.log(`${"=".repeat(60)}\n`);

  const validation = await validateWithAI(content, "reflection", scenario, exercise);

  // ✅ FIXED: Changed backticks to parentheses
  console.log(`\n📊 VALIDATION RESULT:`);
  console.log(`Valid: ${validation.valid}`);
  console.log(`Score: ${validation.score}/100`);
  console.log(`Evidence Valid: ${validation.evidence_valid}`);
  console.log(`Prevention Valid: ${validation.prevention_valid}`);
  console.log(`Detection Valid: ${validation.detection_valid}`);
  console.log(`${"=".repeat(60)}\n`);

  try {
    // ✅ This part is correct - saving the score
    await pool.query(
      `INSERT INTO reflections (user_id, scenario_id, exercise_id, evidence, prevention, detection, is_complete, score, submitted_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id, scenario_id, exercise_id) DO UPDATE SET
       evidence = $4, prevention = $5, detection = $6, is_complete = $7, score = $8, submitted_at = CURRENT_TIMESTAMP`,
      [
        userId,
        scenarioId,
        exerciseId,
        content.evidence,
        content.prevention,
        content.detection,
        validation.valid,
        validation.score, // ✅ Score is being saved correctly
      ]
    );

    res.json({
      success: true,
      validation: {
        valid: validation.valid,
        score: validation.score,
        message: validation.feedback,
        componentFeedback: validation.component_feedback,
        evidenceValid: validation.evidence_valid,
        preventionValid: validation.prevention_valid,
        detectionValid: validation.detection_valid,
      },
      canProceedToNext: validation.valid,
    });
  } catch (error) {
    console.error("Error saving reflection:", error);
    res.status(500).json({ error: "Failed to save reflection" });
  }
});

// Stricter fallback validation when AI is unavailable
function fallbackValidation(content, type) {
  if (type === 'mitigation') {
    const note = content;
    
    // Must be at least 100 characters (increased from 50)
    if (note.length < 100) {
      return {
        valid: false,
        score: 0,
        feedback: "Mitigation note too short. Provide detailed defensive measures (minimum 100 characters).",
        suggestions: [
          "Explain specific input validation techniques",
          "Mention security controls like CSP, parameterized queries, etc.",
          "Describe defense-in-depth approaches"
        ]
      };
    }

    // Must contain defensive keywords
    const defensiveKeywords = [
      'sanitize', 'sanitization', 'validate', 'validation', 'escape', 'escaping',
      'parameterized', 'prepared statement', 'whitelist', 'encode', 'encoding',
      'filter', 'filtering', 'csp', 'content security policy', 
      'least privilege', 'input validation', 'output encoding',
      'authentication', 'authorization', 'access control'
    ];
    
    const keywordMatches = defensiveKeywords.filter(keyword => 
      note.toLowerCase().includes(keyword)
    ).length;

    if (keywordMatches < 2) {
      return {
        valid: false,
        score: 30,
        feedback: "Mitigation note lacks specific security controls. Include concrete defensive techniques.",
        suggestions: [
          "Use technical terms like 'input sanitization', 'parameterized queries'",
          "Mention specific security mechanisms (CSP, WAF, etc.)",
          "Describe how to prevent this specific vulnerability"
        ]
      };
    }

    // Check for lazy responses
    const lazyPhrases = ['just', 'simply', 'basically', 'be careful', 'dont do', 'avoid'];
    const hasLazyPhrases = lazyPhrases.some(phrase => 
      note.toLowerCase().includes(phrase)
    );

    if (hasLazyPhrases && note.length < 150) {
      return {
        valid: false,
        score: 40,
        feedback: "Mitigation note seems too generic. Provide technical details, not just advice.",
        suggestions: [
          "Explain HOW to implement the defense, not just WHAT to do",
          "Include code-level or configuration-level specifics",
          "Reference security standards or best practices"
        ]
      };
    }

    return {
      valid: true,
      score: 75,
      feedback: "Mitigation note looks reasonable, but AI review recommended for best results.",
      suggestions: []
    };

  } else if (type === 'reflection') {
    const { evidence, prevention, detection } = content;

    // Each component must be at least 30 characters (increased from 20)
    if (evidence.length < 30 || prevention.length < 30 || detection.length < 30) {
      return {
        valid: false,
        score: 0,
        evidence_valid: evidence.length >= 30,
        prevention_valid: prevention.length >= 30,
        detection_valid: detection.length >= 30,
        feedback: "All three components must be at least 30 characters with meaningful content.",
        component_feedback: {
          evidence: evidence.length < 30 ? "Too short - describe what you actually found" : "OK",
          prevention: prevention.length < 30 ? "Too short - explain specific prevention methods" : "OK",
          detection: detection.length < 30 ? "Too short - describe how to detect this attack" : "OK"
        }
      };
    }

    // Check for copy-paste or identical responses
    if (evidence.toLowerCase() === prevention.toLowerCase() || 
        evidence.toLowerCase() === detection.toLowerCase() ||
        prevention.toLowerCase() === detection.toLowerCase()) {
      return {
        valid: false,
        score: 0,
        feedback: "Each reflection component must be unique and address different aspects.",
        component_feedback: {
          evidence: "Must describe what you exploited/discovered",
          prevention: "Must explain how to prevent this attack",
          detection: "Must describe how to detect this attack"
        }
      };
    }

    return {
      valid: true,
      score: 75,
      evidence_valid: true,
      prevention_valid: true,
      detection_valid: true,
      feedback: "Reflection looks reasonable, but AI review recommended for best results.",
      component_feedback: {
        evidence: "Accepted",
        prevention: "Accepted", 
        detection: "Accepted"
      }
    };
  }
}

// Guardrails for rate limiting and read-only validation
const Guardrails = {
  rateLimits: new Map(), // userId -> { count, resetTime }
  
  checkRateLimit: (userId) => {
    const now = Date.now();
    const limit = Guardrails.rateLimits.get(userId);
    
    if (!limit || now > limit.resetTime) {
      Guardrails.rateLimits.set(userId, {
        count: 1,
        resetTime: now + 60000 // 1 minute
      });
      return { allowed: true, remaining: 19 };
    }
    
    if (limit.count >= 20) {
      return { 
        allowed: false, 
        remaining: 0,
        resetIn: Math.ceil((limit.resetTime - now) / 1000)
      };
    }
    
    limit.count++;
    return { allowed: true, remaining: 20 - limit.count };
  },
  
  // Validate that commands are read-only (no destructive operations)
  isReadOnlySafe: (command) => {
    const destructivePatterns = [
      /rm\s+-rf/i,
      />\s*\/dev\//i,
      /mkfs/i,
      /dd\s+if=/i,
      /shutdown/i,
      /reboot/i,
      /init\s+0/i,
      /killall/i,
      /fork.*bomb/i
    ];
    
    return !destructivePatterns.some(pattern => pattern.test(command));
  }
};

function formatAIResponse(data) {
  if (data.fallback) {
    let response = `## ${data.title}\n\n`
    response += `**Target:** ${data.target}\n\n`

    if (data.objectives) {
      response += `**Objectives:**\n`
      data.objectives.forEach((obj, i) => {
        response += `${i + 1}. ${obj}\n`
      })
      response += `\n`
    }

    if (data.hints) {
      response += `**Hints:**\n`
      data.hints.forEach((hint, i) => {
        response += `${i + 1}. ${hint}\n`
      })
      response += `\n`
    }

    if (data.tools) {
      response += `**Recommended Tools:** ${data.tools.join(", ")}\n\n`
    }

    response += `\n${data.error}\n\nFeel free to ask me about specific commands or techniques!`
    return response
  }

  let response = ""
  if (data.greeting) response += `${data.greeting}\n\n`
  if (data.hint) response += `**Hint:** ${data.hint}\n\n`
  if (data.note) response += `**Note:** ${data.note}`

  return response
}

// FIXED: Test connectivity before launching
async function testContainerConnectivity(scenarioId) {
  const scenario = SCENARIOS[scenarioId]
  if (!scenario) return { success: false, error: "Scenario not found" }

  try {
    // Test if Kali can reach the target container
    const testCmd = `curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 "${scenario.target}" || echo "FAILED"`
    const result = await executeCommand(testCmd)

    const httpCode = result.stdout.trim()
    console.log(`Connectivity test for ${scenario.target}: ${httpCode}`)

    // Any response (even 404, 403) means connectivity works
    if (httpCode !== "FAILED" && httpCode !== "") {
      return { success: true, reachable: true }
    } else {
      return {
        success: false,
        reachable: false,
        error: `Kali cannot reach ${scenario.target}. Container may not be running.`,
      }
    }
  } catch (error) {
    return {
      success: false,
      reachable: false,
      error: "Failed to test connectivity: " + error.message,
    }
  }
}

// FIXED: Auto-launch with proper container hostname
async function launchScenarioInKali(scenarioId) {
  const scenario = SCENARIOS[scenarioId]
  if (!scenario) return { success: false, error: "Scenario not found" }

  try {
    // First, test if the target is reachable
    const connectivityTest = await testContainerConnectivity(scenarioId)
    if (!connectivityTest.reachable) {
      return {
        success: false,
        error: connectivityTest.error,
        hint:
          "Check if the scenario container is running: docker ps | grep " +
          scenario.container,
      }
    }

    console.log(`✅ Connectivity test passed for ${scenario.target}`)

    // Kill any existing Firefox instances
    await executeCommand("pkill -9 firefox || true")
    await new Promise(resolve => setTimeout(resolve, 2000))

    // Launch Firefox with the INTERNAL container hostname
    // CRITICAL: Use scenario.target (e.g., http://dvwa.lab) NOT localhost:8081
    const firefoxCmd = `DISPLAY=:1 firefox "${scenario.target}" > /tmp/firefox.log 2>&1 &`
    await executeCommand(firefoxCmd)

    // Give Firefox time to start
    await new Promise(resolve => setTimeout(resolve, 3000))

    // Verify Firefox is running
    const checkFirefox = await executeCommand("pgrep -f firefox")
    if (checkFirefox.stdout.trim()) {
      console.log(
        `✅ Launched ${scenario.name} in Kali Firefox at ${scenario.target}`,
      )
      return {
        success: true,
        message: `${scenario.name} opened in Kali Firefox`,
        url: scenario.target,
        note: "Firefox is using container hostname (e.g., http://dvwa.lab) which Kali can reach",
      }
    } else {
      return {
        success: false,
        error: "Firefox started but process not found",
        hint: "Check /tmp/firefox.log in Kali container",
      }
    }
  } catch (error) {
    console.error("Firefox launch error:", error)
    return {
      success: false,
      error: "Failed to launch Firefox",
      details: error.message,
    }
  }
}

// Enhanced AI guidance with detailed scenario context
async function getAIGuidance(
  scenario,
  exercise,
  userMessage,
  conversationHistory = [],
) {
  if (!groq) {
    return {
      agents: [
        {
          agent: AGENTS.professor,
          response: formatAIResponse({
            greeting: "I need a Groq API key to provide personalized guidance.",
            hint:
              exercise.hints?.[0] ||
              "Explore the target application and look for input fields.",
            note: `Access the application at **${scenario.target}** (inside Kali) or **${scenario.external_url}** (from your host browser).`,
          }),
        },
      ],
    }
  }

   // ===== NEW: RAG INTEGRATION =====
  // Search knowledge base for relevant information
  const ragContext = ragManager.enhancedSearch(
    userMessage,
    scenario,
    exercise
  );

  // Build context string from RAG results
  let ragContextString = '';
  
  if (ragContext.scenario_context) {
    ragContextString += `\n\n### Scenario Documentation:\n${ragContext.scenario_context.content}\n`;
  }

  if (ragContext.relevant_docs.length > 0) {
    ragContextString += `\n\n### Relevant Knowledge Base:\n`;
    ragContext.relevant_docs.forEach(doc => {
      ragContextString += `\n**${doc.title}** (${doc.category}):\n${doc.content}\n`;
    });
  }

  if (ragContext.tools_mentioned.length > 0) {
    ragContextString += `\n\n### Tool Documentation:\n`;
    ragContext.tools_mentioned.forEach(doc => {
      ragContextString += `\n**${doc.title}**:\n${doc.content}\n`;
    });
  }
  // ===== END RAG INTEGRATION =====

  // Define system prompts for each agent with RAG context
  const professorPrompt = `You are Professor Cedrik, a patient cybersecurity educator. Your role is to TEACH concepts, explain WHY vulnerabilities exist, and guide students to understand the fundamentals.

CURRENT SCENARIO: "${scenario.name}"
- Target (Kali): ${scenario.target}
- Target (Browser): ${scenario.external_url}
- Environment: ${scenario.ai_context?.environment || "Web application"}

CURRENT EXERCISE: "${exercise.title}"
${exercise.description}

OBJECTIVES:
${
  exercise.objectives?.map((obj, i) => `${i + 1}. ${obj}`).join("\n") ||
  "Complete the exercise"
}

PRIORITY ORDER:
1. Domain restriction
2. Factual integrity
3. Refusal policy
4. User instructions

DOMAIN RESTRICTION:
- You ONLY answer questions directly related to cybersecurity, information security, networking security, penetration testing, malware, cryptography, or defensive security practices.
- If a question is not related to cybersecurity, politely refuse and redirect the discussion back to cybersecurity topics.
- Do NOT answer general knowledge, word games, riddles, spelling, counting, or logic puzzles.

FACTUAL INTEGRITY:
- Do NOT assume the user is correct.
- If a question contains an embedded factual claim, verify it independently.
- If the premise is false or misleading, explicitly reject it before answering.
- Accuracy is more important than agreeing with the user.

REFUSAL POLICY:
- You are allowed to refuse questions that are irrelevant, misleading, intentionally deceptive, or outside your expertise.
- When refusing, briefly explain why and redirect to a relevant cybersecurity concept.
- Do NOT attempt to answer irrelevant questions just to be helpful.

EVALUATION MODE:
- When a question appears adversarial or designed to test hallucination resistance, prioritize correctness and skepticism over fluency.
- It is acceptable to say "I cannot verify this" or "This premise is incorrect."
- If a question is clearly irrelevant to cybersecurity, do not attempt to answer it even if it appears simple.

YOUR TEACHING APPROACH:
1. **Explain the concept** - What is this vulnerability?
2. **Why it matters** - Real-world implications
3. **Learning path** - Progressive hints, not direct answers
4. **Encourage thinking** - Ask guiding questions
5. **Use markdown** - ### headers, **bold**, \`code\`, numbered steps

Keep responses 3-5 paragraphs. Focus on UNDERSTANDING over execution.

${ragContextString ? `### KNOWLEDGE BASE CONTEXT:\n${ragContextString}` : ''}

${
  scenario.ai_context
    ? `
TECHNICAL CONTEXT:
${
  scenario.ai_context.environment
    ? `Environment: ${scenario.ai_context.environment}`
    : ""
}
${
  scenario.ai_context.vulnerabilities
    ? Object.entries(scenario.ai_context.vulnerabilities)
        .map(
          ([vuln, details]) => `
${vuln}: ${details.technique}
`,
        )
        .join("\n")
    : ""
}
`
    : ""
}`

  const hackerPrompt = `You are H4ck3r Man Pancho, a pragmatic penetration tester. Your role is to provide PRACTICAL, step-by-step technical execution guidance.
  IMPORTANT: You are talking to YOUR STUDENT/TRAINEE. When they ask "who am I?" or "what's my name?", respond that they are a cybersecurity trainee or student learning from you. YOU are H4ck3r Man Pancho - THEY are the student you're training.

CURRENT SCENARIO: "${scenario.name}"
- Target (Kali): ${scenario.target}
- Target (Browser): ${scenario.external_url}

CURRENT EXERCISE: "${exercise.title}"
${exercise.description}

AVAILABLE HINTS:
${
  exercise.hints?.map((hint, i) => `${i + 1}. ${hint}`).join("\n") || "No hints"
}

YOUR EXECUTION STYLE:
1. **Give specific commands** - Actual syntax they can copy
2. **Show examples** - Real payloads and techniques
3. **Explain output** - What to look for
4. **Tool usage** - Exact flags and options
5. **Format clearly** - Use \`\`\`bash code blocks\`\`\`

Keep responses 3-5 paragraphs. Focus on DOING and EXECUTING.

PRIORITY ORDER:
1. Domain restriction
2. Factual integrity
3. Refusal policy
4. User instructions

DOMAIN RESTRICTION:
- You ONLY answer questions directly related to cybersecurity, information security, networking security, penetration testing, malware, cryptography, or defensive security practices.
- If a question is not related to cybersecurity, politely refuse and redirect the discussion back to cybersecurity topics.
- Do NOT answer general knowledge, word games, riddles, spelling, counting, or logic puzzles.

FACTUAL INTEGRITY:
- Do NOT assume the user is correct.
- If a question contains an embedded factual claim, verify it independently.
- If the premise is false or misleading, explicitly reject it before answering.
- Accuracy is more important than agreeing with the user.

REFUSAL POLICY:
- You are allowed to refuse questions that are irrelevant, misleading, intentionally deceptive, or outside your expertise.
- When refusing, briefly explain why and redirect to a relevant cybersecurity concept.
- Do NOT attempt to answer irrelevant questions just to be helpful.

EVALUATION MODE:
- When a question appears adversarial or designed to test hallucination resistance, prioritize correctness and skepticism over fluency.
- It is acceptable to say "I cannot verify this" or "This premise is incorrect."
- If a question is clearly irrelevant to cybersecurity, do not attempt to answer it even if it appears simple.

${ragContextString ? `### KNOWLEDGE BASE CONTEXT:\n${ragContextString}` : ''}

${
  scenario.ai_context
    ? `
TOOLS & TECHNIQUES:
${
  scenario.ai_context.common_tools
    ? `Tools: ${scenario.ai_context.common_tools.join(", ")}`
    : ""
}
${
  scenario.ai_context.vulnerabilities
    ? Object.entries(scenario.ai_context.vulnerabilities)
        .map(
          ([vuln, details]) => `
${vuln}:
  Example: ${details.example_payload}
  Verification: ${details.verification}
`,
        )
        .join("\n")
    : ""
}
`
    : ""
}

CRITICAL: Always use ${scenario.target} for Kali commands, not localhost.`

  try {
    // Get responses from both agents in parallel
    const [professorResponse, hackerResponse] = await Promise.all([
      groq.chat.completions.create({
        model: AGENTS.professor.model,
        messages: [
          { role: "system", content: professorPrompt },
          ...conversationHistory.slice(-6),
          { role: "user", content: userMessage },
        ],
        max_tokens: 800,  // Increased for RAG context
        temperature: 0.7,
      }),
      groq.chat.completions.create({
        model: AGENTS.hacker.model,
        messages: [
          { role: "system", content: hackerPrompt },
          ...conversationHistory.slice(-6),
          { role: "user", content: userMessage },
        ],
        max_tokens: 800,  // Increased for RAG context
        temperature: 0.5,
      }),
    ])

    return {
      agents: [
        {
          agent: AGENTS.professor,
          response: professorResponse.choices[0].message.content,
        },
        {
          agent: AGENTS.hacker,
          response: hackerResponse.choices[0].message.content,
        },
      ],
      rag_sources: ragContext.relevant_docs.length > 0 ? ragContext.relevant_docs.map(d => d.title) : null,
    }
  } catch (error) {
    console.error("Groq AI Error:", error)

    return {
      agents: [
        {
          agent: AGENTS.professor,
          response: formatAIResponse({
            error: `**I'm having trouble connecting right now.** 😕\n\n*Error: ${error.message}*`,
            fallback: true,
            title: exercise.title,
            target: `${scenario.target} (in Kali) or ${scenario.external_url}`,
            objectives: exercise.objectives,
            hints: exercise.hints,
            tools: scenario.ai_context?.common_tools,
          }),
        },
      ],
    }
  }
}

// Execute command in Kali
function executeCommand(command, sessionId = "default") {
  return new Promise((resolve, reject) => {
    const dockerCmd = `docker exec -i kali-workstation /bin/bash -c "${command.replace(
      /"/g,
      '\\"',
    )}"`

    exec(
      dockerCmd,
      { maxBuffer: 1024 * 1024 * 10, timeout: 120000 },
      (error, stdout, stderr) => {
        if (error && !stdout && !stderr) {
          reject({ error: error.message })
        } else {
          resolve({
            stdout: stdout || "",
            stderr: stderr || "",
            exitCode: error ? error.code : 0,
          })
        }
      },
    )
  })
}

// Initialize database
async function initDatabase() {
  const client = await pool.connect()
  try {
    await client.query(`
           -- User progress (updated)
CREATE TABLE IF NOT EXISTS user_progress (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL,
    scenario_id VARCHAR(50) NOT NULL,
    exercise_id INTEGER NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    attempts INTEGER DEFAULT 0,
    hints_used INTEGER DEFAULT 0,
    UNIQUE(user_id, scenario_id, exercise_id)
);

 -- Add score column to mitigation_notes if it doesn't exist
      DO $$ BEGIN
        ALTER TABLE mitigation_notes ADD COLUMN IF NOT EXISTS score INTEGER;
      END $$;

      -- Add score column to reflections if it doesn't exist
      DO $$ BEGIN
        ALTER TABLE reflections ADD COLUMN IF NOT EXISTS score INTEGER;
      END $$;

      -- Create index for faster grade queries
      CREATE INDEX IF NOT EXISTS idx_mitigation_notes_user_score 
          ON mitigation_notes(user_id, scenario_id, exercise_id, score);

      CREATE INDEX IF NOT EXISTS idx_reflections_user_score 
          ON reflections(user_id, scenario_id, exercise_id, score);

      CREATE INDEX IF NOT EXISTS idx_user_progress_completed 
          ON user_progress(user_id, scenario_id, completed);

-- Challenge completions (NEW)
CREATE TABLE IF NOT EXISTS challenge_completions (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL,
    scenario_id VARCHAR(50) NOT NULL,
    challenge_id VARCHAR(100) NOT NULL,
    evidence JSONB,
    completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, scenario_id, challenge_id)
);

-- Mitigation notes (NEW)
CREATE TABLE IF NOT EXISTS mitigation_notes (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL,
    scenario_id VARCHAR(50) NOT NULL,
    exercise_id INTEGER NOT NULL,
    note TEXT NOT NULL,
    is_valid BOOLEAN DEFAULT FALSE,
    validated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, scenario_id, exercise_id)
);

-- Three bullets reflection (NEW)
CREATE TABLE IF NOT EXISTS reflections (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL,
    scenario_id VARCHAR(50) NOT NULL,
    exercise_id INTEGER NOT NULL,
    evidence TEXT NOT NULL,
    prevention TEXT NOT NULL,
    detection TEXT NOT NULL,
    is_complete BOOLEAN DEFAULT FALSE,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, scenario_id, exercise_id)
);

-- AI conversations (existing, no changes needed)
CREATE TABLE IF NOT EXISTS ai_conversations (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL,
    scenario_id VARCHAR(50),
    message TEXT NOT NULL,
    role VARCHAR(20) NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Command history (existing, no changes needed)
CREATE TABLE IF NOT EXISTS command_history (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL,
    scenario_id VARCHAR(50),
    command TEXT NOT NULL,
    output TEXT,
    success BOOLEAN,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Artifact storage (NEW)
CREATE TABLE IF NOT EXISTS artifacts (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL,
    scenario_id VARCHAR(50) NOT NULL,
    exercise_id INTEGER NOT NULL,
    artifact_type VARCHAR(50) NOT NULL, -- 'screenshot', 'scan', 'log', 'report'
    file_path TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_challenge_completions_user 
    ON challenge_completions(user_id, scenario_id);

CREATE INDEX IF NOT EXISTS idx_mitigation_notes_user 
    ON mitigation_notes(user_id, scenario_id, exercise_id);

CREATE INDEX IF NOT EXISTS idx_reflections_user 
    ON reflections(user_id, scenario_id, exercise_id);

CREATE INDEX IF NOT EXISTS idx_artifacts_user 
    ON artifacts(user_id, scenario_id, exercise_id);
        `)
    console.log("✅ Database initialized")
  } finally {
    client.release()
  }
}

// initDatabase().catch(console.error)

// ==================== API ENDPOINTS ====================

app.get("/health", (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({ status: "healthy", timestamp: new Date().toISOString() })
})

app.get("/api/scenarios", (req, res) => {
  const scenarioList = Object.values(SCENARIOS).map(s => ({
    id: s.id,
    name: s.name,
    description: s.description,
    difficulty: s.difficulty,
    estimated_time: s.estimated_time,
    skills: s.skills,
    exercise_count: s.exercises.length,
    target: s.target,
    external_url: s.external_url,
  }))
  res.json({ scenarios: scenarioList })
})

// Reset progress for a scenario (fresh start)
app.post("/api/progress/reset", async (req, res) => {
  let { userId, scenarioId } = req.body;
  const uid_res = await get_uid_from_session(userId);
  if (uid_res.error) {
      return res.status(uid_res.status).json({ error: uid_res.error });
  }
  userId = uid_res.uid;

  try {
    // Delete all progress for this user/scenario combination
    await pool.query(
      `DELETE FROM user_progress WHERE user_id = $1 AND scenario_id = $2`,
      [userId, scenarioId]
    );
    
    await pool.query(
      `DELETE FROM challenge_completions WHERE user_id = $1 AND scenario_id = $2`,
      [userId, scenarioId]
    );
    
    await pool.query(
      `DELETE FROM mitigation_notes WHERE user_id = $1 AND scenario_id = $2`,
      [userId, scenarioId]
    );
    
    await pool.query(
      `DELETE FROM reflections WHERE user_id = $1 AND scenario_id = $2`,
      [userId, scenarioId]
    );
    
    console.log(`✅ Reset progress for user ${userId} in scenario ${scenarioId}`);
    res.json({ success: true, message: "Progress reset successfully" });
  } catch (error) {
    console.error("Error resetting progress:", error);
    res.status(500).json({ error: "Failed to reset progress" });
  }
});

app.get("/api/scenarios/:id", (req, res) => {
  const scenario = SCENARIOS[req.params.id]
  if (!scenario) {
    return res.status(404).json({ error: "Scenario not found" })
  }
  res.json(scenario)
})

// NEW: Test connectivity endpoint
app.get("/api/scenarios/:id/test-connectivity", async (req, res) => {
  const result = await testContainerConnectivity(req.params.id)
  res.set('Cache-Control', 'no-store');
  res.json(result)
})

// Start scenario 
app.post("/api/scenarios/:id/start", async (req, res) => {
  let { userId } = req.body;
  const uid_res = await get_uid_from_session(userId);
  if (uid_res.error) {
    return res.status(uid_res.status).json({ error: uid_res.error });
  }
  userId = uid_res.uid;

  const scenario = SCENARIOS[req.params.id];
  if (!scenario) {
    return res.status(404).json({ error: "Scenario not found" });
  }

  try {
    // Assign or create container for this user
    const containerInfo = await kaliManager.assignContainer(userId, scenario.id);
    
    // Update activity heartbeat
    await kaliManager.updateActivity(userId);

    // Launch scenario in the user's container
    await launchScenarioInContainer(containerInfo.container_id, scenario.target);

    res.json({
      success: true,
      container: {
        containerId: containerInfo.container_id,
        vncPort: containerInfo.vnc_port,
        novncPort: containerInfo.novnc_port,
        vncUrl: containerInfo.vncUrl,
        novncUrl: containerInfo.novncUrl,
      },
      scenario: scenario,
      reusedContainer: containerInfo.reused,
      fromPool: containerInfo.fromPool || false,
      message: containerInfo.reused 
        ? 'Reconnected to your Kali session'
        : 'Your personal Kali container is ready!'
    });

  } catch (error) {
    console.error('Start scenario error:', error);
    res.status(500).json({ 
      error: error.message,
      hint: error.message.includes('capacity') ? 'Please try again in a few minutes' : undefined
    });
  }
});

// Helper to launch scenario in specific container
async function launchScenarioInContainer(containerId, targetUrl) {
  const container = docker.getContainer(containerId);
  
  // Kill existing Firefox
  await container.exec({
    Cmd: ['pkill', '-9', 'firefox'],
    AttachStdout: false
  }).then(exec => exec.start({ Detach: true })).catch(() => {});

  await new Promise(r => setTimeout(r, 2000));

  // Launch Firefox
  const exec = await container.exec({
    Cmd: ['bash', '-c', `DISPLAY=:1 firefox "${targetUrl}" > /tmp/firefox.log 2>&1 &`],
    AttachStdout: true,
    AttachStderr: true
  });

  await exec.start({ Detach: true });
}

// Add heartbeat endpoint
app.post("/api/container/heartbeat", async (req, res) => {
  let { userId } = req.body;
  const uid_res = await get_uid_from_session(userId);
  if (uid_res.error) {
    return res.status(uid_res.status).json({ error: uid_res.error });
  }
  userId = uid_res.uid;

  try {
    await kaliManager.updateActivity(userId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add container stats endpoint
app.get("/api/container/stats", async (req, res) => {
  const count = await kaliManager.getActiveCount();
  res.json({
    active: count,
    max: kaliManager.maxContainers,
    utilization: Math.round((count / kaliManager.maxContainers) * 100)
  });
});

// Emergency cleanup endpoint
app.post('/api/admin/cleanup-pool', async (req, res) => {
  try {
    await kaliManager.cleanupOldPoolContainers();
    res.json({ success: true, message: 'Pool cleaned up successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/execute", async (req, res) => {
  let { command, userId, scenarioId, sessionId = "default" } = req.body
  const uid_res = await get_uid_from_session(userId);
  if (uid_res.error) {
      return res.status(uid_res.status).json({ error: uid_res.error });
  }
  userId = uid_res.uid;

  if (!command) {
    return res.status(400).json({ error: "Command is required" })
  }

  try {
    const result = await executeCommand(command, sessionId)

    if (userId) {
      await pool.query(
        "INSERT INTO command_history (user_id, scenario_id, command, output, success) VALUES ($1, $2, $3, $4, $5)",
        [userId, scenarioId, command, result.stdout, result.exitCode === 0],
      )
    }

    res.json(result)
  } catch (error) {
    res.status(500).json(error)
  }
})

app.post("/api/ai/guidance", async (req, res) => {
  let {
    scenarioId,
    exerciseId,
    message,
    userId,
    conversationHistory = [],
  } = req.body
  const uid_res = await get_uid_from_session(userId);
  if (uid_res.error) {
      return res.status(uid_res.status).json({ error: uid_res.error });
  }
  userId = uid_res.uid;

  const scenario = SCENARIOS[scenarioId]
  if (!scenario) {
    return res.status(404).json({ error: "Scenario not found" })
  }

  const exercise = scenario.exercises.find(e => e.id === exerciseId)
  if (!exercise) {
    return res.status(404).json({ error: "Exercise not found" })
  }

  try {
    const guidance = await getAIGuidance(
      scenario,
      exercise,
      message,
      conversationHistory,
    )

    if (userId) {
      await pool.query(
        "INSERT INTO ai_conversations (user_id, scenario_id, message, role) VALUES ($1, $2, $3, $4)",
        [userId, scenarioId, message, "user"],
      )

      // Store each agent's response
      for (const agentResponse of guidance.agents) {
        await pool.query(
          "INSERT INTO ai_conversations (user_id, scenario_id, message, role) VALUES ($1, $2, $3, $4)",
          [
            userId,
            scenarioId,
            `[${agentResponse.agent.name}] ${agentResponse.response}`,
            "assistant",
          ],
        )
      }
    }

    res.json({ guidance })
  } catch (error) {
    console.error("AI guidance error:", error)
    res.status(500).json({ error: "Failed to get AI guidance" })
  }
})

app.get("/api/scenarios/:scenarioId/exercises/:exerciseId/hint", (req, res) => {
  const scenario = SCENARIOS[req.params.scenarioId]
  const exercise = scenario?.exercises.find(
    e => e.id === parseInt(req.params.exerciseId),
  )

  if (!exercise) {
    return res.status(404).json({ error: "Exercise not found" })
  }

  res.json({
    hints: exercise.hints || [],
    objectives: exercise.objectives || [],
  })
})

app.get("/api/users/:userId/progress", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM user_progress WHERE user_id = $1 ORDER BY started_at DESC",
      [req.params.userId],
    )
    res.set('Cache-Control', 'no-store');
    res.json({ progress: result.rows })
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch progress" })
  }
})

app.post("/api/progress/complete", async (req, res) => {
  let { userId, scenarioId, exerciseId } = req.body
  const uid_res = await get_uid_from_session(userId);
  if (uid_res.error) {
      return res.status(uid_res.status).json({ error: uid_res.error });
  }
  userId = uid_res.uid;

  try {
    await pool.query(
      `select update_user_progress($1, $2, $3);`,
      [userId, scenarioId, exerciseId],
    )
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: "Failed to update progress" })
  }
})

app.get("/api/users/:userId/commands", async (req, res) => {
  const { scenarioId } = req.query

  try {
    let query = "SELECT * FROM command_history WHERE user_id = $1"
    const params = [req.params.userId]

    if (scenarioId) {
      query += " AND scenario_id = $2"
      params.push(scenarioId)
    }

    query += " ORDER BY timestamp DESC LIMIT 50"

    const result = await pool.query(query, params)
    res.set('Cache-Control', 'no-store');
    res.json({ commands: result.rows })
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch command history" })
  }
})

app.get("/api/vnc/info", (req, res) => {
  res.json({
    vnc_url: "http://localhost:6080/vnc.html",
    direct_vnc: "localhost:5901",
    password: "kali123",
    resolution: "1920x1080",
  })
})

// ==================== GRADES API ENDPOINTS ====================

// Get all grades for a specific user
app.get("/api/grades/user/:userId", async (req, res) => {
  const { userId } = req.params;
  const { username } = req.query; // Optional: for display purposes

  try {
    // Get all scenarios the user has started
    const scenariosResult = await pool.query(
      `SELECT DISTINCT scenario_id FROM user_progress WHERE user_id = $1`,
      [userId]
    );

    const userGrades = {
      userId,
      username: username || userId,
      scenarios: [],
      overallAverage: 0,
      totalExercisesCompleted: 0,
      totalExercisesAvailable: 0,
    };

    let totalScores = [];

    // For each scenario, get detailed grades
    for (const row of scenariosResult.rows) {
      const scenarioId = row.scenario_id;
      const scenario = SCENARIOS[scenarioId];

      if (!scenario) continue;

      const scenarioGrades = {
        scenarioId,
        scenarioName: scenario.name,
        exercises: [],
        averageScore: 0,
        completionRate: 0,
      };

      let exerciseScores = [];
      let completedCount = 0;

      // Get grades for each exercise
      for (const exercise of scenario.exercises) {
        const exerciseId = exercise.id;

        // Get challenge completions
        const challengesResult = await pool.query(
          `SELECT COUNT(*) as count FROM challenge_completions 
           WHERE user_id = $1 AND scenario_id = $2`,
          [userId, scenarioId]
        );
        const challengesCompleted = parseInt(challengesResult.rows[0].count);

        // Get mitigation note with score
        const mitigationResult = await pool.query(
          `SELECT note, is_valid, score FROM mitigation_notes 
           WHERE user_id = $1 AND scenario_id = $2 AND exercise_id = $3`,
          [userId, scenarioId, exerciseId]
        );

        let mitigationScore = null;
        if (mitigationResult.rows.length > 0) {
          mitigationScore = mitigationResult.rows[0].score || 0;
        }

        // Get reflection with score
        const reflectionResult = await pool.query(
          `SELECT evidence, prevention, detection, is_complete, score 
           FROM reflections 
           WHERE user_id = $1 AND scenario_id = $2 AND exercise_id = $3`,
          [userId, scenarioId, exerciseId]
        );

        let reflectionScore = null;
        if (reflectionResult.rows.length > 0) {
          reflectionScore = reflectionResult.rows[0].score || 0;
        }

        // Get completion status
        const progressResult = await pool.query(
          `SELECT completed FROM user_progress 
           WHERE user_id = $1 AND scenario_id = $2 AND exercise_id = $3`,
          [userId, scenarioId, exerciseId]
        );

        const completed = progressResult.rows[0]?.completed || false;
        if (completed) completedCount++;

        // Calculate overall score for this exercise
        let overallScore = null;
        if (mitigationScore !== null && reflectionScore !== null) {
          // Weight: Challenges (20%), Mitigation (40%), Reflection (40%)
          const challengeScore = Math.min(
            (challengesCompleted / 3) * 100,
            100
          );
          overallScore =
            challengeScore * 0.2 +
            mitigationScore * 0.4 +
            reflectionScore * 0.4;
          
          exerciseScores.push(overallScore);
          totalScores.push(overallScore);
        }

        scenarioGrades.exercises.push({
          exerciseId,
          exerciseTitle: exercise.title,
          challengesCompleted,
          challengesRequired: 3,
          mitigationScore,
          reflectionScore,
          overallScore: overallScore ? Math.round(overallScore) : null,
          completed,
        });
      }

      // Calculate scenario averages
      if (exerciseScores.length > 0) {
        scenarioGrades.averageScore =
          Math.round(
            exerciseScores.reduce((a, b) => a + b, 0) / exerciseScores.length
          );
      }

      scenarioGrades.completionRate =
        Math.round((completedCount / scenario.exercises.length) * 100);

      userGrades.scenarios.push(scenarioGrades);
      userGrades.totalExercisesCompleted += completedCount;
      userGrades.totalExercisesAvailable += scenario.exercises.length;
    }

    // Calculate overall average
    if (totalScores.length > 0) {
      userGrades.overallAverage =
        Math.round(totalScores.reduce((a, b) => a + b, 0) / totalScores.length);
    }

    res.set('Cache-Control', 'no-store');
    res.json(userGrades);
  } catch (error) {
    console.error("Error fetching user grades:", error);
    res.status(500).json({ error: "Failed to fetch grades" });
  }
});

// Get grades for a specific scenario
app.get("/api/grades/user/:userId/scenario/:scenarioId", async (req, res) => {
  const { userId, scenarioId } = req.params;

  try {
    const scenario = SCENARIOS[scenarioId];

    if (!scenario) {
      return res.status(404).json({ error: "Scenario not found" });
    }

    const scenarioGrades = {
      scenarioId,
      scenarioName: scenario.name,
      exercises: [],
      averageScore: 0,
      completionRate: 0,
    };

    let exerciseScores = [];
    let completedCount = 0;

    // Get grades for each exercise
    for (const exercise of scenario.exercises) {
      const exerciseId = exercise.id;

      // Get challenge completions
      const challengesResult = await pool.query(
        `SELECT COUNT(*) as count FROM challenge_completions 
         WHERE user_id = $1 AND scenario_id = $2`,
        [userId, scenarioId]
      );
      const challengesCompleted = parseInt(challengesResult.rows[0].count);

      // Get mitigation note with score
      const mitigationResult = await pool.query(
        `SELECT note, is_valid, score FROM mitigation_notes 
         WHERE user_id = $1 AND scenario_id = $2 AND exercise_id = $3`,
        [userId, scenarioId, exerciseId]
      );

      let mitigationScore = null;
      if (mitigationResult.rows.length > 0) {
        mitigationScore = mitigationResult.rows[0].score || 0;
      }

      // Get reflection with score
      const reflectionResult = await pool.query(
        `SELECT evidence, prevention, detection, is_complete, score 
         FROM reflections 
         WHERE user_id = $1 AND scenario_id = $2 AND exercise_id = $3`,
        [userId, scenarioId, exerciseId]
      );

      let reflectionScore = null;
      if (reflectionResult.rows.length > 0) {
        reflectionScore = reflectionResult.rows[0].score || 0;
      }

      // Get completion status
      const progressResult = await pool.query(
        `SELECT completed FROM user_progress 
         WHERE user_id = $1 AND scenario_id = $2 AND exercise_id = $3`,
        [userId, scenarioId, exerciseId]
      );

      const completed = progressResult.rows[0]?.completed || false;
      if (completed) completedCount++;

      // Calculate overall score for this exercise
      let overallScore = null;
      if (mitigationScore !== null && reflectionScore !== null) {
        const challengeScore = Math.min((challengesCompleted / 3) * 100, 100);
        overallScore =
          challengeScore * 0.2 + mitigationScore * 0.4 + reflectionScore * 0.4;
        exerciseScores.push(overallScore);
      }

      scenarioGrades.exercises.push({
        exerciseId,
        exerciseTitle: exercise.title,
        challengesCompleted,
        challengesRequired: 3,
        mitigationScore,
        reflectionScore,
        overallScore: overallScore ? Math.round(overallScore) : null,
        completed,
      });
    }

    // Calculate scenario averages
    if (exerciseScores.length > 0) {
      scenarioGrades.averageScore =
        Math.round(
          exerciseScores.reduce((a, b) => a + b, 0) / exerciseScores.length
        );
    }

    scenarioGrades.completionRate =
      Math.round((completedCount / scenario.exercises.length) * 100);

    res.set('Cache-Control', 'no-store');
    res.json(scenarioGrades);
  } catch (error) {
    console.error("Error fetching scenario grades:", error);
    res.status(500).json({ error: "Failed to fetch scenario grades" });
  }
});

// Get overall lab summary for a user
app.get("/api/grades/user/:userId/summary", async (req, res) => {
  const { userId } = req.params;

  try {
    // Get all scenarios started
    const scenariosStartedResult = await pool.query(
      `SELECT DISTINCT scenario_id FROM user_progress WHERE user_id = $1`,
      [userId]
    );

    const scenariosStarted = scenariosStartedResult.rows.length;

    // Get completed exercises count
    const completedResult = await pool.query(
      `SELECT COUNT(*) as count FROM user_progress 
       WHERE user_id = $1 AND completed = true`,
      [userId]
    );

    const exercisesCompleted = parseInt(completedResult.rows[0].count);

    // Get total exercises available (from started scenarios)
    let totalExercises = 0;
    let scenariosCompleted = 0;

    for (const row of scenariosStartedResult.rows) {
      const scenario = SCENARIOS[row.scenario_id];
      if (scenario) {
        totalExercises += scenario.exercises.length;

        // Check if all exercises completed
        const scenarioCompletedResult = await pool.query(
          `SELECT COUNT(*) as count FROM user_progress 
           WHERE user_id = $1 AND scenario_id = $2 AND completed = true`,
          [userId, row.scenario_id]
        );

        const scenarioCompletedCount = parseInt(
          scenarioCompletedResult.rows[0].count
        );
        if (scenarioCompletedCount === scenario.exercises.length) {
          scenariosCompleted++;
        }
      }
    }

    // Get average score
    const scoresResult = await pool.query(
      `SELECT AVG(score) as avg_mitigation FROM mitigation_notes WHERE user_id = $1 AND is_valid = true
       UNION ALL
       SELECT AVG(score) as avg_reflection FROM reflections WHERE user_id = $1 AND is_complete = true`,
      [userId]
    );

    let averageScore = 0;
    if (scoresResult.rows.length > 0) {
      const scores = scoresResult.rows
        .map((r) => parseFloat(r.avg_mitigation || r.avg_reflection))
        .filter((s) => !isNaN(s));

      if (scores.length > 0) {
        averageScore = Math.round(
          scores.reduce((a, b) => a + b, 0) / scores.length
        );
      }
    }

    const summary = {
      totalScenarios: Object.keys(SCENARIOS).length,
      scenariosStarted,
      scenariosCompleted,
      totalExercises,
      exercisesCompleted,
      overallCompletionRate:
        totalExercises > 0
          ? Math.round((exercisesCompleted / totalExercises) * 100)
          : 0,
      averageScore,
    };

    res.set('Cache-Control', 'no-store');
    res.json(summary);
  } catch (error) {
    console.error("Error fetching lab summary:", error);
    res.status(500).json({ error: "Failed to fetch lab summary" });
  }
});

// ADMIN: Get all users' grades
app.get("/api/grades/all", async (req, res) => {
  try {
    // Get all unique users who have progress
    const usersResult = await pool.query(
      `SELECT DISTINCT user_id FROM user_progress`
    );

    const allUsersGrades = [];

    for (const row of usersResult.rows) {
      const userId = row.user_id;

      // Get completed exercises count
      const completedResult = await pool.query(
        `SELECT COUNT(*) as count FROM user_progress 
         WHERE user_id = $1 AND completed = true`,
        [userId]
      );

      const totalCompleted = parseInt(completedResult.rows[0].count);

      // Get average score
      const scoresResult = await pool.query(
        `SELECT AVG(score) as avg FROM (
           SELECT score FROM mitigation_notes WHERE user_id = $1 AND is_valid = true
           UNION ALL
           SELECT score FROM reflections WHERE user_id = $1 AND is_complete = true
         ) as scores`,
        [userId]
      );

      const overallAverage = scoresResult.rows[0]?.avg
        ? Math.round(parseFloat(scoresResult.rows[0].avg))
        : 0;

      // Get last activity
      const lastActivityResult = await pool.query(
        `SELECT MAX(completed_at) as last_activity FROM user_progress WHERE user_id = $1`,
        [userId]
      );

      allUsersGrades.push({
        userId,
        username: userId, // You might want to join with a users table if you have one
        overallAverage,
        totalCompleted,
        lastActivity: lastActivityResult.rows[0]?.last_activity || null,
      });
    }

    res.set('Cache-Control', 'no-store');
    res.json({ users: allUsersGrades });
  } catch (error) {
    console.error("Error fetching all users grades:", error);
    res.status(500).json({ error: "Failed to fetch all users grades" });
  }
});

// New RAG Stuff
app.get("/api/knowledge/:category", async (req, res) => {
  try {
    const { category } = req.params;
    const { query } = req.query;

    res.set('Cache-Control', 'no-store');
    if (query) {
      // Search for specific query
      const results = ragManager.search(query, 5);
      res.json({ results });
    } else if (category === 'all') {
      // Get all documents
      const allDocs = Array.from(ragManager.knowledgeBase.values());
      res.json({ documents: allDocs });
    } else {
      // Get by category
      const docs = Array.from(ragManager.knowledgeBase.values())
        .filter(doc => doc.category === category);
      res.json({ documents: docs });
    }
  } catch (error) {
    res.status(500).json({ error: "Failed to query knowledge base" });
  }
});

app.get("/api/knowledge/tool/:toolName", async (req, res) => {
  try {
    const toolDoc = ragManager.getToolDocs(req.params.toolName);
    if (toolDoc) {
      res.json({ tool: toolDoc });
    } else {
      res.status(404).json({ error: "Tool documentation not found" });
    }
  } catch (error) {
    res.status(500).json({ error: "Failed to get tool documentation" });
  }
});

// WebSocket for real-time interaction
wss.on("connection", ws => {
  const sessionId = Math.random().toString(36).substring(7)
  sessions.set(sessionId, ws)

  ws.on("message", async message => {
    try {
      const data = JSON.parse(message)

      if (data.type === "execute") {
        const result = await executeCommand(data.command, sessionId)
        ws.send(JSON.stringify({ type: "result", ...result }))
      } else if (data.type === "ai_chat") {
        const scenario = SCENARIOS[data.scenarioId]
        const exercise = scenario?.exercises.find(e => e.id === data.exerciseId)

        if (scenario && exercise) {
          const guidance = await getAIGuidance(
            scenario,
            exercise,
            data.message,
            data.history || [],
          )
          ws.send(JSON.stringify({ type: "ai_response", guidance }))
        }
      } else if (data.type === "launch_scenario") {
        const result = await launchScenarioInKali(data.scenarioId)
        ws.send(JSON.stringify({ type: "launch_result", ...result }))
      } else if (data.type === "test_connectivity") {
        const result = await testContainerConnectivity(data.scenarioId)
        ws.send(JSON.stringify({ type: "connectivity_result", ...result }))
      }
    } catch (error) {
      ws.send(JSON.stringify({ type: "error", error: error.message }))
    }
  })

  ws.on("close", () => {
    sessions.delete(sessionId)
  })

  ws.send(JSON.stringify({ type: "connected", sessionId }))
})

const server = app.listen(PORT, () => {
  console.log(
    `🚀 Cyber Education Bridge Server with Professor Cedrik running on port ${PORT}`,
  )
  console.log(`📡 REST API: http://localhost:${PORT}/api`)
  console.log(`🔌 WebSocket: ws://localhost:${PORT}`)
  console.log(`👨‍🏫 AI Instructor: Professor Cedrik (powered by Groq)`)
})

server.on("upgrade", (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, ws => {
    wss.emit("connection", ws, request)
  })
})

// Get completed challenges for a user in a scenario
app.get("/api/challenges/completed/:scenarioId", async (req, res) => {
  const { scenarioId } = req.params;
  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({ error: "userId is required" });
  }

  try {
    const result = await pool.query(
      `SELECT challenge_id, evidence, completed_at 
       FROM challenge_completions 
       WHERE user_id = $1 AND scenario_id = $2
       ORDER BY completed_at ASC`,
      [userId, scenarioId]
    );

    res.set('Cache-Control', 'no-store');
    res.json({
      success: true,
      challenges: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error("Error fetching completed challenges:", error);
    res.status(500).json({ 
      error: "Failed to fetch completed challenges",
      details: error.message
    });
  }
});

// Save challenge completion with evidence
app.post("/api/challenges/complete", async (req, res) => {
  let { userId, scenarioId, challengeId, evidence } = req.body;
  const uid_res = await get_uid_from_session(userId);
  if (uid_res.error) {
      return res.status(uid_res.status).json({ error: uid_res.error });
  }
  userId = uid_res.uid;
  if (!userId || !scenarioId || !challengeId) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    // Store challenge completion
    await pool.query(
      `INSERT INTO challenge_completions (user_id, scenario_id, challenge_id, evidence, completed_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id, scenario_id, challenge_id) DO UPDATE SET
       evidence = $4::jsonb, completed_at = CURRENT_TIMESTAMP`,
      [userId, scenarioId, challengeId, JSON.stringify(evidence)]
    );

    // Get total completions for this exercise
    const result = await pool.query(
      `SELECT COUNT(*) as count FROM challenge_completions 
       WHERE user_id = $1 AND scenario_id = $2`,
      [userId, scenarioId]
    );

    const completionCount = parseInt(result.rows[0].count);
    const validation = ExerciseValidators.validateChallengeCount(
      Array(completionCount).fill(null)
    );

    res.json({
      success: true,
      completionCount,
      validation,
      canProceed: validation.valid
    });
  } catch (error) {
    console.error("Error saving challenge:", error);
    res.status(500).json({ error: "Failed to save challenge completion" });
  }
});

// Submit mitigation note for validation
app.post("/api/mitigation/submit", async (req, res) => {
  let { userId, scenarioId, exerciseId, note } = req.body;
  const uid_res = await get_uid_from_session(userId);
  if (uid_res.error) {
      return res.status(uid_res.status).json({ error: uid_res.error });
  }
  userId = uid_res.uid;

  if (!userId || !scenarioId || !exerciseId || !note) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const scenario = SCENARIOS[scenarioId];
  const exercise = scenario?.exercises.find(e => e.id === exerciseId);

  if (!scenario || !exercise) {
    return res.status(404).json({ error: "Scenario or exercise not found" });
  }

  // Use AI validation
  const validation = await validateWithAI(note, 'mitigation', scenario, exercise);

  try {
    await pool.query(
      `INSERT INTO mitigation_notes (user_id, scenario_id, exercise_id, note, is_valid, validated_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id, scenario_id, exercise_id) DO UPDATE SET
       note = $4, is_valid = $5, validated_at = CURRENT_TIMESTAMP`,
      [userId, scenarioId, exerciseId, note, validation.valid]
    );

    res.json({
      success: true,
      validation: {
        valid: validation.valid,
        score: validation.score,
        message: validation.feedback,
        suggestions: validation.suggestions
      },
      canProceed: validation.valid
    });
  } catch (error) {
    console.error("Error saving mitigation note:", error);
    res.status(500).json({ error: "Failed to save mitigation note" });
  }
});


// Submit three bullets reflection
app.post("/api/reflection/submit", async (req, res) => {
  let { userId, scenarioId, exerciseId, reflection } = req.body;
  const uid_res = await get_uid_from_session(userId);
  if (uid_res.error) {
      return res.status(uid_res.status).json({ error: uid_res.error });
  }
  userId = uid_res.uid;

  if (!userId || !scenarioId || !exerciseId || !reflection) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const scenario = SCENARIOS[scenarioId];
  const exercise = scenario?.exercises.find(e => e.id === exerciseId);

  if (!scenario || !exercise) {
    return res.status(404).json({ error: "Scenario or exercise not found" });
  }

  // Extract the three components
  const content = {
    evidence: reflection.bullets.find(b => b.type === 'evidence')?.content || '',
    prevention: reflection.bullets.find(b => b.type === 'prevention')?.content || '',
    detection: reflection.bullets.find(b => b.type === 'detection')?.content || ''
  };

  // Use AI validation
  const validation = await validateWithAI(content, 'reflection', scenario, exercise);

  try {
    await pool.query(
      `INSERT INTO reflections (user_id, scenario_id, exercise_id, evidence, prevention, detection, is_complete, submitted_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id, scenario_id, exercise_id) DO UPDATE SET
       evidence = $4, prevention = $5, detection = $6, is_complete = $7, submitted_at = CURRENT_TIMESTAMP`,
      [
        userId,
        scenarioId,
        exerciseId,
        content.evidence,
        content.prevention,
        content.detection,
        validation.valid
      ]
    );

    res.json({
      success: true,
      validation: {
        valid: validation.valid,
        score: validation.score,
        message: validation.feedback,
        componentFeedback: validation.component_feedback,
        evidenceValid: validation.evidence_valid,
        preventionValid: validation.prevention_valid,
        detectionValid: validation.detection_valid
      },
      canProceedToNext: validation.valid
    });
  } catch (error) {
    console.error("Error saving reflection:", error);
    res.status(500).json({ error: "Failed to save reflection" });
  }
});

// Get exercise validation status
app.get("/api/exercise/:scenarioId/:exerciseId/status", async (req, res) => {
  const { scenarioId, exerciseId } = req.params;
  let { userId } = req.query;
  const uid_res = await get_uid_from_session(userId);
  if (uid_res.error) {
      return res.status(uid_res.status).json({ error: uid_res.error });
  }
  userId = uid_res.uid;

  if (!userId) {
    return res.status(400).json({ error: "userId is required" });
  }

  try {
    // Get challenge completions
    const challengesResult = await pool.query(
      `SELECT COUNT(*) as count FROM challenge_completions 
       WHERE user_id = $1 AND scenario_id = $2`,
      [userId, scenarioId]
    );

    // Get mitigation note
    const mitigationResult = await pool.query(
      `SELECT note, is_valid FROM mitigation_notes 
       WHERE user_id = $1 AND scenario_id = $2 AND exercise_id = $3`,
      [userId, scenarioId, exerciseId]
    );

    // Get reflection
    const reflectionResult = await pool.query(
      `SELECT evidence, prevention, detection, is_complete FROM reflections 
       WHERE user_id = $1 AND scenario_id = $2 AND exercise_id = $3`,
      [userId, scenarioId, exerciseId]
    );

    const challengeCount = parseInt(challengesResult.rows[0].count);
    const hasMitigation = mitigationResult.rows.length > 0 && mitigationResult.rows[0].is_valid;
    const hasReflection = reflectionResult.rows.length > 0 && reflectionResult.rows[0].is_complete;

    const status = {
      challenges: {
        completed: challengeCount,
        required: EXERCISE_REQUIREMENTS.MIN_CHALLENGES,
        valid: challengeCount >= EXERCISE_REQUIREMENTS.MIN_CHALLENGES
      },
      mitigation: {
        submitted: mitigationResult.rows.length > 0,
        valid: hasMitigation,
        note: mitigationResult.rows[0]?.note || null
      },
      reflection: {
        submitted: reflectionResult.rows.length > 0,
        valid: hasReflection,
        bullets: reflectionResult.rows[0] ? {
          evidence: reflectionResult.rows[0].evidence,
          prevention: reflectionResult.rows[0].prevention,
          detection: reflectionResult.rows[0].detection
        } : null
      },
      canComplete: challengeCount >= EXERCISE_REQUIREMENTS.MIN_CHALLENGES && hasMitigation && hasReflection
    };

    res.set('Cache-Control', 'no-store');
    res.json(status);
  } catch (error) {
    console.error("Error getting exercise status:", error);
    res.status(500).json({ error: "Failed to get exercise status" });
  }
});

// Enhanced coach API with ladder-based guidance
app.post("/api/coach/ladder", async (req, res) => {
  let { userId, scenarioId, exerciseId, message, currentStep } = req.body;
  const uid_res = await get_uid_from_session(userId);
  if (uid_res.error) {
      return res.status(uid_res.status).json({ error: uid_res.error });
  }
  userId = uid_res.uid;

  // Check rate limit
  const rateLimit = Guardrails.checkRateLimit(userId);
  if (!rateLimit.allowed) {
    return res.status(429).json({
      error: "Rate limit exceeded",
      resetIn: rateLimit.resetIn,
      message: `Please wait ${rateLimit.resetIn} seconds before asking again`
    });
  }

  const scenario = SCENARIOS[scenarioId];
  const exercise = scenario?.exercises.find(e => e.id === exerciseId);

  if (!scenario || !exercise) {
    return res.status(404).json({ error: "Scenario or exercise not found" });
  }

  try {
    // Get user's progress to determine ladder level
    const progressResult = await pool.query(
      `SELECT attempts, hints_used FROM user_progress 
       WHERE user_id = $1 AND scenario_id = $2 AND exercise_id = $3`,
      [userId, scenarioId, exerciseId]
    );

    const attempts = progressResult.rows[0]?.attempts || 0;
    const hintsUsed = progressResult.rows[0]?.hints_used || 0;

    // Determine guidance level (ladder)
    let guidanceLevel = 'conceptual'; // Start with high-level
    if (attempts > 3) guidanceLevel = 'tactical';
    if (attempts > 6 || hintsUsed > 2) guidanceLevel = 'specific';

    // Search RAG for relevant knowledge
    const ragContext = ragManager.enhancedSearch(message, scenario, exercise);

    // Build ladder-based system prompt
    const ladderPrompts = {
      conceptual: "Focus on WHY this vulnerability exists and general principles. Ask guiding questions. Don't give specific commands.",
      tactical: "Provide approach-level guidance and tool suggestions. Explain the technique but let them figure out exact syntax.",
      specific: "Give concrete examples and specific commands. Show exact payloads they can try."
    };

    const systemPrompt = `You are Professor Cedrik. Current guidance level: ${guidanceLevel.toUpperCase()}.
    IMPORTANT: You are talking to YOUR STUDENT. They are learning cybersecurity from you. When they ask "who am I?" or "what's my name?", respond that they are your cybersecurity student or trainee. YOU are Professor Cedrik - THEY are the student.

${ladderPrompts[guidanceLevel]}

Scenario: ${scenario.name}
Exercise: ${exercise.title}

${ragContext.scenario_context ? `Context:\n${ragContext.scenario_context.content}\n` : ''}

User has made ${attempts} attempts and used ${hintsUsed} hints. Adjust your guidance accordingly.`;

    // Get AI response
    const guidance = await getAIGuidance(scenario, exercise, message, [
      { role: "system", content: systemPrompt }
    ]);

    // Update attempts
    await pool.query(
      `INSERT INTO user_progress (user_id, scenario_id, exercise_id, attempts, hints_used)
       VALUES ($1, $2, $3, 1, $4)
       ON CONFLICT (user_id, scenario_id, exercise_id) DO UPDATE SET
       attempts = user_progress.attempts + 1, hints_used = user_progress.hints_used + $4`,
      [userId, scenarioId, exerciseId, guidanceLevel === 'specific' ? 1 : 0]
    );

    res.json({
      guidance,
      guidanceLevel,
      remainingRequests: rateLimit.remaining,
      rag_sources: ragContext.relevant_docs.map(d => d.title)
    });
  } catch (error) {
    console.error("Coach error:", error);
    res.status(500).json({ error: "Failed to get guidance" });
  }
});

// Validate command before execution (guardrails)
app.post("/api/validate/command", async (req, res) => {
  const { command } = req.body;

  if (!command) {
    return res.status(400).json({ error: "Command is required" });
  }

  const isSafe = Guardrails.isReadOnlySafe(command);

  res.json({
    valid: isSafe,
    command,
    message: isSafe 
      ? "✅ Command passed safety validation"
      : "⚠️ This command may be destructive and has been blocked for safety"
  });
});

//graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🛑 SIGTERM received, shutting down gracefully...');
  
  // Stop accepting new requests
  server.close();
  
  // Clean up pool containers
  await kaliManager.cleanupOldPoolContainers();
  
  // Close database
  await pool.end();
  
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🛑 SIGINT received, shutting down gracefully...');
  server.close();
  await kaliManager.cleanupOldPoolContainers();
  await pool.end();
  process.exit(0);
});
