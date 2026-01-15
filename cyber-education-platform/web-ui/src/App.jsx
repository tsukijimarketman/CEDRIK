import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Trophy, Target, Clock, BookOpen, Brain, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const VNC_BASE_URL = import.meta.env.VITE_VNC_URL || 'http://localhost:6080';
const API_URL = `${API_BASE_URL}/api`;

// Get session ID from URL
const sparam = new URLSearchParams(window.location.search);
const session_id = sparam.get("sid") || "guest-user";
const userId = session_id;

const App = () => {
  const [scenarios, setScenarios] = useState([]);
  const [currentScenario, setCurrentScenario] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState('scenarios');
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [currentExerciseId, setCurrentExerciseId] = useState(1);
  const [exercises, setExercises] = useState([]);
  const [completedExercises, setCompletedExercises] = useState(new Set());
  const [vncUrl, setVncUrl] = useState('');
  const [containerInfo, setContainerInfo] = useState(null);

  // Heartbeat for container
  useEffect(() => {
    if (activeView === 'lab' && currentScenario) {
      const heartbeat = setInterval(async () => {
        try {
          await fetch(`${API_URL}/container/heartbeat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId })
          });
        } catch (error) {
          console.warn('Heartbeat failed:', error);
        }
      }, 60000); // Every minute

      return () => clearInterval(heartbeat);
    }
  }, [activeView, currentScenario]);

  useEffect(() => {
    loadScenarios();
  }, []);

  const loadScenarios = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/scenarios`);
      const data = await response.json();
      
      const scenarioIcons = {
        'web-dvwa': '🌐',
        'sqli-labs': '🗄️',
        'wordpress': '📝',
        'metasploitable': '🔌',
        'webgoat': '🐐',
        'juiceshop': '🧃'
      };
      
      const scenariosWithIcons = data.scenarios.map(s => ({
        ...s,
        icon: scenarioIcons[s.id] || '🎯'
      }));
      
      setScenarios(scenariosWithIcons);
    } catch (error) {
      console.error('Failed to load scenarios:', error);
      alert('Failed to load scenarios. Is the server running?');
    } finally {
      setLoading(false);
    }
  };

  const startScenario = async (scenario) => {
    try {
      // Fetch full scenario details
      const detailResponse = await fetch(`${API_URL}/scenarios/${scenario.id}`);
      const fullScenario = await detailResponse.json();

      // Start the scenario
      const response = await fetch(`${API_URL}/scenarios/${scenario.id}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Set VNC URL with container info
        const vncPort = data.container?.novncPort || 6080;
        const vncHost = VNC_BASE_URL.replace(/:\d+$/, ''); // Remove port if exists
        const finalVncUrl = `${vncHost}:${vncPort}/vnc.html?autoconnect=1&resize=scale&quality=9&compression=2&password=kali123`;
        
        setVncUrl(finalVncUrl);
        setContainerInfo(data.container);
        setCurrentScenario(fullScenario);
        setExercises(fullScenario.exercises || []);
        setActiveView('lab');
        setCurrentExerciseId(fullScenario.exercises?.[0]?.id || 1);
        setCompletedExercises(new Set());
        
        // Welcome message
        setMessages([{
          role: 'system',
          content: `Welcome to **${fullScenario.name}**!\n\nThe scenario has been automatically opened in Kali Firefox.\n\n**First Exercise:** ${fullScenario.exercises?.[0]?.title}\n\n${fullScenario.exercises?.[0]?.description}`,
          timestamp: new Date()
        }]);
      } else {
        alert(data.error || 'Failed to start scenario');
      }
    } catch (error) {
      console.error('Error starting scenario:', error);
      alert('Failed to start scenario. Check if containers are running.');
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || !currentScenario) return;

    const userMsg = {
      role: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    const messageToSend = inputMessage;
    setInputMessage('');
    setIsTyping(true);

    try {
      const response = await fetch(`${API_URL}/ai/guidance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenarioId: currentScenario.id,
          exerciseId: currentExerciseId,
          message: messageToSend,
          userId: userId,
          conversationHistory: messages.slice(-10).map(m => ({
            role: m.role === 'user' ? 'user' : 'assistant',
            content: m.content
          }))
        }),
      });

      const data = await response.json();
      
      if (data.guidance && data.guidance.agents) {
        const newMessages = data.guidance.agents.map(agentResp => ({
          role: agentResp.agent.name.includes('Professor') ? 'professor' : 'hacker',
          agent: agentResp.agent.name,
          specialty: agentResp.agent.specialty,
          content: agentResp.response,
          timestamp: new Date()
        }));
        
        setMessages(prev => [...prev, ...newMessages]);
      }
    } catch (error) {
      console.error('AI Error:', error);
      setMessages(prev => [...prev, {
        role: 'system',
        content: 'Sorry, I had trouble connecting to the AI team. Please try again.',
        timestamp: new Date()
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const selectExercise = (exerciseId) => {
    setCurrentExerciseId(exerciseId);
    const exercise = exercises.find(e => e.id === exerciseId);
    
    if (exercise) {
      setMessages(prev => [...prev, {
        role: 'system',
        content: `Switched to exercise: **${exercise.title}**\n\n${exercise.description}\n\n**Objectives:**\n${exercise.objectives?.map((obj, i) => `${i + 1}. ${obj}`).join('\n') || 'Complete this exercise'}`,
        timestamp: new Date()
      }]);
    }
  };

  const markExerciseComplete = async (exerciseId) => {
    try {
      // Check validation status first
      const statusResponse = await fetch(
        `${API_URL}/exercise/${currentScenario.id}/${exerciseId}/status?userId=${userId}`
      );
      const status = await statusResponse.json();

      if (!status.canComplete) {
        alert(
          'Please complete all validation requirements:\n' +
          `- Complete ${status.challenges.required} challenges (${status.challenges.completed} done)\n` +
          '- Submit validated mitigation note\n' +
          '- Submit 3-bullet reflection'
        );
        return;
      }

      const response = await fetch(`${API_URL}/progress/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          scenarioId: currentScenario.id,
          exerciseId,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setCompletedExercises(prev => new Set([...prev, exerciseId]));
        
        setMessages(prev => [...prev, {
          role: 'system',
          content: `✅ Exercise completed! Great work!`,
          timestamp: new Date()
        }]);

        // Move to next exercise if available
        const currentIndex = exercises.findIndex(e => e.id === exerciseId);
        if (currentIndex < exercises.length - 1) {
          const nextExercise = exercises[currentIndex + 1];
          selectExercise(nextExercise.id);
        }
      }
    } catch (error) {
      console.error('Error marking complete:', error);
      alert('Error updating progress.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-green-900">
      {/* Matrix background */}
      <div className="fixed inset-0 opacity-5 pointer-events-none">
        <div className="absolute inset-0" style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(34, 197, 94, 0.3) 2px, rgba(34, 197, 94, 0.3) 4px)',
          animation: 'scroll 20s linear infinite'
        }} />
      </div>

      {activeView === 'scenarios' ? (
        <ScenariosView 
          scenarios={scenarios}
          loading={loading}
          onStart={startScenario}
          completedCount={completedExercises.size}
        />
      ) : (
        <LabEnvironment
          scenario={currentScenario}
          exercises={exercises}
          currentExerciseId={currentExerciseId}
          messages={messages}
          inputMessage={inputMessage}
          setInputMessage={setInputMessage}
          sendMessage={sendMessage}
          isTyping={isTyping}
          onClose={() => {
            setActiveView('scenarios');
            setCurrentScenario(null);
            setMessages([]);
          }}
          completedExercises={completedExercises}
          onSelectExercise={selectExercise}
          onMarkComplete={markExerciseComplete}
          vncUrl={vncUrl}
          userId={userId}
          apiUrl={API_URL}
        />
      )}
    </div>
  );
};

const ScenariosView = ({ scenarios, loading, onStart, completedCount }) => (
  <>
    <header className="relative z-10 border-b-2 border-green-500 bg-black/50 backdrop-blur-sm">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center gap-4 mb-4">
          <Terminal className="w-12 h-12 text-green-400" />
          <h1 className="text-5xl font-bold font-mono">
            <span className="text-green-400">CEDRIK</span>
            <span className="text-white"> Labs</span>
          </h1>
        </div>
        <p className="text-center text-green-300 font-mono text-lg">
          Cybersecurity Education through Dynamic Responsive Integrated Knowledge
        </p>
        <p className="text-center text-gray-400 font-mono mt-2">
          root@kali:~# ./engage_learning_mode
        </p>
      </div>
    </header>

    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <StatCard icon={<Target />} label="Active Scenarios" value={scenarios.length.toString()} color="green" />
        <StatCard icon={<Trophy />} label="Completed" value={completedCount.toString()} color="blue" />
        <StatCard icon={<Clock />} label="Skills Available" value={scenarios.reduce((acc, s) => acc + s.skills.length, 0).toString()} color="yellow" />
      </div>

      {loading ? (
        <div className="text-center py-20">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-green-500 border-t-transparent" />
          <p className="text-green-400 font-mono mt-4">Loading scenarios...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {scenarios.map(scenario => (
            <ScenarioCard key={scenario.id} scenario={scenario} onStart={onStart} />
          ))}
        </div>
      )}
    </div>
  </>
);

const StatCard = ({ icon, label, value, color }) => {
  const colors = {
    green: 'from-green-600 to-green-800 border-green-400',
    blue: 'from-blue-600 to-blue-800 border-blue-400',
    yellow: 'from-yellow-600 to-yellow-800 border-yellow-400'
  };

  return (
    <div className={`bg-gradient-to-br ${colors[color]} border-2 rounded-lg p-6 transform hover:scale-105 transition-transform`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-200 font-mono text-sm mb-1">{label}</p>
          <p className="text-4xl font-bold text-white font-mono">{value}</p>
        </div>
        <div className="text-white/70">
          {React.cloneElement(icon, { className: 'w-12 h-12' })}
        </div>
      </div>
    </div>
  );
};

const ScenarioCard = ({ scenario, onStart }) => {
  const difficultyColors = {
    'Beginner': 'bg-green-500 text-black',
    'Intermediate': 'bg-yellow-500 text-black',
    'Advanced': 'bg-red-500 text-white',
    'All Levels': 'bg-blue-500 text-white'
  };

  return (
    <div className="bg-gray-900 border-2 border-green-500/50 rounded-lg overflow-hidden transform hover:scale-105 hover:border-green-400 transition-all duration-300 hover:shadow-2xl hover:shadow-green-500/50">
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="text-5xl">{scenario.icon}</div>
          <span className={`px-3 py-1 rounded-full text-xs font-bold font-mono ${difficultyColors[scenario.difficulty]}`}>
            {scenario.difficulty}
          </span>
        </div>

        <h3 className="text-xl font-bold text-green-400 font-mono mb-2">
          {scenario.name}
        </h3>

        <p className="text-gray-400 text-sm mb-4 leading-relaxed">
          {scenario.description}
        </p>

        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-gray-400 text-sm font-mono">
            <Clock className="w-4 h-4" />
            <span>{scenario.estimated_time}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-400 text-sm font-mono">
            <BookOpen className="w-4 h-4" />
            <span>{scenario.exercise_count} exercises</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {scenario.skills.map((skill, idx) => (
            <span key={idx} className="px-2 py-1 bg-gray-800 text-green-400 rounded text-xs font-mono border border-green-500/30">
              {skill}
            </span>
          ))}
        </div>

        <button
          onClick={() => onStart(scenario)}
          className="w-full bg-gradient-to-r from-green-600 to-green-800 hover:from-green-500 hover:to-green-700 text-white font-bold py-3 px-4 rounded font-mono transition-all duration-300 flex items-center justify-center gap-2 border-2 border-green-400"
        >
          <Terminal className="w-5 h-5" />
          Initialize Scenario
        </button>
      </div>
    </div>
  );
};

const LabEnvironment = ({ 
  scenario, 
  exercises, 
  currentExerciseId, 
  messages, 
  inputMessage, 
  setInputMessage, 
  sendMessage, 
  isTyping, 
  onClose, 
  completedExercises,
  onSelectExercise,
  onMarkComplete,
  vncUrl,
  userId,
  apiUrl
}) => {
  const messagesEndRef = useRef(null);
  const [validationStatus, setValidationStatus] = useState(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (scenario && currentExerciseId) {
      loadValidationStatus();
    }
  }, [currentExerciseId, scenario]);

  const loadValidationStatus = async () => {
    try {
      const response = await fetch(
        `${apiUrl}/exercise/${scenario.id}/${currentExerciseId}/status?userId=${userId}`
      );
      const status = await response.json();
      setValidationStatus(status);
    } catch (error) {
      console.error('Failed to load validation status:', error);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const progressPercentage = (completedExercises.size / exercises.length) * 100;
  const currentExercise = exercises.find(e => e.id === currentExerciseId);

  return (
    <div className="fixed inset-0 bg-black flex flex-col">
      <div className="bg-gray-900 border-b-2 border-green-500 p-4">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Terminal className="w-6 h-6 text-green-400" />
            <h2 className="text-xl font-bold text-green-400 font-mono">{scenario.name}</h2>
          </div>
          <button
            onClick={onClose}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded font-mono font-bold transition-colors border-2 border-red-400"
          >
            [X] EXIT
          </button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 p-4 overflow-hidden">
        {/* VNC Container */}
        <div className="lg:col-span-2 bg-black rounded-lg border-2 border-green-500/50 overflow-hidden flex flex-col">
          <div className="bg-gray-900 p-3 flex items-center justify-between border-b-2 border-green-500/50">
            <span className="text-green-400 font-mono text-sm flex items-center gap-2">
              <Terminal className="w-4 h-4" />
              root@kali:~# scenario_{scenario.id}
            </span>
          </div>
          <div className="flex-1 relative">
            <iframe
              src={vncUrl}
              className="absolute inset-0 w-full h-full border-none"
              allow="fullscreen"
              allowFullScreen={true}
            />
          </div>
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-4 overflow-y-auto">
          {/* Progress */}
          <div className="bg-gray-900 border-2 border-blue-500/50 rounded-lg p-4">
            <h3 className="text-blue-400 font-mono font-bold mb-3 flex items-center gap-2">
              <Trophy className="w-5 h-5" />
              MISSION STATUS
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm font-mono">
                <span className="text-gray-400">Progress</span>
                <span className="text-green-400">{Math.round(progressPercentage)}%</span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full transition-all duration-500" 
                  style={{ width: `${progressPercentage}%` }} 
                />
              </div>
            </div>
          </div>

          {/* Exercises */}
          <ExerciseList
            exercises={exercises}
            currentExerciseId={currentExerciseId}
            completedExercises={completedExercises}
            onSelectExercise={onSelectExercise}
            onMarkComplete={onMarkComplete}
            validationStatus={validationStatus}
          />

          {/* AI Chat */}
          <div className="flex-1 bg-gray-900 border-2 border-green-500/50 rounded-lg flex flex-col overflow-hidden min-h-[400px]">
            <div className="bg-gray-950 p-3 border-b-2 border-green-500/50">
              <h3 className="text-green-400 font-mono font-bold flex items-center gap-2">
                <Brain className="w-5 h-5" />
                AI TEAM CONSOLE
              </h3>
              <p className="text-gray-500 font-mono text-xs mt-1">2 agents online</p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg, idx) => (
                <MessageBubble key={idx} message={msg} />
              ))}
              {isTyping && <TypingIndicator />}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t-2 border-green-500/50 bg-gray-950">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="root@kali:~# type your question..."
                  className="flex-1 bg-gray-900 border-2 border-green-500/50 text-green-400 px-3 py-2 rounded font-mono text-sm focus:outline-none focus:border-green-400 placeholder-gray-600"
                />
                <button
                  onClick={sendMessage}
                  disabled={isTyping}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-mono font-bold transition-colors border-2 border-green-400 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  SEND
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ExerciseList = ({ exercises, currentExerciseId, completedExercises, onSelectExercise, onMarkComplete, validationStatus }) => (
  <div className="bg-gray-900 border-2 border-purple-500/50 rounded-lg p-4">
    <h3 className="text-purple-400 font-mono font-bold mb-3">EXERCISES</h3>
    <div className="space-y-2">
      {exercises.map((exercise, idx) => {
        const isCompleted = completedExercises.has(exercise.id);
        const isCurrent = exercise.id === currentExerciseId;
        const isPreviousCompleted = idx === 0 || completedExercises.has(exercises[idx - 1].id);
        
        return (
          <div
            key={exercise.id}
            className={`p-3 rounded border-2 cursor-pointer transition-all ${
              isCurrent 
                ? 'bg-purple-900/50 border-purple-400' 
                : isCompleted
                ? 'bg-green-900/30 border-green-500/50'
                : 'bg-gray-800 border-gray-700 hover:border-gray-600'
            }`}
            onClick={() => onSelectExercise(exercise.id)}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-white font-mono text-sm font-bold">
                {idx + 1}. {exercise.title}
              </span>
              {isCompleted && <CheckCircle className="w-4 h-4 text-green-400" />}
            </div>
            
            {isCurrent && validationStatus && (
              <div className="mt-2 space-y-1">
                <ValidationStatusItem
                  label="Challenges"
                  status={validationStatus.challenges.valid}
                  detail={`${validationStatus.challenges.completed}/${validationStatus.challenges.required}`}
                />
                <ValidationStatusItem
                  label="Mitigation"
                  status={validationStatus.mitigation.valid}
                />
                <ValidationStatusItem
                  label="Reflection"
                  status={validationStatus.reflection.valid}
                />
                
                {isCurrent && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onMarkComplete(exercise.id);
                    }}
                    disabled={!validationStatus.canComplete || !isPreviousCompleted}
                    className="w-full mt-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-3 py-1 rounded font-mono text-xs font-bold transition-colors"
                  >
                    {!isPreviousCompleted ? '🔒 Complete Previous' : 'Mark Complete'}
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  </div>
);

const ValidationStatusItem = ({ label, status, detail }) => (
  <div className="flex items-center justify-between text-xs font-mono">
    <span className="text-gray-400">{label}</span>
    <div className="flex items-center gap-1">
      {detail && <span className="text-gray-500">{detail}</span>}
      {status ? (
        <CheckCircle className="w-3 h-3 text-green-400" />
      ) : (
        <XCircle className="w-3 h-3 text-red-400" />
      )}
    </div>
  </div>
);

const MessageBubble = ({ message }) => {
  const agentStyles = {
    user: 'bg-blue-900 border-blue-400 ml-auto',
    professor: 'bg-purple-900 border-purple-400',
    hacker: 'bg-orange-900 border-orange-400',
    system: 'bg-gray-800 border-gray-600'
  };

  const agentIcons = {
    professor: '👨‍🏫',
    hacker: '🎯',
    system: '⚙️'
  };

  const formatContent = (content) => {
    content = content.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>');
    content = content.replace(/`([^`]+)`/g, '<code class="bg-gray-950 px-2 py-1 rounded text-green-300 text-xs font-mono">$1</code>');
    content = content.replace(/\n/g, '<br />');
    return content;
  };

  return (
    <div className={`border-2 rounded-lg p-3 max-w-[85%] ${agentStyles[message.role]}`}>
      {message.agent && (
        <div className="flex items-center gap-2 mb-2 pb-2 border-b border-white/20">
          <span className="text-xl">{agentIcons[message.role]}</span>
          <div>
            <span className="text-white font-mono font-bold text-sm block">{message.agent}</span>
            {message.specialty && (
              <span className="text-gray-400 font-mono text-xs">{message.specialty}</span>
            )}
          </div>
        </div>
      )}
      <div 
        className="text-gray-100 text-sm font-mono leading-relaxed"
        dangerouslySetInnerHTML={{ __html: formatContent(message.content) }}
      />
    </div>
  );
};

const TypingIndicator = () => (
  <div className="flex gap-2">
    <div className="bg-gray-800 border border-green-500/50 rounded-lg p-3">
      <div className="flex gap-1">
        <span className="w-2 h-2 bg-green-400 rounded-full animate-bounce" />
        <span className="w-2 h-2 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
        <span className="w-2 h-2 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
      </div>
    </div>
  </div>
);

export default App;