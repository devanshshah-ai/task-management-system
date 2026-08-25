# Task Management System

A full-stack Task Management System built with React, Node.js, Express, and MongoDB. The application provides secure authentication, task management, role-based access, search and filtering, server-side pagination, dashboard statistics, Redux Toolkit state management, dark mode, and task export to Excel/PDF.

## Tech Stack

### Frontend
- React.js
- Redux Toolkit
- React Router
- Axios
- React Hook Form
- Zod
- Vite

### Backend
- Node.js
- Express.js
- Mongoose
- JWT
- bcryptjs
- Zod
- CORS
- dotenv

### Database
- MongoDB / MongoDB Atlas
- MySQL relational database design and SQL script

### Additional Libraries
- XLSX — Excel export
- jsPDF — PDF export
- jsPDF AutoTable — PDF table generation

## Features

### Authentication
- User registration
- User login
- JWT authentication
- Password hashing with bcryptjs
- Protected routes
- Persistent authentication state

### Role-Based Access
The application supports two roles:

- **Admin**
- **User**

Admins can manage tasks across users and reassign tasks. Normal users can create and manage their own assigned tasks.

### Dashboard
The dashboard provides:
- Total tasks
- Pending tasks
- In-progress tasks
- Completed tasks
- Overdue tasks
- Upcoming tasks
- User-specific task statistics

### Task Management
Users can:
- Create tasks
- View task details
- Edit tasks
- Delete tasks
- Set task priority
- Set due dates
- Change task status
- Assign tasks where permitted

Task statuses:
- Pending
- In Progress
- Completed

Task priorities:
- High
- Medium
- Low

### Search, Filter and Pagination
- Search tasks by title
- Filter by status
- Filter by priority
- Sort by due date
- Server-side pagination

### Bonus Features
The application includes:
- Dark Mode
- Role-Based Access (Admin/User)
- Export Tasks to Excel/PDF

## Project Structure

```text
task-management-system/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── utils/
│   │   ├── validators/
│   │   ├── app.js
│   │   └── server.js
│   ├── .env.example
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   ├── components/
│   │   ├── context/
│   │   ├── pages/
│   │   ├── store/
│   │   ├── styles/
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── package.json
│
├── database/
│   ├── task_management_mysql.sql
│   └── task_management_mysql_database_design.md
│
├── docs/
│   └── task_management_api_documentation.md
│
├── postman/
│   └── task_management_api_postman_collection.json
│
└── README.md
```

## Authentication Flow

1. A user registers with their name, email, and password.
2. The backend validates the request.
3. The password is securely hashed before being stored.
4. The user logs in with their credentials.
5. The backend verifies the credentials and generates a JWT.
6. Protected requests send the JWT with the Authorization header.
7. JWT middleware validates the token.
8. The authenticated user's ID and role are made available to protected controllers.

Passwords are never stored as plain text.

## Role Permissions

| Feature | Admin | User |
|---|:---:|:---:|
| Register/Login | Yes | Yes |
| Create Task | Yes | Yes |
| View Own Tasks | Yes | Yes |
| View Other Users' Tasks | Yes | No |
| Edit Own Assigned Task | Yes | Yes |
| Edit Other Users' Tasks | Yes | No |
| Reassign Task | Yes | No |
| Delete Own Assigned Task | Yes | Yes |
| Delete Other Users' Tasks | Yes | No |
| View Overall Statistics | Yes | Own Tasks |

Normal users self-assign tasks when creating tasks. Admins can assign tasks to normal users.

## Database

### MongoDB

MongoDB is the primary runtime database.

#### Users

The Users collection stores:
- Name
- Email
- Encrypted password
- Role
- Created/updated timestamps

#### Tasks

The Tasks collection stores:
- Title
- Description
- Priority
- Status
- Due date
- Assigned user
- Task creator
- Created/updated timestamps

### MySQL

A relational version of the database design is also provided for the assignment requirement.

Files:

```text
database/task_management_mysql.sql
database/task_management_mysql_database_design.md
```

MongoDB remains the mandatory runtime database for the application.

## REST API

The backend exposes REST APIs for authentication, user management, task management, statistics, search, filtering, and pagination.

### Task Endpoints

```text
POST   /tasks
GET    /tasks
GET    /tasks/stats
GET    /tasks/:id
PUT    /tasks/:id
DELETE /tasks/:id
```

Protected endpoints require:

```http
Authorization: Bearer <JWT_TOKEN>
```

Full API documentation is available at:

```text
docs/task_management_api_documentation.md
```

The Postman collection is available at:

```text
postman/task_management_api_postman_collection.json
```

## Validation and Error Handling

The backend uses Zod for request validation.

Validation is implemented for:
- User registration
- Task creation
- Task updates
- Task query parameters

The backend also includes:
- Centralized error handling
- Structured API responses
- MongoDB ObjectId validation
- JWT middleware
- Authorization checks

Example successful response:

```json
{
  "success": true,
  "message": "Operation successful",
  "data": {}
}
```

## Environment Variables

Create a `.env` file inside the `backend` directory.

```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
```

A sample environment file is included as:

```text
backend/.env.example
```

Do not commit the real `.env` file to GitHub.

## Prerequisites

Install the following before running the project:

- Node.js
- npm
- Git
- MongoDB Atlas account or a local MongoDB installation

## Installation

### 1. Clone the Repository

```bash
git clone <YOUR_GITHUB_REPOSITORY_URL>
cd task-management-system
```

### 2. Install Backend Dependencies

```bash
cd backend
npm install
```

Create `backend/.env` and add the required environment variables.

### 3. Start the Backend

For development:

```bash
npm run dev
```

The backend will run on:

```text
http://localhost:5000
```

### 4. Install Frontend Dependencies

Open a new terminal from the project root:

```bash
cd frontend
npm install
```

### 5. Start the Frontend

```bash
npm run dev
```

The frontend will normally run on:

```text
http://localhost:5173
```

Open the displayed Vite URL in your browser.

## Running the Application

Run the backend and frontend in separate terminals.

### Terminal 1 — Backend

```bash
cd backend
npm run dev
```

### Terminal 2 — Frontend

```bash
cd frontend
npm run dev
```

Then open the frontend URL shown by Vite.

## API Testing with Postman

The project includes a Postman collection for testing the backend APIs.

Location:

```text
postman/task_management_api_postman_collection.json
```

A typical testing flow is:

1. Register a user.
2. Login.
3. Obtain the JWT token.
4. Use the token for protected requests.
5. Create a task.
6. Get tasks.
7. View a task.
8. Update a task.
9. Test search and filters.
10. Test pagination.
11. Test task statistics.
12. Test authorization and deletion.

## Redux Toolkit

Redux Toolkit is used for task state management.

The Redux store manages:
- Task list
- Loading state
- Error state
- Pagination
- Fetching tasks
- Updating task state
- Adding tasks
- Removing tasks

Authentication state is handled through the application's authentication context.

## Dark Mode

The frontend includes a dark mode interface that allows users to switch between light and dark themes.

## Export Tasks

### Excel Export

The application uses the `xlsx` package to export task data into Excel-compatible files.

### PDF Export

The application uses:
- `jspdf`
- `jspdf-autotable`

to generate PDF task reports.

## Responsive UI

The frontend is built using functional React components, hooks, reusable components, and responsive CSS.

The interface includes:
- Login
- Registration
- Dashboard
- Tasks
- Create Task
- Edit Task
- Task Details
- User Management
- Dark Mode
- Export functionality

## Code Architecture

The project follows a modular structure.

### Backend

Responsibilities are separated into:

- **Routes** — API endpoint definitions
- **Controllers** — Request and response handling
- **Services** — Business logic where applicable
- **Models** — MongoDB schemas
- **Validators** — Request validation
- **Middleware** — Authentication, authorization, and error handling
- **Config** — Application/database configuration
- **Utils** — Shared utility functionality

### Frontend

The frontend is separated into:

- **Pages** — Application screens
- **Components** — Reusable UI components
- **API** — Backend API communication
- **Store** — Redux Toolkit state management
- **Context** — Authentication state
- **Styles** — Shared and page-specific styling

## Security

The application includes:
- JWT-based authentication
- Password hashing
- Protected routes
- Role-based authorization
- Server-side input validation
- MongoDB ObjectId validation
- Environment variables for secrets
- Centralized error handling

## Production Build

### Frontend

```bash
cd frontend
npm run build
```

To preview the production build:

```bash
npm run preview
```

### Backend

Start the backend using the production start command defined in `backend/package.json`.

## Documentation

Additional project documentation is available in:

```text
docs/task_management_api_documentation.md
postman/task_management_api_postman_collection.json
database/task_management_mysql.sql
database/task_management_mysql_database_design.md
```

## Author

**Devansh Shah**

Task Management System — Full-Stack Development Project
