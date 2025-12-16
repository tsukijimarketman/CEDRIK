import axios from "axios";

// CEDRIK Labs API base URL (adjust based on your deployment)
const LABS_API_BASE_URL = import.meta.env.VITE_LABS_URL || "http://localhost:3000/api";

const labsApi = axios.create({
  baseURL: LABS_API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// ===== TYPE DECLARATIONS =====

export type LabScenario = {
  id: string;
  name: string;
  description: string;
  difficulty: string;
  estimated_time: string;
  skills: string[];
  exercise_count: number;
  target: string;
  external_url: string;
};

export type LabExercise = {
  id: number;
  title: string;
  description: string;
  objectives: string[];
  hints: string[];
  challenges: LabChallenge[];
};

export type LabChallenge = {
  id: string;
  name: string;
};

export type ChallengeCompletion = {
  challenge_id: string;
  evidence: {
    name: string;
    timestamp: string;
    exerciseId: number;
  };
  completed_at: string;
};

export type MitigationNote = {
  note: string;
  is_valid: boolean;
  validated_at: string;
  validation?: {
    valid: boolean;
    score: number;
    message: string;
    suggestions: string[];
  };
};

export type Reflection = {
  evidence: string;
  prevention: string;
  detection: string;
  is_complete: boolean;
  submitted_at: string;
  validation?: {
    valid: boolean;
    score: number;
    message: string;
    componentFeedback: {
      evidence: string;
      prevention: string;
      detection: string;
    };
    evidenceValid: boolean;
    preventionValid: boolean;
    detectionValid: boolean;
  };
};

export type ExerciseProgress = {
  exercise_id: number;
  completed: boolean;
  started_at: string;
  completed_at: string | null;
  attempts: number;
  hints_used: number;
};

export type ExerciseValidationStatus = {
  challenges: {
    completed: number;
    required: number;
    valid: boolean;
  };
  mitigation: {
    submitted: boolean;
    valid: boolean;
    note: string | null;
  };
  reflection: {
    submitted: boolean;
    valid: boolean;
    bullets: {
      evidence: string;
      prevention: string;
      detection: string;
    } | null;
  };
  canComplete: boolean;
};

export type UserLabProgress = {
  userId: string;
  scenarioId: string;
  exercises: ExerciseProgress[];
  totalExercises: number;
  completedExercises: number;
  overallProgress: number;
};

export type ScenarioGrades = {
  scenarioId: string;
  scenarioName: string;
  exercises: {
    exerciseId: number;
    exerciseTitle: string;
    challengesCompleted: number;
    challengesRequired: number;
    mitigationScore: number | null;
    reflectionScore: number | null;
    overallScore: number | null;
    completed: boolean;
  }[];
  averageScore: number;
  completionRate: number;
};

export type UserAllGrades = {
  userId: string;
  username: string;
  scenarios: ScenarioGrades[];
  overallAverage: number;
  totalExercisesCompleted: number;
  totalExercisesAvailable: number;
};

// ===== API IMPLEMENTATIONS =====

export const cedrikLabsApi = {
  // Get all available scenarios
  getScenarios: async () => {
    return labsApi.get<{ scenarios: LabScenario[] }>("/scenarios");
  },

  // Get specific scenario details
  getScenario: async (scenarioId: string) => {
    return labsApi.get<LabScenario>(`/scenarios/${scenarioId}`);
  },

  // Start a scenario for a user
  startScenario: async (scenarioId: string, userId: string, username: string) => {
    return labsApi.post(`/scenarios/${scenarioId}/start`, {
      userId,
      username, // Send username for display purposes
    });
  },

  // Get user's progress for a specific scenario
  getUserProgress: async (userId: string, scenarioId?: string) => {
    const params = scenarioId ? { scenarioId } : {};
    return labsApi.get<{ progress: ExerciseProgress[] }>(`/users/${userId}/progress`, {
      params,
    });
  },

  // Get validation status for an exercise
  getExerciseStatus: async (scenarioId: string, exerciseId: number, userId: string) => {
    return labsApi.get<ExerciseValidationStatus>(
      `/exercise/${scenarioId}/${exerciseId}/status`,
      {
        params: { userId },
      }
    );
  },

  // Get completed challenges
  getCompletedChallenges: async (scenarioId: string, userId: string) => {
    return labsApi.get<{
      success: boolean;
      challenges: ChallengeCompletion[];
      count: number;
    }>(`/challenges/completed/${scenarioId}`, {
      params: { userId },
    });
  },

  // Submit challenge completion
  submitChallenge: async (
    userId: string,
    scenarioId: string,
    challengeId: string,
    evidence: { name: string; timestamp: string; exerciseId: number }
  ) => {
    return labsApi.post("/challenges/complete", {
      userId,
      scenarioId,
      challengeId,
      evidence,
    });
  },

  // Submit mitigation note for validation
  submitMitigation: async (
    userId: string,
    scenarioId: string,
    exerciseId: number,
    note: string
  ) => {
    return labsApi.post<{
      success: boolean;
      validation: {
        valid: boolean;
        score: number;
        message: string;
        suggestions: string[];
      };
      canProceed: boolean;
    }>("/mitigation/submit", {
      userId,
      scenarioId,
      exerciseId,
      note,
    });
  },

  // Submit reflection
  submitReflection: async (
    userId: string,
    scenarioId: string,
    exerciseId: number,
    reflection: {
      bullets: Array<{ type: string; content: string }>;
    }
  ) => {
    return labsApi.post<{
      success: boolean;
      validation: {
        valid: boolean;
        score: number;
        message: string;
        componentFeedback: {
          evidence: string;
          prevention: string;
          detection: string;
        };
        evidenceValid: boolean;
        preventionValid: boolean;
        detectionValid: boolean;
      };
      canProceedToNext: boolean;
    }>("/reflection/submit", {
      userId,
      scenarioId,
      exerciseId,
      reflection,
    });
  },

  // Mark exercise as complete
  completeExercise: async (userId: string, scenarioId: string, exerciseId: number) => {
    return labsApi.post("/progress/complete", {
      userId,
      scenarioId,
      exerciseId,
    });
  },

  // ===== NEW: GRADES API =====

  // Get all grades for a specific user across all scenarios
  getUserGrades: async (userId: string, username: string) => {
    return labsApi.get<UserAllGrades>(`/grades/user/${userId}`, {
      params: { username },
    });
  },

  // Get grades for a specific scenario
  getScenarioGrades: async (userId: string, scenarioId: string) => {
    return labsApi.get<ScenarioGrades>(`/grades/user/${userId}/scenario/${scenarioId}`);
  },

  // Get overall lab progress summary
  getLabSummary: async (userId: string) => {
    return labsApi.get<{
      totalScenarios: number;
      scenariosStarted: number;
      scenariosCompleted: number;
      totalExercises: number;
      exercisesCompleted: number;
      overallCompletionRate: number;
      averageScore: number;
    }>(`/grades/user/${userId}/summary`);
  },

  // ===== ADMIN: Get all users' grades =====
  getAllUsersGrades: async () => {
    return labsApi.get<{
      users: Array<{
        userId: string;
        username: string;
        overallAverage: number;
        totalCompleted: number;
        lastActivity: string;
      }>;
    }>("/grades/all");
  },
};

// Error handling interceptor
labsApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 404) {
      console.error("Labs API: Resource not found");
    } else if (error.response?.status === 500) {
      console.error("Labs API: Server error");
    }

    if (error.response) {
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
);

export default cedrikLabsApi;