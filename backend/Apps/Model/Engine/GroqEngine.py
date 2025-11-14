from dataclasses import asdict
from backend.Lib.Common import Prompt
from backend.Lib.Logger import Logger
from .Base import LLMEngine
from backend.Lib.Config import GROQ_API_KEY, GROQ_MODEL, AI_NAME
from typing import List
from groq import Groq
import traceback

class GroqEngine(LLMEngine):
    def __init__(self):
        super().__init__("USING GROQ API")
        self.client = Groq(api_key=GROQ_API_KEY)
        self.model = GROQ_MODEL
        Logger.log.info(f"Initialized Groq with model: {self.model}")
        
        # Agent personalities
        self.agents = {
            'professor': {
                'name': 'Professor Cedrik',
                'emoji': '👨‍🏫',
                'temperature': 0.4,
                'system_prompt': """You are Professor Cedrik, a patient and thorough cybersecurity educator.

IDENTITY: You are Professor Cedrik. Always introduce yourself as "Professor Cedrik" when asked who you are.

YOUR TEACHING PHILOSOPHY:
- Explain the WHY before the HOW
- Use analogies and real-world examples
- Break down complex concepts into digestible pieces
- Ask Socratic questions to guide learning
- Emphasize understanding over memorization

RESPONSE STRUCTURE:
1. **Concept Overview** - What is this vulnerability/technique?
2. **Why It Matters** - Real-world impact and implications
3. **Learning Path** - Progressive hints, not direct solutions
4. **Ethical Context** - Legal and ethical considerations

EXAMPLE RESPONSE STYLE:
"Great question! Let's break down SQL injection conceptually. Think of it like this: imagine you're writing a letter, but someone sneaks in extra instructions that change the meaning entirely..."

SAFETY GUIDELINES:
- Only provide educational content for authorized, ethical purposes
- Emphasize responsible disclosure and legal frameworks
- Remind users to only test on systems they own or have permission to test"""
            },
            'hacker': {
                'name': 'H4ck3r Man Pancho',
                'emoji': '🎯',
                'temperature': 0.6,
                'system_prompt': r"""You are H4ck3r Man Pancho, a pragmatic and direct penetration tester who gets straight to the point.

IDENTITY: You are H4ck3r Man Pancho (or just "Pancho"). Always introduce yourself as "H4ck3r Man Pancho" or "Pancho" when asked who you are. Never say you are "Cedrik" or "Professor Cedrik".

YOUR EXECUTION STYLE:
- Skip the theory - give exact commands
- Show specific payloads and syntax
- Explain what output to expect
- Point out what to look for in responses
- Use code blocks extensively

RESPONSE STRUCTURE:
1. **Direct Command** - The exact syntax to run
2. **Expected Output** - What you should see
3. **What It Means** - Quick interpretation
4. **Next Step** - What to do next

EXAMPLE RESPONSE STYLE:
"Alright, here's exactly what you need to run:

```bash
sqlmap -u "http://target.com?id=1" --dbs --batch
```

This dumps all database names. Look for lines like:
[*] information_schema
[*] mysql  
[*] webapp

The 'webapp' one is probably what we want. Then run..."

SAFETY GUIDELINES:
- Only provide commands for authorized penetration testing
- Remind users to have explicit permission before testing
- Emphasize legal and ethical boundaries"""
            }
        }
    
    def generate(self, query: List[Prompt], overrides: dict = {}) -> str:
        try:
            # Get agent preference (default to professor)
            agent_type = overrides.get("agent", "professor")
            
            # ✅ Add debug logging
            Logger.log.info(f"🤖 Using agent: {agent_type}")
            
            agent = self.agents.get(agent_type, self.agents['professor'])
            
            # ✅ Log which agent config we're using
            Logger.log.info(f"🤖 Agent config: {agent['name']} with temp {agent['temperature']}")
            
            messages = []
            
            # Add agent-specific system prompt
            has_system = any(p.role == "system" for p in query)
            if not has_system:
                messages.append({
                    "role": "system",
                    "content": agent['system_prompt']
                })
            else:
                # ✅ Replace the existing system prompt with agent-specific one
                for prompt in query:
                    msg = asdict(prompt)
                    if msg["role"] == "system":
                        msg["content"] = agent['system_prompt']
                    messages.append(msg)
                # Don't process query again below
                query = []
            
            # Add remaining conversation messages
            for prompt in query:
                messages.append(asdict(prompt))
            
            Logger.log.info(f"📝 Sending {len(messages)} messages to Groq")
            Logger.log.info(f"📝 System prompt preview: {messages[0]['content'][:200]}...")
            
            # Call Groq with agent-specific temperature
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=agent['temperature'],  # ✅ Use agent-specific temp
                max_tokens=overrides.get("max_new_tokens", 1500),
                top_p=overrides.get("top_p", 0.9),
                stream=False
            )
            
            reply = response.choices[0].message.content
            Logger.log.info(f"✅ {agent['name']} response generated ({len(reply)} chars)")
            
            return reply
            
        except Exception as e:
            Logger.log.error(f"Groq API error: {str(e)}")
            import traceback
            Logger.log.error(traceback.format_exc())
            return f"I apologize, but I encountered an error. Please try again."