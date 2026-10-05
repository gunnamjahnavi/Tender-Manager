# Demo Credentials

Here are the login details for the different roles in this application. Use these demo credentials to test the various aspects of the project management workflow.

| Role | Email | Password | Responsibilities |
| :--- | :--- | :--- | :--- |
| **Creator** | `creator@lt.com` | `password` | Create new projects/tenders, assign Senior Leads, set deadlines and categories. |
| **HOD** | `hod@lt.com` | `password` | Overview of all activities, can also complete projects and assign leads. |
| **Senior Lead** | `slead@lt.com` | `password` | Form teams based on members' project experience, set project completions. |
| **Team Lead** | `tlead@lt.com` | `password` | Manage team tasks and oversee the kanban board/dashboard. |
| **Member** | `member@lt.com` | `password` | View and work on assigned tasks, communicate with the team. |

## Workflow Testing Guide

1. Log in as **Creator** and create a new project. Select a category (e.g., Engineering) and assign it to the Senior Lead.
2. Log out and log in as **Senior Lead**. Find the newly assigned project under "My Assigned Projects".
3. Click "Form Team". Notice how some users might have prior experience tags dynamically shown based on the project category. Select a Team Lead and Members.
4. Mark a project as **Completed** from the Senior Lead dashboard. This automatically logs that project as experience for all participating members, which helps you next time you form a team for the same category.
