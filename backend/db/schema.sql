CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE workflows (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,  -- link workflows to users
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE tasks (      -- each row of this table is one task execution of a workflow
    id SERIAL PRIMARY KEY,    
    workflow_id INTEGER REFERENCES workflows(id) ON DELETE CASCADE,  -- links this task to a workflow. if workflow is deleted, so are its tasks.
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,   -- links this task to the user who created it. if user is deleted, so are their tasks.
    task_type VARCHAR(50) NOT NULL, -- 'http', 'file', 'data', 'email'
    task_name VARCHAR(255) NOT NULL,    -- Human-readable name of the task for UI e.g "Fetch GitHub Repo Data", "Compress Uploaded File", "Send Welcome Email"
    config JSONB NOT NULL, -- Task-specific configuration e.g for http task,  {"method": "GET", "url": "https://api.github.com/users/octocat", "headers": {"Authorization": "Bearer xyz"}}. For email task, {"to": "user@gmail.com", "subject": "Welcome!", "body": "Thanks for signing up"}
    status VARCHAR(50) DEFAULT 'pending', -- 'queued' (waiting to be picked up by worker), 'running', 'success', 'failed'. current status of task.
    result JSONB, -- Task execution result   e.g for http task, {"status_code": 200, "body": "..."}. For file task, {"file_path": "/files/compressed.zip"}. For email task, {"sent": true}.
    error_message TEXT, -- Error details if failed e.g "Timeout after 10 seconds", "SMTP authentication failed"
    retry_count INTEGER DEFAULT 0,  -- amount of times task was retried
    max_retries INTEGER DEFAULT 3, -- max allowed retries
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    priority INTEGER DEFAULT 10,
    scheduled_for TIMESTAMP
);

-- Indexes for faster queries. instead of checking every row in the table (slow), u jump directly to the matching rows (fast).
CREATE INDEX IF NOT EXISTS idx_tasks_workflow ON tasks(workflow_id);   -- suppose, u r using SELECT * FROM tasks WHERE workflow_id = 7. Without index, db checks every row to find matching workflow_id (slow). With index, db jumps directly to rows with workflow_id = 7 (fast).
CREATE INDEX IF NOT EXISTS idx_tasks_user ON tasks(user_id);   -- SELECT * FROM tasks WHERE user_id = 12. Might be needed for 'My tasks' dashboard.
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status); -- Used by workers: SELECT * FROM tasks WHERE status = 'pending' LIMIT 10. Without index, worker scans entire table. With index, worker instantly finds pending tasks.
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_scheduled ON tasks(scheduled_for);

