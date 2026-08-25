# Task Management System — MySQL Database Design

## 1. Overview

This document describes the relational database design for the Task Management System.

The application uses **MongoDB as its mandatory database**. This MySQL schema is provided as the relational database design and SQL script requested in the assignment.

The relational design contains two main entities:

- `users`
- `tasks`

The design supports:

- User authentication data
- Admin/User roles
- Task creation
- Task assignment
- Task ownership/creation tracking
- Task priority
- Task status
- Due dates
- Search by title
- Status filtering
- Priority filtering
- Sorting by due date
- Server-side pagination
- Dashboard task statistics

---

# 2. Database Structure

## Users

The `users` table stores application users and their roles.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | INT UNSIGNED | Primary Key, Auto Increment | Unique user identifier |
| `name` | VARCHAR(100) | NOT NULL | User's display name |
| `email` | VARCHAR(255) | NOT NULL, UNIQUE | Login email |
| `password` | VARCHAR(255) | NOT NULL | bcrypt/bcryptjs password hash |
| `role` | ENUM | NOT NULL, DEFAULT `user` | `admin` or `user` |
| `created_at` | TIMESTAMP | NOT NULL | Record creation time |
| `updated_at` | TIMESTAMP | NOT NULL | Last update time |

### Roles

The application supports two roles:

- `admin`
- `user`

Application-level authorization determines what each role can do.

---

# 3. Tasks

The `tasks` table stores all task information.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | INT UNSIGNED | Primary Key, Auto Increment | Unique task identifier |
| `title` | VARCHAR(100) | NOT NULL | Task title |
| `description` | TEXT | Nullable | Task description |
| `priority` | ENUM | NOT NULL, DEFAULT `medium` | `high`, `medium`, `low` |
| `status` | ENUM | NOT NULL, DEFAULT `pending` | `pending`, `in_progress`, `completed` |
| `due_date` | DATETIME | NOT NULL | Task deadline |
| `assigned_to` | INT UNSIGNED | Foreign Key | User assigned to the task |
| `created_by` | INT UNSIGNED | Foreign Key | User/admin who created the task |
| `created_at` | TIMESTAMP | NOT NULL | Record creation time |
| `updated_at` | TIMESTAMP | NOT NULL | Last update time |

---

# 4. Relationships

The database contains two relationships between `users` and `tasks`.

### User → Assigned Tasks

One user can be assigned many tasks.

```text
users.id 1 ─────────── N tasks.assigned_to
```

### User → Created Tasks

One user/admin can create many tasks.

```text
users.id 1 ─────────── N tasks.created_by
```

Both relationships are implemented using foreign keys.

---

# 5. ER Diagram

```text
+---------------------------+
|          USERS            |
+---------------------------+
| PK  id                    |
|     name                  |
| UQ  email                 |
|     password              |
|     role                  |
|     created_at            |
|     updated_at            |
+---------------------------+
       |              |
       | 1            | 1
       |              |
       | N            | N
       v              v
+--------------------------------+
|             TASKS              |
+--------------------------------+
| PK  id                         |
|     title                      |
|     description                |
|     priority                   |
|     status                     |
|     due_date                   |
| FK  assigned_to                |
| FK  created_by                 |
|     created_at                 |
|     updated_at                 |
+--------------------------------+
```

Relationship mapping:

```text
users.id ───────────────> tasks.assigned_to
users.id ───────────────> tasks.created_by
```

---

# 6. Foreign Key Rules

## `tasks.assigned_to`

References:

```text
users.id
```

Constraint:

```text
ON DELETE RESTRICT
ON UPDATE CASCADE
```

This prevents deleting a user while tasks are still assigned to that user.

## `tasks.created_by`

References:

```text
users.id
```

Constraint:

```text
ON DELETE RESTRICT
ON UPDATE CASCADE
```

This preserves the creator relationship for existing tasks.

---

# 7. Business Rules

The database and application together enforce the following rules:

1. Every task must have an assigned user.
2. Tasks can only be assigned to users with the `user` role.
3. Admins can manage tasks across users.
4. Normal users can access tasks assigned to themselves.
5. Normal users cannot view another user's task.
6. Normal users can update their assigned tasks.
7. Only admins can reassign tasks.
8. Admins can delete any task.
9. Normal users can delete their assigned tasks.
10. Task statuses are:
    - `pending`
    - `in_progress`
    - `completed`
11. Task priorities are:
    - `high`
    - `medium`
    - `low`
12. Completed tasks are excluded from overdue calculations.
13. Tasks support title-based searching.
14. Tasks support status filtering.
15. Tasks support priority filtering.
16. Tasks can be sorted by due date.
17. Server-side pagination uses `LIMIT` and `OFFSET`.
18. Passwords are stored as bcrypt/bcryptjs hashes by the application.

> Role-based assignment and authorization are primarily enforced by the application layer. The relational schema stores the relationships and role values.

---

# 8. Indexing Strategy

Indexes are included to support the application's common operations.

### Users

```text
users.email
users.role
```

`email` is automatically indexed because it is unique.

`role` helps retrieve normal users for task assignment.

### Tasks

```text
tasks.assigned_to
tasks.created_by
tasks.status
tasks.priority
tasks.due_date
tasks.assigned_to + status + due_date
tasks.status + due_date
```

These indexes support:

- User-specific task queries
- Task ownership/creator lookups
- Status filtering
- Priority filtering
- Due-date sorting
- Upcoming/overdue task queries
- Dashboard statistics

---

# 9. Dashboard Statistics

The schema supports the dashboard statistics required by the application.

### Total Tasks

```sql
SELECT COUNT(*)
FROM tasks;
```

### Pending Tasks

```sql
SELECT COUNT(*)
FROM tasks
WHERE status = 'pending';
```

### In Progress Tasks

```sql
SELECT COUNT(*)
FROM tasks
WHERE status = 'in_progress';
```

### Completed Tasks

```sql
SELECT COUNT(*)
FROM tasks
WHERE status = 'completed';
```

### Overdue Tasks

Completed tasks are excluded from overdue calculations.

```sql
SELECT COUNT(*)
FROM tasks
WHERE due_date < CURRENT_TIMESTAMP
  AND status <> 'completed';
```

For a normal user, the application should additionally restrict these queries to tasks assigned to the authenticated user.

---

# 10. Search and Filtering

## Search by Title

```sql
SELECT *
FROM tasks
WHERE title LIKE '%dashboard%';
```

## Filter by Status

```sql
SELECT *
FROM tasks
WHERE status = 'pending';
```

## Filter by Priority

```sql
SELECT *
FROM tasks
WHERE priority = 'high';
```

## Sort by Due Date

```sql
SELECT *
FROM tasks
ORDER BY due_date ASC;
```

---

# 11. Server-Side Pagination

The application uses server-side pagination.

For example, with 10 tasks per page:

### Page 1

```sql
SELECT *
FROM tasks
ORDER BY due_date ASC
LIMIT 10 OFFSET 0;
```

### Page 2

```sql
SELECT *
FROM tasks
ORDER BY due_date ASC
LIMIT 10 OFFSET 10;
```

The offset is calculated as:

```text
OFFSET = (page - 1) × limit
```

---

# 12. Task Assignment

The `assigned_to` column identifies the user responsible for a task.

Example:

```text
Task
 └── assigned_to → User
```

The application only allows tasks to be assigned to normal users.

For a normal logged-in user creating a task, the application can assign the task to the authenticated user automatically.

For an admin, the application can assign the task to another normal user.

---

# 13. Task Creation Tracking

The `created_by` column records who created the task.

This allows the system to distinguish between:

- The user responsible for completing the task
- The user/admin who created the task

Example:

```text
created_by  → Admin
assigned_to → User
```

---

# 14. Password Storage

The database stores a password hash rather than a plaintext password.

The application uses:

```text
bcryptjs
```

The MySQL column is therefore sized as:

```sql
password VARCHAR(255) NOT NULL
```

The SQL sample values are placeholders and must not be used as real application credentials.

---

# 15. Storage Engine and Character Set

The tables use:

```text
InnoDB
```

InnoDB is used because the schema requires foreign keys and transactional relational behavior.

The database uses:

```text
utf8mb4
```

with:

```text
utf8mb4_unicode_ci
```

This provides broad Unicode support for user names, task titles and descriptions.

---

# 16. SQL Script

The complete executable schema and example queries are provided in:

```text
task_management_mysql.sql
```

The script includes:

- Database creation
- `users` table
- `tasks` table
- Primary keys
- Unique constraints
- Foreign keys
- Indexes
- Optional sample data
- User queries
- Task queries
- Search
- Filtering
- Pagination
- Dashboard statistics

---

# 17. Running the SQL Script

The script can be executed using MySQL Workbench or the MySQL command-line client.

Example:

```bash
mysql -u root -p < task_management_mysql.sql
```

Or:

1. Open MySQL Workbench.
2. Open `task_management_mysql.sql`.
3. Execute the script.
4. The `task_management_system` database will be created.
5. The `users` and `tasks` tables will be created.
6. Optional sample records will be inserted.

---

# 18. Database Design Summary

```text
Database
└── task_management_system
    │
    ├── users
    │   ├── id (PK)
    │   ├── name
    │   ├── email (UNIQUE)
    │   ├── password
    │   ├── role
    │   ├── created_at
    │   └── updated_at
    │
    └── tasks
        ├── id (PK)
        ├── title
        ├── description
        ├── priority
        ├── status
        ├── due_date
        ├── assigned_to (FK → users.id)
        ├── created_by (FK → users.id)
        ├── created_at
        └── updated_at
```

This relational schema represents the same core data model and business relationships used by the Task Management System's MongoDB implementation.
