-- ============================================================
-- TASK MANAGEMENT SYSTEM
-- MySQL Relational Database Design
-- ============================================================
--
-- Purpose:
--   Relational equivalent of the application's MongoDB Users
--   and Tasks collections.
--
-- Notes:
--   - MongoDB is the application's mandatory database.
--   - This MySQL schema is provided for the assignment's
--     relational database design / SQL deliverable.
--   - Password values represent bcrypt/bcryptjs hashes in the
--     application. Replace sample values before using real data.
-- ============================================================

CREATE DATABASE IF NOT EXISTS task_management_system
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE task_management_system;

-- ============================================================
-- USERS
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    name VARCHAR(100) NOT NULL,

    email VARCHAR(255) NOT NULL,

    password VARCHAR(255) NOT NULL,

    role ENUM('admin', 'user') NOT NULL DEFAULT 'user',

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT uq_users_email
        UNIQUE (email),

    INDEX idx_users_role (role)
) ENGINE=InnoDB;


-- ============================================================
-- TASKS
-- ============================================================

CREATE TABLE IF NOT EXISTS tasks (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    title VARCHAR(100) NOT NULL,

    description TEXT NULL,

    priority ENUM('high', 'medium', 'low')
        NOT NULL DEFAULT 'medium',

    status ENUM('pending', 'in_progress', 'completed')
        NOT NULL DEFAULT 'pending',

    due_date DATETIME NOT NULL,

    assigned_to INT UNSIGNED NOT NULL,

    created_by INT UNSIGNED NOT NULL,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_tasks_assigned_to
        FOREIGN KEY (assigned_to)
        REFERENCES users(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT fk_tasks_created_by
        FOREIGN KEY (created_by)
        REFERENCES users(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    INDEX idx_tasks_assigned_to (assigned_to),

    INDEX idx_tasks_created_by (created_by),

    INDEX idx_tasks_status (status),

    INDEX idx_tasks_priority (priority),

    INDEX idx_tasks_due_date (due_date),

    INDEX idx_tasks_assigned_status_due_date
        (assigned_to, status, due_date),

    INDEX idx_tasks_status_due_date
        (status, due_date)
) ENGINE=InnoDB;


-- ============================================================
-- OPTIONAL SAMPLE DATA
-- ============================================================
-- These records are examples only.
-- Replace the password values with real bcrypt/bcryptjs hashes
-- before using them in an application.
--
-- The IDs below are generated automatically. The sample task
-- inserts therefore use variables instead of assuming fixed IDs.

INSERT INTO users (name, email, password, role)
VALUES
(
    'Admin User',
    'admin@example.com',
    '$2b$10$examplehashedpassword',
    'admin'
),
(
    'John Doe',
    'john@example.com',
    '$2b$10$examplehashedpassword',
    'user'
),
(
    'Jane Doe',
    'jane@example.com',
    '$2b$10$examplehashedpassword',
    'user'
)
ON DUPLICATE KEY UPDATE
    name = VALUES(name);


SET @admin_id = (
    SELECT id
    FROM users
    WHERE email = 'admin@example.com'
    LIMIT 1
);

SET @john_id = (
    SELECT id
    FROM users
    WHERE email = 'john@example.com'
    LIMIT 1
);

SET @jane_id = (
    SELECT id
    FROM users
    WHERE email = 'jane@example.com'
    LIMIT 1
);


INSERT INTO tasks
(
    title,
    description,
    priority,
    status,
    due_date,
    assigned_to,
    created_by
)
VALUES
(
    'Complete Dashboard',
    'Implement task statistics and upcoming tasks.',
    'high',
    'in_progress',
    '2026-09-01 18:00:00',
    @john_id,
    @admin_id
),
(
    'Test Authentication',
    'Verify registration, login and JWT authentication.',
    'medium',
    'pending',
    '2026-09-03 18:00:00',
    @john_id,
    @admin_id
),
(
    'Prepare Documentation',
    'Prepare API and database documentation.',
    'low',
    'pending',
    '2026-09-05 18:00:00',
    @jane_id,
    @admin_id
);


-- ============================================================
-- COMMON QUERIES
-- ============================================================

-- View all users
SELECT
    id,
    name,
    email,
    role,
    created_at,
    updated_at
FROM users
ORDER BY created_at DESC;


-- View normal users available for task assignment
SELECT
    id,
    name,
    email
FROM users
WHERE role = 'user'
ORDER BY name ASC;


-- View all tasks with assignment and creator information
SELECT
    t.id,
    t.title,
    t.description,
    t.priority,
    t.status,
    t.due_date,
    assigned_user.name AS assigned_to_name,
    assigned_user.email AS assigned_to_email,
    creator.name AS created_by_name,
    creator.email AS created_by_email,
    t.created_at,
    t.updated_at
FROM tasks t
INNER JOIN users assigned_user
    ON t.assigned_to = assigned_user.id
INNER JOIN users creator
    ON t.created_by = creator.id
ORDER BY t.due_date ASC;


-- View tasks assigned to one user
SELECT
    t.id,
    t.title,
    t.priority,
    t.status,
    t.due_date
FROM tasks t
WHERE t.assigned_to = @john_id
ORDER BY t.due_date ASC;


-- Search tasks by title
SELECT
    t.id,
    t.title,
    t.priority,
    t.status,
    t.due_date
FROM tasks t
WHERE t.title LIKE '%dashboard%'
ORDER BY t.due_date ASC;


-- Filter tasks by status
SELECT
    id,
    title,
    priority,
    status,
    due_date
FROM tasks
WHERE status = 'pending'
ORDER BY due_date ASC;


-- Filter tasks by priority
SELECT
    id,
    title,
    priority,
    status,
    due_date
FROM tasks
WHERE priority = 'high'
ORDER BY due_date ASC;


-- Server-side pagination example
-- Page 1, 10 records
SELECT
    id,
    title,
    priority,
    status,
    due_date,
    assigned_to,
    created_by
FROM tasks
ORDER BY due_date ASC
LIMIT 10 OFFSET 0;


-- Server-side pagination example
-- Page 2, 10 records
SELECT
    id,
    title,
    priority,
    status,
    due_date,
    assigned_to,
    created_by
FROM tasks
ORDER BY due_date ASC
LIMIT 10 OFFSET 10;


-- Count total tasks
SELECT COUNT(*) AS total_tasks
FROM tasks;


-- Count pending tasks
SELECT COUNT(*) AS pending_tasks
FROM tasks
WHERE status = 'pending';


-- Count in-progress tasks
SELECT COUNT(*) AS in_progress_tasks
FROM tasks
WHERE status = 'in_progress';


-- Count completed tasks
SELECT COUNT(*) AS completed_tasks
FROM tasks
WHERE status = 'completed';


-- Count overdue, incomplete tasks
SELECT COUNT(*) AS overdue_tasks
FROM tasks
WHERE due_date < CURRENT_TIMESTAMP
  AND status <> 'completed';


-- ============================================================
-- END OF SCRIPT
-- ============================================================
