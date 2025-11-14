import { createContext, useContext, useState, ReactNode } from 'react';

type Agent = 'professor' | 'hacker';

interface AgentContextType {
  currentAgent: Agent;
  setCurrentAgent: (agent: Agent) => void;
}

const AgentContext = createContext<AgentContextType | undefined>(undefined);

export function AgentProvider({ children }: { children: ReactNode }) {
  const [currentAgent, setCurrentAgent] = useState<Agent>('professor');

  return (
    <AgentContext.Provider value={{ currentAgent, setCurrentAgent }}>
      {children}
    </AgentContext.Provider>
  );
}

export function useAgent() {
  const context = useContext(AgentContext);
  if (context === undefined) {
    throw new Error('useAgent must be used within an AgentProvider');
  }
  return context;
}