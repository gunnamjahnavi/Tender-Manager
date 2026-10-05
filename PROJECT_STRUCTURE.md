# Project Structure

This directory guide provides a detailed understanding of where logic lives within the modular full-stack application setup. 

```
.
├── backend/                  # The Express.js backend application
│   ├── db.ts                 # Database seed file containing the mock database objects
│   ├── routes.ts             # API endpoints including express router logic
│   └── server.ts             # Express server logic to handle API endpoints and serve Vite inside Dev/Prod
├── frontend/                 # Client visualization via React and Vite
│   ├── index.html            # Vite root entry index point
│   └── src/                  # Direct React codebase 
│       ├── main.tsx          # Initial application entry configuring routing context
│       ├── App.tsx           # Global component hosting core React Router switch setup
│       ├── index.css         # Global tailwind variables and standard stylesheets
│       ├── components/       # Re-usable functional UI components
│       │   ├── Layout.tsx    # Primary side-navigation wrapper for main pages
│       │   └── views/        # Isolated complex views (e.g., GanttChart.tsx, KanbanBoard.tsx)
│       └── pages/            # View compositions mapped strictly to active routes (e.g., Dashboards)
│
├── package.json              # Contains standard scripts and application dependencies
├── tsconfig.json             # Root TypeScript compiler boundaries mapped to frontend/backend
└── vite.config.ts            # Vite bundler, mapped root to "frontend/".
```

## Setup & Architecture Details
The project is organized cohesively into `frontend` and `backend` directories to provide a highly scalable, easy-to-read developer experience separating server concerns from client display logic. 

**Express & Vite Integration (`server.ts`)**
The application starts from `backend/server.ts`, which sets up Express. During development, Vite middleware is injected into the loop for optimal routing over `/api/`. When packaged for production (`npm run build`), `esbuild` cleanly outputs `dist/server.cjs` routing gracefully alongside a minified `/dist/` frontend directory.
