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

-- Add score column to mitigation_notes if it doesn't exist
ALTER TABLE mitigation_notes ADD COLUMN IF NOT EXISTS score INTEGER;

-- Add score column to reflections if it doesn't exist
ALTER TABLE reflections ADD COLUMN IF NOT EXISTS score INTEGER;

-- Create index for faster grade queries
CREATE INDEX IF NOT EXISTS idx_mitigation_notes_user_score 
ON mitigation_notes(user_id, scenario_id, exercise_id, score);

CREATE INDEX IF NOT EXISTS idx_reflections_user_score 
ON reflections(user_id, scenario_id, exercise_id, score);

CREATE INDEX IF NOT EXISTS idx_user_progress_completed 
ON user_progress(user_id, scenario_id, completed);
