# Project Features: Tender Manager

Tender Manager is a comprehensive platform designed to manage the lifecycle of tenders and projects within an organization, from initial creation to final submission.

## 1. User Authentication & Role Management
- **Secure Login**: JWT-based authentication for all users.
- **Role-Based Access Control (RBAC)**: Distinct permissions and views for 5 major roles:
  - **Creator**: Responsible for initiating new tenders and managing the user base.
  - **HOD (Head of Department)**: Provides high-level oversight and assigns Senior Leads to projects.
  - **Senior Lead**: Manages operational leadership, forms teams, and assigns Team Leads.
  - **Team Lead**: Manages daily project execution, updates pipeline stages, and assigns tasks to members.
  - **Member**: Executes assigned tasks and contributes to the project.

## 2. Project Lifecycle Management
- **Project Creation**: Creators can initiate projects with details like client name, category (Highways, Bridges, etc.), and description.
- **Automated Coding**: Projects are assigned unique tracking codes (e.g., `LT-2026-001`).
- **Dynamic Stakeholder Assignment**: 
  - Creators/HODs assign Senior Leads.
  - Senior Leads form teams and assign Team Leads.
- **Custom Pipeline Stages**: Team Leads can track projects through specialized stages:
  - Go Decision
  - Team Allocated
  - Exec Summary
  - Site Visit
  - Pre-Bid Queries
  - Value Engg.
  - Bid Preparation
  - Internal Review
  - Bid Submitted
- **Project Completion**: Senior Leads/HODs can mark projects as completed, triggering automated experience credits for the team.

## 3. Team & Workforce Management
- **Intelligent Team Formation**: Senior Leads can pick from a pool of members based on their previous experience in specific sectors.
- **Workload Balancing**: Built-in logic prevents any user from being assigned to more than 5 active projects simultaneously.
- **Experience Tracking**: Automated history of completed projects per user, categorized by project type (Highways, Bridges, etc.).

## 4. Task Management & Visualization
- **Granular Tasking**: Team Leads can create and assign specific tasks to members with deadlines and priorities.
- **Multiple Views**:
  - **Kanban Board**: Drag-and-drop style task status management.
  - **Task Calendar**: Visual timeline of all task deadlines.
  - **Gantt Chart**: Interactive project timeline showing task durations.
- **Status Synchronization**: Real-time updates of task progress across all dashboards.

## 5. Dashboards & Visibility
- **Role-Specific Dashboards**: Custom interfaces tailored to the needs of each role (e.g., assignment focus for HOD, execution focus for Team Lead).
- **Activity Feed**: Members can track their recent contributions.
- **Global Project Master**: A centralized directory for searching and viewing all organization-wide projects.
- **Stakeholder Visibility**: Project status updates are immediately visible to all involved parties (HOD, Creator, Senior Lead, and Team Members).

## 6. Communication & Notifications
- **System Notifications**: Automated alerts for new assignments, project completions, and status changes.
- **Export Capabilities**: HODs can export project reports in JSON format for external analysis.
