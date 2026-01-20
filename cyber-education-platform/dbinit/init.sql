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

-- User container assignments
-- ✅ FIXED: Removed UNIQUE constraints on vnc_port and novnc_port
CREATE TABLE IF NOT EXISTS user_containers (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL UNIQUE,
    username VARCHAR(255),
    container_id VARCHAR(100) NOT NULL UNIQUE,
    container_name VARCHAR(255) NOT NULL,
    vnc_port INTEGER NOT NULL,         -- Host port (e.g., 15901, 15902)
    novnc_port INTEGER NOT NULL,       -- Host port (e.g., 16080, 16081)
    status VARCHAR(50) DEFAULT 'running',
    current_scenario_id VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    stopped_at TIMESTAMP
);

-- Port allocations
CREATE TABLE IF NOT EXISTS port_allocations (
    port INTEGER PRIMARY KEY,
    port_type VARCHAR(20) NOT NULL,
    is_available BOOLEAN DEFAULT TRUE,
    allocated_to VARCHAR(100),
    allocated_at TIMESTAMP
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

CREATE INDEX IF NOT EXISTS idx_user_containers_user ON user_containers(user_id);
CREATE INDEX IF NOT EXISTS idx_user_containers_status ON user_containers(status);
CREATE INDEX IF NOT EXISTS idx_user_containers_activity ON user_containers(last_activity);
CREATE INDEX IF NOT EXISTS idx_user_containers_scenario ON user_containers(current_scenario_id);

-- Add score columns if they don't exist
ALTER TABLE mitigation_notes ADD COLUMN IF NOT EXISTS score INTEGER;
ALTER TABLE reflections ADD COLUMN IF NOT EXISTS score INTEGER;

-- Create index for faster grade queries
CREATE INDEX IF NOT EXISTS idx_mitigation_notes_user_score 
ON mitigation_notes(user_id, scenario_id, exercise_id, score);

CREATE INDEX IF NOT EXISTS idx_reflections_user_score 
ON reflections(user_id, scenario_id, exercise_id, score);

CREATE INDEX IF NOT EXISTS idx_user_progress_completed 
ON user_progress(user_id, scenario_id, completed);

-- Function to update user progress
CREATE OR REPLACE FUNCTION update_user_progress(
    p_user_id user_progress.user_id%TYPE,
    p_scenario_id user_progress.scenario_id%TYPE,
    p_exercise_id user_progress.exercise_id%TYPE
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM user_progress up
        WHERE up.user_id = p_user_id
          AND up.scenario_id = p_scenario_id
          AND up.exercise_id = p_exercise_id
    ) THEN
        INSERT INTO user_progress (
            user_id, scenario_id, exercise_id, completed, completed_at
        )
        VALUES (p_user_id, p_scenario_id, p_exercise_id, TRUE, CURRENT_TIMESTAMP);
    ELSE
        UPDATE user_progress
        SET completed = TRUE,
            completed_at = CURRENT_TIMESTAMP
        WHERE user_id = p_user_id
          AND scenario_id = p_scenario_id
          AND exercise_id = p_exercise_id;
    END IF;
END;
$$;

-- ✅ CRITICAL: Use HOST port ranges that don't conflict with container internal ports
-- Container uses internally: 5901 (VNC), 6080 (noVNC)
-- Host will map to: 15901+ (VNC), 16080+ (noVNC)

-- Pre-populate VNC HOST ports (15901-15920)
DO $$
DECLARE
    port_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO port_count FROM port_allocations;
    
    -- Only populate if table is empty
    IF port_count = 0 THEN
        -- VNC HOST ports: 15901-15920 (maps to container's 5901)
        FOR i IN 15901..15920 LOOP
            INSERT INTO port_allocations (port, port_type, is_available)
            VALUES (i, 'vnc', TRUE);
        END LOOP;
        
        -- NoVNC HOST ports: 16080-16099 (maps to container's 6080)
        FOR i IN 16080..16099 LOOP
            INSERT INTO port_allocations (port, port_type, is_available)
            VALUES (i, 'novnc', TRUE);
        END LOOP;
        
        RAISE NOTICE 'Port allocations initialized: VNC (15901-15920), noVNC (16080-16099)';
    ELSE
        RAISE NOTICE 'Port allocations already exist, skipping initialization';
    END IF;
END
$$;
