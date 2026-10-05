# Project Tracker

This is a full-stack web application designed for comprehensive tracking and management of project bids, resources, and tasks across different roles within an organization. It manages the full lifecycle of a project from "New" status to "Bid preparation," execution, and "Completed," maintaining clear constraints for role permissions.

## Key Features
- **Creator Dashboard**: Easily initiate new projects and assign senior leadership.
- **Hod Dashboard**: Global oversight of all departments, projects, and employees.
- **Senior Lead Dashboard**: Form expert teams dynamically and mark projects when successfully finished.
- **Team Lead Dashboard**: Orchestrate micro-tasks dynamically on a structured Kanban board and sequence through a Gantt chart.
- **Member Dashboard**: Access personal task feeds and interact with prioritized assignments.

## Technology Stack

- **Frontend**: React (v19) bundled using Vite, built with modern functional components, standard React Hooks, and Tailwind CSS for flexible inline styling.
- **Backend API**: Engineered using Express (Node.js/ESNext), with a modular routing setup inside the `backend` folder.
- **Database**: Employs an in-memory JSON data structure containing robust seeds within `/backend/db.ts` to reflect complex state relationships locally.

## Getting Started

Follow these steps to explore the app:

### 1. View Available Logins
The application operates with multiple permission layers. Please check out the `CREDENTIALS.md` file for demo accounts covering Creators, HODs, Senior Leads, Team Leads, and regular Members. 

### 2. Run Locally
The integrated environment should automatically spin up the needed processes. However, if running independently:
```bash
# To install the initial dependencies 
npm install

# To start the dev server
npm run dev

# To compile a robust cjs version ready for prod
npm run build
```

## Structure Overview
Explore the codebase systematically based on the separation of concerns:
- **`frontend/`**: The visual layer, complete with route guards (`frontend/src/App.tsx`), UI logic, and layouts (`frontend/src/pages`).
- **`backend/`**: The local server setup hosting authentication handlers and API logic (`backend/routes.ts`).

> Consult `PROJECT_STRUCTURE.md` for a comprehensive file breakdown.
