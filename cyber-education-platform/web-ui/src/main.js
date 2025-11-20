const API_URL = 'http://localhost:3000/api';
const VNC_URL =
  'http://localhost:6080/vnc.html?autoconnect=1&resize=scale&quality=9&compression=2&password=kali123';
let currentScenario = null;
let conversationHistory = [];
let userId = 'demo-user';
let vncScaling = 'scale';
let currentExerciseId = 1;
let completedExercises = new Set();
let completedChallenges = new Set();

const EXERCISE_REQUIREMENTS = {
  MIN_CHALLENGES: 3,
  REFLECTION_BULLETS: 3,
  REFLECTION_TYPES: ['evidence', 'prevention', 'detection'],
};

async function init() {
  await loadScenarios();
  // await loadUserProgress()
}

function showLaunchNotification(success, title, message) {
  const notification = document.getElementById('launchNotification');
  notification.className = 'launch-notification show ' + (success ? 'success' : 'error');
  notification.querySelector('.icon').textContent = success ? '✅' : '❌';
  notification.querySelector('.title').textContent = title;
  notification.querySelector('.message').textContent = message;

  setTimeout(() => {
    notification.classList.remove('show');
  }, 5000);
}

async function loadScenarios() {
  try {
    const response = await fetch(`${API_URL}/scenarios`);
    const data = await response.json();

    const grid = document.getElementById('scenariosGrid');
    grid.innerHTML = '';

    data.scenarios.forEach((scenario) => {
      const col = document.createElement('div');
      col.className = 'col-12 col-md-6 col-xl-4';
      const card = createScenarioCard(scenario);
      col.appendChild(card);
      grid.appendChild(col);
    });
  } catch (error) {
    console.error('Failed to load scenarios:', error);
    document.getElementById('scenariosGrid').innerHTML =
      '<div class="col-12"><div class="loading">Failed to load scenarios. Is the server running?</div></div>';
  }
}

function createScenarioCard(scenario) {
  const card = document.createElement('div');
  card.className = 'scenario-card';
  card.onclick = () => startScenario(scenario.id);

  const difficultyClass = scenario.difficulty.toLowerCase().replace(' ', '-');

  card.innerHTML = `
      <div class="scenario-header">
          <h3 class="scenario-title">${scenario.name}</h3>
          <span class="difficulty ${difficultyClass}">${scenario.difficulty}</span>
      </div>
      <p class="scenario-description">${scenario.description}</p>
      <div class="scenario-meta">
          <div class="meta-item">
              <span>⏱️</span>
              <span>${scenario.estimated_time}</span>
          </div>
          <div class="meta-item">
              <span>📝</span>
              <span>${scenario.exercise_count} exercises</span>
          </div>
      </div>
      <div class="skills">
          ${scenario.skills
            .map((skill) => `<span class="skill-tag">${skill}</span>`)
            .join('')}
      </div>
      <button class="start-button" onclick="event.stopPropagation(); startScenario('${
        scenario.id
      }')">
          🚀 Start Scenario (Auto-Launch)
      </button>
  `;

  return card;
}

async function startScenario(scenarioId) {
  const button = event.target;
  button.classList.add('loading');
  button.textContent = '⏳ Launching...';
  button.disabled = true;

  try {
    const response = await fetch(`${API_URL}/scenarios/${scenarioId}`);
    currentScenario = await response.json();

    const startResponse = await fetch(`${API_URL}/scenarios/${scenarioId}/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });

    const startData = await startResponse.json();

    if (startData.success) {
      showLaunchNotification(
        startData.launched_in_kali,
        startData.launched_in_kali ? 'Launched Successfully!' : 'Scenario Started',
        startData.launch_message || 'Check the VNC window'
      );

      await new Promise((resolve) => setTimeout(resolve, 2000));
      openLabModal();
    } else {
      showLaunchNotification(false, 'Launch Failed', startData.error || 'Unknown error');
    }
  } catch (error) {
    console.error('Error starting scenario:', error);
    showLaunchNotification(
      false,
      'Error',
      'Failed to start scenario. Check if containers are running.'
    );
  } finally {
    button.classList.remove('loading');
    button.textContent = '🚀 Start Scenario (Auto-Launch)';
    button.disabled = false;
  }
}

function openLabModal() {
  document.getElementById('modalTitle').textContent = currentScenario.name;
  const vncFrame = document.getElementById('vncFrame');
  vncFrame.src = VNC_URL;

  updateConnectionStatus('Connecting...');
  setTimeout(() => {
    updateConnectionStatus('Connected - Scenario loaded in Firefox');
  }, 3000);

  completedExercises.clear();
  completedChallenges.clear();
  resetScenarioProgress(currentScenario.id);

  async function resetScenarioProgress(scenarioId) {
    try {
      await fetch(`${API_URL}/progress/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          scenarioId,
        }),
      });
      console.log(`Reset progress for scenario: ${scenarioId}`);
    } catch (error) {
      console.error('Failed to reset progress:', error);
    }
  }

  const exerciseSidebar = document.getElementById('exerciseSidebar');
  if (!exerciseSidebar) {
    console.error('Exercise sidebar not found!');
    return;
  }

  const exerciseList = document.getElementById('exerciseList');
  exerciseList.innerHTML = '';

  const progressCompleted = document.getElementById('progressCompleted');
  const progressRemaining = document.getElementById('progressRemaining');

  if (progressCompleted) {
    progressCompleted.textContent = `0 of ${currentScenario.exercises.length} completed`;
  }
  if (progressRemaining) {
    progressRemaining.textContent = `${currentScenario.exercises.length} remaining`;
  }

  currentScenario.exercises.forEach((exercise, index) => {
    const exerciseDiv = document.createElement('div');
    exerciseDiv.className = 'exercise-item' + (index === 0 ? ' active' : '');
    exerciseDiv.onclick = () => selectExercise(exercise.id, index);

    const objectivesList = exercise.objectives
      ? `<ul class="exercise-objectives">${exercise.objectives
          .map((obj) => `<li>${obj}</li>`)
          .join('')}</ul>`
      : '';

    const isPreviousCompleted =
      index === 0 || completedExercises.has(currentScenario.exercises[index - 1].id);
    const isDisabled = !isPreviousCompleted;

    exerciseDiv.innerHTML = `
      <div class="exercise-title">
          ${index + 1}. ${exercise.title}
          <span class="exercise-status in-progress" id="status-${
            exercise.id
          }">In Progress</span>
      </div>
      <div>${exercise.description}</div>
      ${objectivesList}
      <button class="complete-button" 
              onclick="event.stopPropagation(); markExerciseComplete(${
                exercise.id
              }, ${index})"
              ${isDisabled ? 'disabled' : ''}
              id="completeBtn-${exercise.id}">
          ${isDisabled ? '🔒 Complete Previous First' : 'Mark as Complete'}
      </button>
  `;
    exerciseList.appendChild(exerciseDiv);
  });

  conversationHistory = [];
  const chatMessages = document.getElementById('chatMessages');
  const firstExercise = currentScenario.exercises[0];

  const welcomeMsg = `Welcome to **${currentScenario.name}**!\n\nThe scenario has been automatically opened in Kali Firefox.\n\n**First Exercise:** ${firstExercise?.title}\n\n${firstExercise?.description}`;

  chatMessages.innerHTML = `
  <div class="agent-response">
      <div class="agent-message professor">
          <div class="agent-header">
              <span class="agent-avatar">👨‍🏫</span>
              <div class="agent-info">
                  <div class="agent-name">Professor Cedrik</div>
                  <div class="agent-specialty">Teaching & Guidance</div>
              </div>
          </div>
          <div class="agent-content">${formatMessage(welcomeMsg)}</div>
      </div>
      <div class="agent-message hacker">
          <div class="agent-header">
              <span class="agent-avatar">🎯</span>
              <div class="agent-info">
                  <div class="agent-name">H4ck3r Man Pancho</div>
                  <div class="agent-specialty">Technical Execution</div>
              </div>
          </div>
          <div class="agent-content">
              Let's get hacking! I'll give you the exact commands and payloads you need. 
              <strong>Ready when you are!</strong> 💻
          </div>
      </div>
  </div>
`;

  document.getElementById('labModal').classList.add('active');
  updateExerciseSidebarWithValidation(1);
}

async function markExerciseComplete(exerciseId, exerciseIndex) {
  // Check if validation requirements are met
  const status = await fetch(
    `${API_URL}/exercise/${currentScenario.id}/${exerciseId}/status?userId=${userId}`
  );
  const statusData = await status.json();

  if (!statusData.canComplete) {
    alert(
      'Please complete all validation requirements:\n' +
        '- Complete 3+ challenges\n' +
        '- Submit validated mitigation note\n' +
        '- Submit 3-bullet reflection'
    );
    return;
  }
  try {
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
      completedExercises.add(exerciseId);

      const statusSpan = document.getElementById(`status-${exerciseId}`);
      if (statusSpan) {
        statusSpan.textContent = 'Completed';
        statusSpan.classList.remove('in-progress');
        statusSpan.classList.add('completed');
      }

      const completeBtn = document.getElementById(`completeBtn-${exerciseId}`);
      if (completeBtn) {
        completeBtn.disabled = true;
        completeBtn.textContent = '✓ Completed';
      }

      updateProgressBar();

      if (exerciseIndex < currentScenario.exercises.length - 1) {
        const nextExercise = currentScenario.exercises[exerciseIndex + 1];
        const nextButton = document.getElementById(`completeBtn-${nextExercise.id}`);
        if (nextButton) {
          nextButton.disabled = false;
          nextButton.textContent = 'Mark as Complete';
        }
      }

      const exercise = currentScenario.exercises.find((e) => e.id === exerciseId);
      const userMessage = `I completed the exercise: ${exercise.title}`;
      addChatMessage(userMessage, 'user');

      const aiResponse = await fetch(`${API_URL}/ai/guidance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenarioId: currentScenario.id,
          exerciseId,
          message: userMessage,
          userId,
          conversationHistory,
        }),
      });
      const aiData = await aiResponse.json();

      if (aiData.guidance && aiData.guidance.agents) {
        addAgentResponses(aiData.guidance.agents);
      }

      conversationHistory.push({ role: 'user', content: userMessage });

      if (exerciseIndex < currentScenario.exercises.length - 1) {
        const nextExercise = currentScenario.exercises[exerciseIndex + 1];
        selectExercise(nextExercise.id, exerciseIndex + 1);
      } else {
        const congrats = {
          agents: [
            {
              agent: { name: 'System', emoji: '🎉', specialty: 'Achievement' },
              response: 'Congratulations! You completed the entire scenario!',
            },
          ],
        };
        addAgentResponses(congrats.agents);
      }

      // await loadUserProgress()
    } else {
      alert('Failed to mark complete. Try again.');
    }
  } catch (error) {
    console.error('Error marking complete:', error);
    alert('Error updating progress.');
  }
}

function updateProgressBar() {
  const completed = completedExercises.size;
  const total = currentScenario.exercises.length;
  const percentage = Math.round((completed / total) * 100);

  document.getElementById('progressPercentage').textContent = `${percentage}%`;
  document.getElementById('progressBarFill').style.width = `${percentage}%`;
  document.getElementById(
    'progressCompleted'
  ).textContent = `${completed} of ${total} completed`;
  document.getElementById('progressRemaining').textContent = `${
    total - completed
  } remaining`;
}

function selectExercise(exerciseId, exerciseIndex) {
  currentExerciseId = exerciseId;

  document.querySelectorAll('.exercise-item').forEach((item) => {
    item.classList.remove('active');
  });

  const exerciseItems = document.querySelectorAll('.exercise-item');
  if (exerciseItems[exerciseIndex]) {
    exerciseItems[exerciseIndex].classList.add('active');
  }

  const exercise = currentScenario.exercises.find((e) => e.id === exerciseId);

  if (exercise) {
    const switchMsg = {
      agents: [
        {
          agent: { name: 'System', emoji: '📝', specialty: 'Navigation' },
          response:
            `Switched to exercise: **${exercise.title}**\n\n${exercise.description}\n\n` +
            `**Objectives:**\n${
              exercise.objectives?.map((obj, i) => `${i + 1}. ${obj}`).join('\n') ||
              'Complete this exercise'
            }`,
        },
      ],
    };
    addAgentResponses(switchMsg.agents);
  }
  updateExerciseSidebarWithValidation(exerciseId);
}

function closeModal() {
  document.getElementById('labModal').classList.remove('active');
  document.getElementById('vncFrame').src = 'about:blank';
  currentScenario = null;

  if (document.fullscreenElement) {
    document.exitFullscreen();
  }
}

function toggleFullscreen() {
  const vncContainer = document.getElementById('vncContainer');

  if (!document.fullscreenElement) {
    vncContainer.requestFullscreen().catch((err) => {
      alert(`Error attempting to enable fullscreen: ${err.message}`);
    });
  } else {
    document.exitFullscreen();
  }
}

function toggleScaling() {
  const vncFrame = document.getElementById('vncFrame');
  vncScaling = vncScaling === 'scale' ? 'remote' : 'scale';

  const currentSrc = vncFrame.src;
  const url = new URL(currentSrc);
  url.searchParams.set('resize', vncScaling);
  vncFrame.src = url.toString();

  updateConnectionStatus(`Scaling: ${vncScaling}`);
  setTimeout(() => updateConnectionStatus('Connected'), 2000);
}

function updateConnectionStatus(status) {
  const statusEl = document.getElementById('connectionStatus');
  statusEl.textContent = status;
  statusEl.className =
    'connection-status' + (status.includes('Connected') ? '' : ' disconnected');
}

async function sendMessage() {
  const input = document.getElementById('chatInput');
  const sendBtn = document.getElementById('sendButton');
  const message = input.value.trim();

  if (!message || !currentScenario) return;

  sendBtn.disabled = true;
  sendBtn.textContent = '⏳ Asking team...';

  addChatMessage(message, 'user');
  input.value = '';

  showTypingIndicators();

  try {
    const response = await fetch(`${API_URL}/ai/guidance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scenarioId: currentScenario.id,
        exerciseId: currentExerciseId,
        message: message,
        userId: userId,
        conversationHistory: conversationHistory,
      }),
    });

    const data = await response.json();

    removeTypingIndicators();

    if (data.guidance && data.guidance.agents) {
      // Pass RAG sources to the display function
      addAgentResponses(data.guidance.agents, data.guidance.rag_sources);

      conversationHistory.push({ role: 'user', content: message });
      data.guidance.agents.forEach((agentResp) => {
        conversationHistory.push({
          role: 'assistant',
          content: `[${agentResp.agent.name}] ${agentResp.response}`,
        });
      });
    }
  } catch (error) {
    console.error('AI Error:', error);
    removeTypingIndicators();

    const errorResponse = {
      agents: [
        {
          agent: {
            name: 'System',
            emoji: '⚠️',
            specialty: 'Error Handler',
          },
          response: 'Sorry, I had trouble connecting to the AI team. Please try again.',
        },
      ],
    };
    addAgentResponses(errorResponse.agents);
  } finally {
    sendBtn.disabled = false;
    sendBtn.textContent = 'Send to Team';
  }
}

function showTypingIndicators() {
  const chatMessages = document.getElementById('chatMessages');
  const typingDiv = document.createElement('div');
  typingDiv.className = 'typing-indicator';
  typingDiv.id = 'typingIndicator';
  typingDiv.innerHTML = `
  <div class="typing-agent">
      <span>👨‍🏫</span>
      <div class="typing-dots">
          <span></span><span></span><span></span>
      </div>
  </div>
  <div class="typing-agent">
      <span>🎯</span>
      <div class="typing-dots">
          <span></span><span></span><span></span>
      </div>
  </div>
`;
  chatMessages.appendChild(typingDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function removeTypingIndicators() {
  const indicator = document.getElementById('typingIndicator');
  if (indicator) {
    indicator.remove();
  }
}

function addAgentResponses(agents, ragSources = null) {
  const chatMessages = document.getElementById('chatMessages');
  const responseContainer = document.createElement('div');
  responseContainer.className = 'agent-response';

  agents.forEach((agentData) => {
    const agentDiv = document.createElement('div');
    const agentClass = agentData.agent.name.includes('Professor')
      ? 'professor'
      : 'hacker';
    agentDiv.className = `agent-message ${agentClass}`;

    agentDiv.innerHTML = `
      <div class="agent-header">
          <span class="agent-avatar">${agentData.agent.emoji}</span>
          <div class="agent-info">
              <div class="agent-name">${agentData.agent.name}</div>
              <div class="agent-specialty">${agentData.agent.specialty}</div>
          </div>
      </div>
      <div class="agent-content">${formatMessage(agentData.response)}</div>
  `;

    responseContainer.appendChild(agentDiv);
  });

  // Add RAG sources if available
  if (ragSources && ragSources.length > 0) {
    const ragDiv = document.createElement('div');
    ragDiv.className = 'rag-sources';
    ragDiv.innerHTML = `
      <div class="rag-sources-title">
        📚 Sources from Knowledge Base:
      </div>
      ${ragSources
        .map((source) => `<span class="rag-source-item">• ${source}</span>`)
        .join('')}
    `;
    responseContainer.appendChild(ragDiv);
  }

  chatMessages.appendChild(responseContainer);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function formatMessage(text) {
  text = text.replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>');
  text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
  text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/### (.*?)(\n|$)/g, '<h4>$1</h4>');
  text = text.replace(/## (.*?)(\n|$)/g, '<h3>$1</h3>');
  text = text.replace(/\n/g, '<br>');
  return text;
}

function addChatMessage(text, role) {
  const chatMessages = document.getElementById('chatMessages');
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${role}`;
  messageDiv.innerHTML = formatMessage(text);
  chatMessages.appendChild(messageDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('chatInput')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  document.addEventListener('fullscreenchange', () => {
    const vncContainer = document.getElementById('vncContainer');
    if (document.fullscreenElement) {
      vncContainer.style.borderRadius = '0';
    } else {
      vncContainer.style.borderRadius = '10px';
    }
  });
  document.getElementById('knowledgeSearchInput')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      searchKnowledge();
    }
  });
});

let currentKnowledgeCategory = 'all';
let knowledgeCache = null;

function openKnowledgeBrowser() {
  document.getElementById('knowledgeModal').classList.add('active');
  if (!knowledgeCache) {
    loadKnowledgeBase('all');
  }
}

function closeKnowledgeModal() {
  document.getElementById('knowledgeModal').classList.remove('active');
}

async function loadKnowledgeBase(category) {
  try {
    const response = await fetch(`${API_URL}/knowledge/${category}`);
    const data = await response.json();
    knowledgeCache = data.documents || data.results;
    displayKnowledgeResults(knowledgeCache);
  } catch (error) {
    console.error('Failed to load knowledge base:', error);
    document.getElementById('knowledgeResults').innerHTML =
      '<div style="text-align: center; color: #ef4444;">Failed to load knowledge base</div>';
  }
}

function filterCategory(category) {
  currentKnowledgeCategory = category;

  // Update button states
  document.querySelectorAll('.category-btn').forEach((btn) => {
    btn.classList.remove('active');
  });
  event.target.classList.add('active');

  loadKnowledgeBase(category);
}

async function searchKnowledge() {
  const query = document.getElementById('knowledgeSearchInput').value.trim();
  if (!query) {
    loadKnowledgeBase(currentKnowledgeCategory);
    return;
  }

  try {
    const response = await fetch(
      `${API_URL}/knowledge/all?query=${encodeURIComponent(query)}`
    );
    const data = await response.json();
    displayKnowledgeResults(data.results);
  } catch (error) {
    console.error('Search failed:', error);
  }
}

function displayKnowledgeResults(results) {
  const container = document.getElementById('knowledgeResults');

  if (!results || results.length === 0) {
    container.innerHTML =
      '<div style="text-align: center; color: #666;">No results found</div>';
    return;
  }

  container.innerHTML = results
    .map(
      (doc) => `
<div class="knowledge-item">
<div class="knowledge-item-title">${doc.title}</div>
<span class="knowledge-item-category">${doc.category}</span>
<div class="knowledge-item-content">${doc.content}</div>
${
  doc.relevance
    ? `<div style="margin-top: 10px; font-size: 0.8rem; color: #6b7280;">Relevance: ${doc.relevance}</div>`
    : ''
}
</div>
`
    )
    .join('');
}

// Initialize validation tracking
let currentValidationStatus = {
  challenges: { valid: false, count: 0, completed: 0, required: 3 },
  mitigation: { valid: false, submitted: false },
  reflection: { valid: false, submitted: false },
  canComplete: false,
};

// Render validation status bar
function renderValidationStatus(status) {
  const statusHtml = `
<div class="validation-status-bar">
<h4 style="margin-top: 0; margin-bottom: 15px;">📋 Exercise Completion Status</h4>

<div class="status-item">
  <span class="status-label">Challenges (${status.challenges.completed || 0}/${
    status.challenges.required || 3
  })</span>
  <span class="status-indicator ${status.challenges.valid ? 'complete' : 'incomplete'}">
    ${status.challenges.valid ? '✅ Complete' : '⏳ In Progress'}
  </span>
</div>

<div class="status-item">
  <span class="status-label">Mitigation Note</span>
  <span class="status-indicator ${
    status.mitigation.valid
      ? 'complete'
      : status.mitigation.submitted
      ? 'pending'
      : 'incomplete'
  }">
    ${
      status.mitigation.valid
        ? '✅ Validated'
        : status.mitigation.submitted
        ? '⏳ Submitted'
        : '❌ Not Started'
    }
  </span>
</div>

<div class="status-item">
  <span class="status-label">3-Bullet Reflection</span>
  <span class="status-indicator ${
    status.reflection.valid
      ? 'complete'
      : status.reflection.submitted
      ? 'pending'
      : 'incomplete'
  }">
    ${
      status.reflection.valid
        ? '✅ Complete'
        : status.reflection.submitted
        ? '⏳ Submitted'
        : '❌ Not Started'
    }
  </span>
</div>

${
  !status.canComplete
    ? `
  <div class="progress-gate">
    <div class="gate-icon">🔒</div>
    <div class="gate-message">
      Complete all sections above to proceed to the next exercise
    </div>
  </div>
`
    : ''
}
</div>
`;

  return statusHtml;
}

// Render challenge tracker
function renderChallengeTracker(exercise) {
  // Get challenges from the exercise definition
  const challenges = exercise?.challenges || [];

  if (challenges.length === 0) {
    // No challenges defined for this exercise
    return `
<div class="challenge-tracker">
  <div class="challenge-header">
    <h4 style="margin: 0;">🎯 Challenge Tracker</h4>
    <span class="challenge-count" id="challengeCount">0/3</span>
  </div>
  <p style="font-size: 0.85rem; color: #666; margin-bottom: 10px;">
    Complete at least 3 challenges to unlock mitigation writing
  </p>
  <div class="challenge-list" id="challengeList">
    <div style="padding: 15px; background: #fef3c7; border-radius: 8px; border-left: 4px solid #f59e0b;">
      <strong>ℹ️ Manual Challenge Tracking</strong>
      <p style="margin: 10px 0 0 0; font-size: 0.85rem;">
        This exercise doesn't have pre-defined challenges. As you work through the objectives, 
        manually mark your progress by clicking the button below each time you complete a task:
      </p>
      <button 
        onclick="manualChallengeComplete()" 
        style="margin-top: 10px; padding: 8px 15px; background: #10b981; color: white; border: none; border-radius: 5px; cursor: pointer; width: 100%;"
      >
        ✅ Mark Challenge Complete (+1)
      </button>
    </div>
  </div>
</div>
`;
  }

  return `
<div class="challenge-tracker">
<div class="challenge-header">
  <h4 style="margin: 0;">🎯 Challenge Tracker</h4>
  <span class="challenge-count" id="challengeCount">0/${Math.max(
    challenges.length,
    3
  )}</span>
</div>
<p style="font-size: 0.85rem; color: #666; margin-bottom: 10px;">
  Complete at least 3 challenges to unlock mitigation writing
</p>
<div class="challenge-list" id="challengeList">
  ${challenges
    .map((challenge, idx) => {
      // Check if this challenge is already completed
      const isCompleted = completedChallenges.has(challenge.id);

      return `
      <div class="challenge-item" id="challenge-item-${idx}">
        <input 
          type="checkbox" 
          class="challenge-checkbox" 
          id="challenge-${idx}" 
          data-challenge-id="${challenge.id}"
          data-challenge-name="${challenge.name}"
          onchange="handleChallengeCheckbox(this)"
          ${isCompleted ? 'checked' : ''}
        >
        <label for="challenge-${idx}" style="cursor: pointer; flex: 1;">
          ${challenge.name}
        </label>
      </div>
    `;
    })
    .join('')}
</div>
<div style="margin-top: 10px; padding: 10px; background: #e0f2fe; border-radius: 5px; font-size: 0.8rem; color: #0369a1;">
  💡 <strong>Tip:</strong> Check the box after you successfully complete each challenge. 
  The AI assistants can guide you through each one!
</div>
</div>
`;
}

// Handle checkbox changes
function handleChallengeCheckbox(checkbox) {
  const challengeId = checkbox.dataset.challengeId;
  const challengeName = checkbox.dataset.challengeName;

  if (checkbox.checked) {
    // Mark as complete
    markChallengeComplete(challengeId, challengeName);
  } else {
    // Uncheck - optionally you could remove the completion
    console.log('Challenge unchecked:', challengeId);
    // For now, we'll keep it marked as complete in the database
    // To allow unchecking, you'd need a DELETE endpoint
  }
}

// Manual challenge completion for exercises without pre-defined challenges
async function manualChallengeComplete() {
  const timestamp = Date.now();
  const challengeId = `manual-${currentScenario.id}-${currentExerciseId}-${timestamp}`;
  const challengeName = `Manual Task ${currentValidationStatus.challenges.completed + 1}`;

  await markChallengeComplete(challengeId, challengeName);
}

// Render mitigation note section
function renderMitigationSection(enabled = false) {
  return `
<div class="mitigation-section">
<h4 style="margin-top: 0;">🛡️ Mitigation / Defense</h4>
<p style="font-size: 0.85rem; color: #666; margin-bottom: 10px;">
  How would you defend against this vulnerability? (min 50 chars)
</p>
<textarea 
  id="mitigationNote" 
  class="mitigation-textarea"
  placeholder="Explain defensive measures: input validation, parameterized queries, CSP, principle of least privilege, etc."
  ${!enabled ? 'disabled' : ''}
></textarea>
<div id="mitigationFeedback"></div>
<button 
  id="submitMitigation" 
  class="submit-btn validate"
  onclick="submitMitigation()"
  ${!enabled ? 'disabled' : ''}
>
  Validate Mitigation Note
</button>
</div>
`;
}

// Render reflection section
function renderReflectionSection(enabled = false) {
  return `
<div class="reflection-section">
<h4 style="margin-top: 0;">💭 3-Bullet Reflection</h4>

<div class="reflection-bullet">
  <label>
    <span class="label-icon">🔍</span>
    Evidence: What did you find/exploit?
  </label>
  <input 
    type="text" 
    id="reflectionEvidence" 
    class="reflection-input"
    placeholder="Describe what vulnerability you exploited and what you discovered..."
    ${!enabled ? 'disabled' : ''}
  />
  <div class="reflection-counter">
    <span id="evidenceCounter">0/20</span> min chars
  </div>
</div>

<div class="reflection-bullet">
  <label>
    <span class="label-icon">🛡️</span>
    Prevention: How to prevent this?
  </label>
  <input 
    type="text" 
    id="reflectionPrevention" 
    class="reflection-input"
    placeholder="What security controls would prevent this attack..."
    ${!enabled ? 'disabled' : ''}
  />
  <div class="reflection-counter">
    <span id="preventionCounter">0/20</span> min chars
  </div>
</div>

<div class="reflection-bullet">
  <label>
    <span class="label-icon">🔔</span>
    Detection: How to detect this attack?
  </label>
  <input 
    type="text" 
    id="reflectionDetection" 
    class="reflection-input"
    placeholder="What monitoring/logging would detect this attack..."
    ${!enabled ? 'disabled' : ''}
  />
  <div class="reflection-counter">
    <span id="detectionCounter">0/20</span> min chars
  </div>
</div>

<div id="reflectionFeedback"></div>
<button 
  id="submitReflection" 
  class="submit-btn reflect"
  onclick="submitReflection()"
  ${!enabled ? 'disabled' : ''}
>
  Submit Reflection
</button>
</div>
`;
}

// Update exercise sidebar with validation components
async function updateExerciseSidebarWithValidation(exerciseId) {
  const sidebar = document.getElementById('exerciseSidebar');
  const exercise = currentScenario.exercises.find((e) => e.id === exerciseId);

  if (!exercise) {
    console.error('Exercise not found:', exerciseId);
    return;
  }

  // Load completed challenges from database FIRST
  await loadCompletedChallenges(currentScenario.id);

  // Insert validation status at the top (only once)
  const progressBar = sidebar.querySelector('.progress-bar-container');
  if (progressBar && !sidebar.querySelector('.validation-status-bar')) {
    progressBar.insertAdjacentHTML(
      'afterend',
      renderValidationStatus(currentValidationStatus)
    );
  }

  // Add challenge tracker (only once)
  const exerciseList = sidebar.querySelector('.exercise-list');
  if (exerciseList && !sidebar.querySelector('.challenge-tracker')) {
    // IMPORTANT: Pass the exercise object so we can access challenges
    exerciseList.insertAdjacentHTML('beforebegin', renderChallengeTracker(exercise));
    exerciseList.insertAdjacentHTML('beforebegin', renderMitigationSection(false));
    exerciseList.insertAdjacentHTML('beforebegin', renderReflectionSection(false));
  } else if (sidebar.querySelector('.challenge-tracker')) {
    // Update existing challenge tracker when switching exercises
    const existingTracker = sidebar.querySelector('.challenge-tracker');
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = renderChallengeTracker(exercise);
    existingTracker.parentNode.replaceChild(tempDiv.firstElementChild, existingTracker);
  }

  // Load current validation status
  await loadExerciseValidationStatus(currentScenario.id, exerciseId);

  // Setup character counters
  setupReflectionCounters();
}

// Load validation status from API
async function loadExerciseValidationStatus(scenarioId, exerciseId) {
  try {
    const response = await fetch(
      `${API_URL}/exercise/${scenarioId}/${exerciseId}/status?userId=${userId}`
    );
    const status = await response.json();

    currentValidationStatus = status;

    // Update the entire validation status bar
    const existingBar = document.querySelector('.validation-status-bar');
    if (existingBar) {
      const newStatusHtml = renderValidationStatus(status);
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = newStatusHtml;
      existingBar.parentNode.replaceChild(tempDiv.firstElementChild, existingBar);
    }

    // Enable/disable mitigation section based on challenge completion
    const mitigationNote = document.getElementById('mitigationNote');
    const submitMitigation = document.getElementById('submitMitigation');

    if (mitigationNote && submitMitigation) {
      mitigationNote.disabled = !status.challenges.valid;
      submitMitigation.disabled = !status.challenges.valid;
    }

    // Enable/disable reflection section based on mitigation validation
    const mitigationValid = status.mitigation.valid;
    const reflectionEvidence = document.getElementById('reflectionEvidence');
    const reflectionPrevention = document.getElementById('reflectionPrevention');
    const reflectionDetection = document.getElementById('reflectionDetection');
    const submitReflection = document.getElementById('submitReflection');

    if (
      reflectionEvidence &&
      reflectionPrevention &&
      reflectionDetection &&
      submitReflection
    ) {
      reflectionEvidence.disabled = !mitigationValid;
      reflectionPrevention.disabled = !mitigationValid;
      reflectionDetection.disabled = !mitigationValid;
      submitReflection.disabled = !mitigationValid;
    }

    // Populate existing data
    if (status.mitigation.note && mitigationNote) {
      mitigationNote.value = status.mitigation.note;
    }

    if (status.reflection.bullets) {
      if (reflectionEvidence)
        reflectionEvidence.value = status.reflection.bullets.evidence || '';
      if (reflectionPrevention)
        reflectionPrevention.value = status.reflection.bullets.prevention || '';
      if (reflectionDetection)
        reflectionDetection.value = status.reflection.bullets.detection || '';
    }

    // Update challenge count
    const challengeCount = document.getElementById('challengeCount');
    if (challengeCount) {
      challengeCount.textContent = `${status.challenges.completed}/${status.challenges.required}`;
    }

    // DON'T re-render the challenge list here - it causes checkboxes to reset
    // The challenge list should only be rendered once when switching exercises
  } catch (error) {
    console.error('Failed to load validation status:', error);
    // Show default status on error
    currentValidationStatus = {
      challenges: { valid: false, count: 0, completed: 0, required: 3 },
      mitigation: { valid: false, submitted: false },
      reflection: { valid: false, submitted: false },
      canComplete: false,
    };
  }
}

async function loadCompletedChallenges(scenarioId) {
  try {
    const response = await fetch(
      `${API_URL}/challenges/completed/${scenarioId}?userId=${userId}`
    );
    const data = await response.json();

    if (data.success && data.challenges) {
      // Clear and repopulate the set
      completedChallenges.clear();
      data.challenges.forEach((challenge) => {
        completedChallenges.add(challenge.challenge_id);
      });

      console.log(`Loaded ${data.count} completed challenges from database`);
    }
  } catch (error) {
    console.error('Failed to load completed challenges:', error);
  }
}

// Submit mitigation note
async function submitMitigation() {
  const note = document.getElementById('mitigationNote').value;
  const feedback = document.getElementById('mitigationFeedback');
  const submitBtn = document.getElementById('submitMitigation');

  if (!note.trim()) {
    showValidationFeedback(feedback, false, 'Please write a mitigation note');
    return;
  }

  // Show loading state
  submitBtn.disabled = true;
  submitBtn.textContent = '🤖 AI is reviewing your mitigation...';
  feedback.innerHTML =
    '<div style="text-align: center; color: #666;">Professor Cedrik is analyzing your defensive strategy...</div>';
  feedback.style.display = 'block';

  try {
    const response = await fetch(`${API_URL}/mitigation/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        scenarioId: currentScenario.id,
        exerciseId: currentExerciseId,
        note,
      }),
    });

    const data = await response.json();

    if (data.validation.valid) {
      // Success - show detailed feedback
      feedback.className = 'validation-feedback success';
      feedback.innerHTML = `
  <div style="font-weight: bold; margin-bottom: 10px;">
    ✅ Mitigation Validated! (Score: ${data.validation.score}/100)
  </div>
  <div style="margin-bottom: 10px;">
    ${data.validation.message}
  </div>
  ${
    data.validation.suggestions && data.validation.suggestions.length > 0
      ? `
    <div style="margin-top: 10px; padding: 10px; background: #d1fae5; border-radius: 5px;">
      <strong>💡 Additional Tips:</strong>
      <ul style="margin: 5px 0 0 20px; padding: 0;">
        ${data.validation.suggestions.map((s) => `<li>${s}</li>`).join('')}
      </ul>
    </div>
  `
      : ''
  }
`;

      // Enable reflection section
      document.getElementById('reflectionEvidence').disabled = false;
      document.getElementById('reflectionPrevention').disabled = false;
      document.getElementById('reflectionDetection').disabled = false;
      document.getElementById('submitReflection').disabled = false;

      // Highlight the unlocked section
      const reflectionSection = document.querySelector('.reflection-section');
      if (reflectionSection) {
        reflectionSection.style.animation = 'pulse 0.5s ease-in-out 2';
        reflectionSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }

      // Show success message in chat
      const successMsg = {
        agents: [
          {
            agent: { name: 'Professor Cedrik', emoji: '👨‍🏫', specialty: 'Validation' },
            response:
              `**Excellent work!** Your mitigation strategy has been validated.\n\n` +
              `**Score:** ${data.validation.score}/100\n\n` +
              `**Feedback:** ${data.validation.message}\n\n` +
              `You can now proceed to the reflection section! 🎉`,
          },
        ],
      };
      addAgentResponses(successMsg.agents);
    } else {
      // Failed validation - show specific feedback
      feedback.className = 'validation-feedback error';
      feedback.innerHTML = `
  <div style="font-weight: bold; margin-bottom: 10px;">
    ❌ Mitigation Needs Improvement (Score: ${data.validation.score}/100)
  </div>
  <div style="margin-bottom: 10px;">
    ${data.validation.message}
  </div>
  ${
    data.validation.suggestions && data.validation.suggestions.length > 0
      ? `
    <div style="margin-top: 10px; padding: 10px; background: #fef3c7; border-radius: 5px;">
      <strong>📝 Suggestions to improve:</strong>
      <ul style="margin: 5px 0 0 20px; padding: 0;">
        ${data.validation.suggestions.map((s) => `<li>${s}</li>`).join('')}
      </ul>
    </div>
  `
      : ''
  }
  <div style="margin-top: 10px; font-size: 0.85rem; color: #666;">
    💡 Need help? Ask the AI assistants for guidance on defensive techniques!
  </div>
`;

      // Show feedback in chat
      const feedbackMsg = {
        agents: [
          {
            agent: { name: 'Professor Cedrik', emoji: '👨‍🏫', specialty: 'Validation' },
            response:
              `**Mitigation Review:**\n\nScore: ${data.validation.score}/100\n\n` +
              `${data.validation.message}\n\n` +
              (data.validation.suggestions
                ? `**To improve:**\n${data.validation.suggestions
                    .map((s, i) => `${i + 1}. ${s}`)
                    .join('\n')}`
                : '') +
              `\n\nFeel free to ask me for specific guidance on how to strengthen your mitigation strategy!`,
          },
        ],
      };
      addAgentResponses(feedbackMsg.agents);
    }

    await loadExerciseValidationStatus(currentScenario.id, currentExerciseId);
  } catch (error) {
    console.error('Error validating mitigation:', error);
    showValidationFeedback(
      feedback,
      false,
      'Error validating mitigation note. Please try again.'
    );
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Validate Mitigation Note';
  }
}

// Submit reflection
async function submitReflection() {
  const evidence = document.getElementById('reflectionEvidence').value;
  const prevention = document.getElementById('reflectionPrevention').value;
  const detection = document.getElementById('reflectionDetection').value;
  const feedback = document.getElementById('reflectionFeedback');
  const submitBtn = document.getElementById('submitReflection');

  const reflection = {
    bullets: [
      { type: 'evidence', content: evidence },
      { type: 'prevention', content: prevention },
      { type: 'detection', content: detection },
    ],
  };

  // Show loading state
  submitBtn.disabled = true;
  submitBtn.textContent = '🤖 AI is reviewing your reflection...';
  feedback.innerHTML =
    '<div style="text-align: center; color: #666;">Professor Cedrik is analyzing your learning reflection...</div>';
  feedback.style.display = 'block';

  try {
    const response = await fetch(`${API_URL}/reflection/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        scenarioId: currentScenario.id,
        exerciseId: currentExerciseId,
        reflection,
      }),
    });

    const data = await response.json();

    if (data.validation.valid) {
      // Success - show detailed feedback
      feedback.className = 'validation-feedback success';
      feedback.innerHTML = `
  <div style="font-weight: bold; margin-bottom: 10px;">
    ✅ Reflection Complete! (Score: ${data.validation.score}/100)
  </div>
  <div style="margin-bottom: 10px;">
    ${data.validation.message}
  </div>
  ${
    data.validation.componentFeedback
      ? `
    <div style="margin-top: 10px; padding: 10px; background: #d1fae5; border-radius: 5px; font-size: 0.9rem;">
      <strong>Component Breakdown:</strong>
      <ul style="margin: 5px 0 0 20px; padding: 0;">
        <li><strong>Evidence:</strong> ${
          data.validation.componentFeedback.evidence || 'Good'
        } ${data.validation.evidenceValid ? '✅' : '⚠️'}</li>
        <li><strong>Prevention:</strong> ${
          data.validation.componentFeedback.prevention || 'Good'
        } ${data.validation.preventionValid ? '✅' : '⚠️'}</li>
        <li><strong>Detection:</strong> ${
          data.validation.componentFeedback.detection || 'Good'
        } ${data.validation.detectionValid ? '✅' : '⚠️'}</li>
      </ul>
    </div>
  `
      : ''
  }
`;

      // Enable complete button
      const completeBtn = document.getElementById(`completeBtn-${currentExerciseId}`);
      if (completeBtn) {
        completeBtn.disabled = false;
        completeBtn.textContent = 'Mark as Complete ✅';
        completeBtn.style.animation = 'pulse 0.5s ease-in-out 3';
      }

      // Show success message in chat
      const successMsg = {
        agents: [
          {
            agent: { name: 'Professor Cedrik', emoji: '👨‍🏫', specialty: 'Validation' },
            response:
              `**Outstanding reflection!** You've demonstrated solid understanding.\n\n` +
              `**Score:** ${data.validation.score}/100\n\n` +
              `All validation requirements are complete! You can now mark this exercise as finished and move to the next one. 🎉`,
          },
        ],
      };
      addAgentResponses(successMsg.agents);
    } else {
      // Failed validation - show component-specific feedback
      feedback.className = 'validation-feedback error';
      feedback.innerHTML = `
  <div style="font-weight: bold; margin-bottom: 10px;">
    ❌ Reflection Needs Improvement (Score: ${data.validation.score}/100)
  </div>
  <div style="margin-bottom: 10px;">
    ${data.validation.message}
  </div>
  ${
    data.validation.componentFeedback
      ? `
    <div style="margin-top: 10px; padding: 10px; background: #fef3c7; border-radius: 5px; font-size: 0.9rem;">
      <strong>Component Feedback:</strong>
      <ul style="margin: 5px 0 0 20px; padding: 0;">
        <li style="${
          data.validation.evidenceValid ? 'color: #059669;' : 'color: #dc2626;'
        }">
          <strong>Evidence:</strong> ${data.validation.componentFeedback.evidence} ${
          data.validation.evidenceValid ? '✅' : '❌'
        }
        </li>
        <li style="${
          data.validation.preventionValid ? 'color: #059669;' : 'color: #dc2626;'
        }">
          <strong>Prevention:</strong> ${data.validation.componentFeedback.prevention} ${
          data.validation.preventionValid ? '✅' : '❌'
        }
        </li>
        <li style="${
          data.validation.detectionValid ? 'color: #059669;' : 'color: #dc2626;'
        }">
          <strong>Detection:</strong> ${data.validation.componentFeedback.detection} ${
          data.validation.detectionValid ? '✅' : '❌'
        }
        </li>
      </ul>
    </div>
  `
      : ''
  }
  <div style="margin-top: 10px; font-size: 0.85rem; color: #666;">
    💡 Ask the AI team for specific examples if you're stuck!
  </div>
`;

      // Show feedback in chat
      const feedbackMsg = {
        agents: [
          {
            agent: { name: 'Professor Cedrik', emoji: '👨‍🏫', specialty: 'Validation' },
            response:
              `**Reflection Review:**\n\nScore: ${data.validation.score}/100\n\n` +
              `${data.validation.message}\n\n` +
              (data.validation.componentFeedback
                ? `**Component Breakdown:**\n` +
                  `• Evidence: ${data.validation.componentFeedback.evidence}\n` +
                  `• Prevention: ${data.validation.componentFeedback.prevention}\n` +
                  `• Detection: ${data.validation.componentFeedback.detection}\n\n`
                : '') +
              `Don't worry - this is a learning process! Ask me specific questions about what's missing.`,
          },
        ],
      };
      addAgentResponses(feedbackMsg.agents);
    }

    await loadExerciseValidationStatus(currentScenario.id, currentExerciseId);
  } catch (error) {
    console.error('Error submitting reflection:', error);
    showValidationFeedback(
      feedback,
      false,
      'Error submitting reflection. Please try again.'
    );
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Submit Reflection';
  }
}

// Show validation feedback
function showValidationFeedback(element, isValid, message) {
  element.className = `validation-feedback ${isValid ? 'success' : 'error'}`;
  element.innerHTML = message;
  element.style.display = 'block';
}

// Setup character counters
function setupReflectionCounters() {
  ['Evidence', 'Prevention', 'Detection'].forEach((type) => {
    const input = document.getElementById(`reflection${type}`);
    const counter = document.getElementById(`${type.toLowerCase()}Counter`);

    if (input && counter) {
      input.addEventListener('input', () => {
        const length = input.value.length;
        counter.textContent = `${length}/20 min chars`;
        counter.style.color = length >= 20 ? '#10b981' : '#ef4444';
      });
    }
  });
}

// Mark challenge complete (NEW)
async function markChallengeComplete(challengeId, challengeName) {
  // Prevent duplicate submissions
  if (completedChallenges.has(challengeId)) {
    console.log('Challenge already completed:', challengeId);
    return;
  }

  try {
    const response = await fetch(`${API_URL}/challenges/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        scenarioId: currentScenario.id,
        challengeId,
        evidence: {
          name: challengeName,
          timestamp: new Date().toISOString(),
          exerciseId: currentExerciseId,
        },
      }),
    });

    const data = await response.json();

    if (data.success) {
      // Add to completed set to persist checkbox state
      completedChallenges.add(challengeId);

      // Update challenge count
      const challengeCount = document.getElementById('challengeCount');
      if (challengeCount) {
        const total = Math.max(
          EXERCISE_REQUIREMENTS.MIN_CHALLENGES,
          data.completionCount
        );
        challengeCount.textContent = `${data.completionCount}/${total}`;

        // Animate the counter
        challengeCount.style.transform = 'scale(1.3)';
        challengeCount.style.color = '#10b981';
        setTimeout(() => {
          challengeCount.style.transform = 'scale(1)';
          challengeCount.style.color = '#3b82f6';
        }, 300);
      }

      // Show success message
      const chatMessages = document.getElementById('chatMessages');
      if (chatMessages) {
        const successMsg = {
          agents: [
            {
              agent: { name: 'System', emoji: '✅', specialty: 'Progress Tracker' },
              response:
                `**Challenge completed!** "${challengeName}"\n\n` +
                `Progress: ${data.completionCount}/${EXERCISE_REQUIREMENTS.MIN_CHALLENGES} challenges\n\n` +
                (data.canProceed
                  ? '🎉 **Milestone unlocked!** You can now write your mitigation note.'
                  : `Keep going! ${
                      EXERCISE_REQUIREMENTS.MIN_CHALLENGES - data.completionCount
                    } more to unlock mitigation writing.`),
            },
          ],
        };
        addAgentResponses(successMsg.agents);
      }

      // Enable mitigation section if enough challenges completed
      if (data.canProceed) {
        const mitigationNote = document.getElementById('mitigationNote');
        const submitMitigation = document.getElementById('submitMitigation');

        if (mitigationNote && submitMitigation) {
          mitigationNote.disabled = false;
          submitMitigation.disabled = false;

          // Highlight the newly unlocked section
          const mitigationSection = document.querySelector('.mitigation-section');
          if (mitigationSection) {
            mitigationSection.style.animation = 'pulse 0.5s ease-in-out 2';
            mitigationSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        }
      }

      // Update validation status (but don't re-render challenge list)
      await loadExerciseValidationStatus(currentScenario.id, currentExerciseId);
    } else {
      alert('Failed to mark challenge complete. Please try again.');
    }
  } catch (error) {
    console.error('Error marking challenge complete:', error);
    alert('Error saving progress. Check console for details.');
  }
}

// async function loadUserProgress() {
//   try {
//     const response = await fetch(`${API_URL}/users/${userId}/progress`)
//     const data = await response.json()

//     const completed = data.progress.filter(p => p.completed).length
//     document.getElementById("completedExercises").textContent = completed
//   } catch (error) {
//     console.error("Failed to load progress:", error)
//   }
// }

init();

// Global exports for inline HTML
window.startScenario = startScenario;
window.closeModal = closeModal;
window.toggleFullscreen = toggleFullscreen;
window.sendMessage = sendMessage;
window.closeKnowledgeModal = closeKnowledgeModal;
window.searchKnowledge = searchKnowledge;
window.filterCategory = filterCategory;
window.manualChallengeComplete = manualChallengeComplete;
window.handleChallengeCheckbox = handleChallengeCheckbox;
window.submitMitigation = submitMitigation;
window.submitReflection = submitReflection;
