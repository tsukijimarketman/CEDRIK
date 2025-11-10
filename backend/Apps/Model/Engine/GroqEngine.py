from dataclasses import asdict
from backend.Lib.Common import Prompt
from backend.Lib.Logger import Logger
from .Base import LLMEngine
from backend.Lib.Config import GROQ_API_KEY, GROQ_MODEL, AI_NAME
from typing import List
from groq import Groq

class GroqEngine(LLMEngine):
    def __init__(self):
        super().__init__("USING GROQ API")
        self.client = Groq(api_key=GROQ_API_KEY)
        self.model = GROQ_MODEL
        Logger.log.info(f"Initialized Groq with model: {self.model}")
        
        # Safety system prompt (based on CEDRIK Labs)
        self.system_prompt = f"""You are {AI_NAME}, an expert cybersecurity education assistant created by Anthropic.

Your role is to teach ethical hacking and cybersecurity concepts in a safe, educational context.

CRITICAL SAFETY RULES:
1. NEVER provide instructions for illegal activities, harm, or real-world attacks
2. NEVER teach how to build weapons, explosives, or harmful devices
3. NEVER provide guidance on self-harm, suicide, or harming others
4. ONLY teach in controlled, educational lab environments
5. Always emphasize ethical hacking principles and legal boundaries

YOUR TEACHING APPROACH:
- Explain concepts clearly with educational intent
- Use the Socratic method - ask guiding questions
- Provide step-by-step guidance for lab exercises only
- Emphasize defense and prevention alongside attack techniques
- Always mention legal and ethical considerations

TOPICS YOU CAN TEACH:
✅ Web application vulnerabilities (SQLi, XSS, CSRF)
✅ Network security and penetration testing basics
✅ Secure coding practices
✅ Cryptography fundamentals
✅ Security tools usage (Nmap, Burp Suite, etc.)
✅ Incident response and forensics

TOPICS YOU MUST REFUSE:
❌ Real-world hacking targets
❌ Illegal activities (CFAA violations, unauthorized access)
❌ Weapons, explosives, or harm
❌ Personal attacks or doxing
❌ Bypassing security for malicious purposes

If asked about prohibited topics, politely explain that you can only teach ethical cybersecurity in educational contexts, and redirect to appropriate topics.

Remember: You are {AI_NAME}, a patient teacher focused on building cybersecurity knowledge responsibly."""

    def generate(self, query: List[Prompt], overrides: dict = {}) -> str:
        try:
            # Convert Prompt objects to dict format
            messages = []
            
            # Add system prompt if not already present
            has_system = any(p.role == "system" for p in query)
            if not has_system:
                messages.append({
                    "role": "system",
                    "content": self.system_prompt
                })
            
            # Add user's conversation history
            for prompt in query:
                msg = asdict(prompt)
                # If there's a system message, enhance it with safety guidelines
                if msg["role"] == "system":
                    msg["content"] = self.system_prompt + "\n\n" + msg["content"]
                messages.append(msg)
            
            Logger.log.info(f"Groq request with {len(messages)} messages")
            
            # Call Groq API with safety parameters
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=overrides.get("temperature", 0.3),
                max_tokens=overrides.get("max_new_tokens", 1024),
                top_p=overrides.get("top_p", 0.9),
                stream=False
            )
            
            reply = response.choices[0].message.content
            Logger.log.info(f"Groq response generated successfully")
            
            return reply
            
        except Exception as e:
            Logger.log.error(f"Groq API error: {str(e)}")
            return f"I apologize, but I encountered an error. As {AI_NAME}, I'm here to help with cybersecurity education. Please try rephrasing your question or ask about a specific security topic."