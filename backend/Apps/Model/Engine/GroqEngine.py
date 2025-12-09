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

IDENTITY: 
- You are Professor Cedrik
- ONLY mention your name when directly asked "who are you" or "what's your name"
- Do NOT start messages with your name or introduce yourself repeatedly
- Respond naturally without prefacing responses with "I'm Professor Cedrik..."

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

IDENTITY:
- You are H4ck3r Man Pancho (also known as "Pancho")
- ONLY mention your name when directly asked "who are you" or "what's your name"
- Do NOT start messages with "I am H4ck3r Man Pancho..." or introduce yourself repeatedly
- Jump straight into helping without announcing who you are

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

    def generate_stream(self, query: List[Prompt], overrides: dict = {}):
        '''Streaming version that yields chunks as they arrive from Groq'''
        try:
            agent_type = overrides.get("agent", "professor")
            agent = self.agents.get(agent_type, self.agents['professor'])
            
            Logger.log.info(f"🤖 Using agent: {agent_type} (streaming)")
            
            messages = []
            knowledge_base_context = None
            non_system_messages = []
            
            for prompt in query:
                if prompt.role == "system":
                    knowledge_base_context = prompt.content
                else:
                    non_system_messages.append(prompt)
            
            combined_system_prompt = agent['system_prompt']
            
            if knowledge_base_context:
                combined_system_prompt += f"\n\n{knowledge_base_context}"
                Logger.log.info(f"📚 Knowledge base context appended")
            
            messages.append({
                "role": "system",
                "content": combined_system_prompt
            })
            
            for prompt in non_system_messages:
                messages.append(asdict(prompt))
            
            Logger.log.info(f"📨 Streaming {len(messages)} messages to Groq")
            
            # ✅ Enable streaming in Groq API
            stream = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=agent['temperature'],
                max_tokens=overrides.get("max_new_tokens", 1500),
                top_p=overrides.get("top_p", 0.9),
                stream=True  # ✅ This enables streaming
            )
            
            # Yield chunks as they arrive
            for chunk in stream:
                if chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content
            
            Logger.log.info(f"✅ {agent['name']} streaming complete")
            
        except Exception as e:
            Logger.log.error(f"Groq streaming error: {str(e)}")
            Logger.log.error(traceback.format_exc())
            yield "I apologize, but I encountered an error. Please try again."
    
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
            
            # ✅ FIXED: Combine agent personality with knowledge base context
            # Check if there's already a system message (knowledge base context)
            knowledge_base_context = None
            non_system_messages = []
            
            for prompt in query:
                if prompt.role == "system":
                    knowledge_base_context = prompt.content
                else:
                    non_system_messages.append(prompt)
            
            # Build the combined system message
            combined_system_prompt = agent['system_prompt']
            
            # If there's knowledge base context, append it to the agent personality
            if knowledge_base_context:
                combined_system_prompt += f"\n\n{knowledge_base_context}"
                Logger.log.info(f"📚 Knowledge base context found and appended ({len(knowledge_base_context)} chars)")
            
            # Add the combined system message first
            messages.append({
                "role": "system",
                "content": combined_system_prompt
            })
            
            # Add all other messages (conversation history + current prompt)
            for prompt in non_system_messages:
                messages.append(asdict(prompt))
            
            Logger.log.info(f"📨 Sending {len(messages)} messages to Groq")
            Logger.log.info(f"📨 System prompt preview: {combined_system_prompt[:300]}...")
            
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