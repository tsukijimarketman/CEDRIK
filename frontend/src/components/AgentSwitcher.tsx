import { useAgent } from "@/contexts/AgentContext";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function AgentSwitcher() {
  const { currentAgent, setCurrentAgent } = useAgent();

  const agents = {
    professor: {
      name: "Professor Cedrik",
      icon: "👨‍🏫",
      description: "Teaching & Guidance",
      color: "text-blue-600 dark:text-blue-400",
    },
    hacker: {
      name: "H4ck3r Man Pancho",
      icon: "🎯",
      description: "Technical Execution",
      color: "text-orange-600 dark:text-orange-400",
    },
  };

  const current = agents[currentAgent];
  const other = currentAgent === 'professor' ? agents.hacker : agents.professor;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentAgent(currentAgent === 'professor' ? 'hacker' : 'professor')}
            className="flex items-center gap-2 rounded-full px-3 py-1 h-9 border-border/50 hover:bg-accent/30 transition-colors"
          >
            <span className="text-lg">{current.icon}</span>
            <div className="hidden sm:flex flex-col items-start">
              <span className={`text-xs font-semibold leading-none ${current.color}`}>
                {current.name}
              </span>
              <span className="text-[10px] text-muted-foreground leading-none mt-0.5">
                {current.description}
              </span>
            </div>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-4 h-4 text-muted-foreground"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"
              />
            </svg>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="space-y-2">
            <div className="font-semibold">Switch to {other.name}</div>
            <div className="text-xs text-muted-foreground">
              {other.description}
            </div>
            <div className="text-xs text-muted-foreground mt-2 pt-2 border-t">
              <strong>Professor:</strong> Explains WHY vulnerabilities exist, teaching approach<br/>
              <strong>Hacker:</strong> Shows HOW to exploit, exact commands & payloads
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}