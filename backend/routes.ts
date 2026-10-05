import { Router } from "express";
import jwt from "jsonwebtoken";
import { db } from "./db.js";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key-for-lt";
const VALID_PROJECT_STATUSES = ["In Progress", "Completed", "Bid Dropped"];
const MAX_ACTIVE_PROJECTS_PER_USER = 5;
const DEFAULT_PROJECT_STAGES = [
  "Go Decision",
  "Team Allocated",
  "Exec Summary",
  "Site Visit",
  "Pre-Bid Queries",
  "Value Engg.",
  "Bid Preparation",
  "Internal Review",
  "Bid Submitted",
];

const normalizePipelineStages = (pipelineStages: any) => {
  const source = Array.isArray(pipelineStages) && pipelineStages.length > 0
    ? pipelineStages
    : DEFAULT_PROJECT_STAGES;

  return source
    .map((stage: any) => {
      if (typeof stage === "string") return { name: stage.trim(), deadline: null };
      return {
        name: typeof stage?.name === "string" ? stage.name.trim() : "",
        deadline: stage?.deadline || null,
      };
    })
    .filter((stage: any) => stage.name);
};

const isSeniorLeadForProject = (userId: number, project: any) =>
  project.seniorLeadId === userId;

const canManageProjectTeam = (user: any, project: any) =>
  (user.role === "HOD" && canHodManageProject(user, project)) ||
  (user.role === "Senior Lead" && isSeniorLeadForProject(user.id, project));

const canHodManageProject = (user: any, project: any) => {
  if (user.role !== "HOD") return false;
  const isAnurag = user.name?.includes("Anurag");
  const isAzad = user.name?.includes("Azad");
  if (isAnurag) return project.category === "Bridges";
  if (isAzad) return project.category !== "Bridges";
  return true;
};

const getProjectStageNames = (project: any) =>
  normalizePipelineStages(project.pipelineStages).map((stage: any) => stage.name);

const hasCompletedAllStages = (project: any) => {
  const stageNames = getProjectStageNames(project);
  if (stageNames.length === 0) return false;
  const completed = new Set(project.completedStages || []);
  return stageNames.every((stage: string) => completed.has(stage));
};

const ensureProjectCanComplete = (project: any, res: any) => {
  if (hasCompletedAllStages(project)) return true;
  return res.status(400).json({
    error: "Complete every status pipeline stage before marking this project as Completed.",
  });
};

const getActiveProjectsCountForUser = (userId: number, excludeProjectId?: number) =>
  db.projects.filter(p => {
    if (excludeProjectId && p.id === excludeProjectId) return false;
    if (p.status === 'Completed') return false;
    if (isBidDroppedProject(p)) return false;
    const team = db.teams.find(t => t.id === p.teamId);
    if (!team) return false;
    return team.teamLeadId === userId || team.members?.includes(userId);
  }).length;

const validateProjectAllocation = (userIds: number[], projectId?: number) => {
  const uniqueUserIds = Array.from(new Set(userIds.filter(Boolean)));
  const overAllocated = uniqueUserIds
    .map(userId => ({
      userId,
      user: db.users.find(u => u.id === userId),
      activeProjectsCount: getActiveProjectsCountForUser(userId, projectId),
    }))
    .find(item => item.activeProjectsCount >= MAX_ACTIVE_PROJECTS_PER_USER);

  if (!overAllocated) return null;

  return `${overAllocated.user?.name || 'Selected user'} is already assigned to ${MAX_ACTIVE_PROJECTS_PER_USER} active projects`;
};

const upsertTaskPerformanceReview = (task: any, reviewer: any, rating: number, notes?: string) => {
  if (!task.assignedToId) return null;
  const normalizedRating = Math.max(1, Math.min(5, Number(rating)));
  const project = db.projects.find(p => p.id === task.projectId);
  const existing = db.performanceReviews.find((review: any) => review.taskId === task.id);
  const reviewPayload = {
    taskId: task.id,
    taskTitle: task.title,
    projectId: task.projectId,
    projectName: project?.name || "Unknown Project",
    category: project?.category || "General",
    teamId: task.teamId || project?.teamId || null,
    memberId: task.assignedToId,
    reviewerId: reviewer.id,
    rating: normalizedRating,
    notes: notes || "",
    reviewedAt: new Date(),
  };

  task.rating = normalizedRating;
  task.reviewNotes = notes || "";
  task.reviewedBy = reviewer.id;
  task.reviewedAt = reviewPayload.reviewedAt;

  if (existing) {
    Object.assign(existing, reviewPayload);
    return existing;
  }

  if (!db.performanceReviewIdCounter) db.performanceReviewIdCounter = 1;
  const review = {
    id: db.performanceReviewIdCounter++,
    ...reviewPayload,
  };
  db.performanceReviews.push(review);
  return review;
};

const syncExperiencesForProject = (projectId: number) => {
  const project = db.projects.find(p => p.id === projectId);
  if (!project) return;

  const team = db.teams.find(t => t.projectId === projectId || t.id === project.teamId);

  const participants: { employee_id: number; role: 'HOD' | 'Senior Lead' | 'Team Lead' | 'Team Member' }[] = [];

  const isSuccessful = project.tenderOutcome?.result === "Success";
  const isCompleted = project.status === "Completed";

  // HOD gets experience credit on: Successful tender outcome
  if (project.hodId && (isSuccessful || isCompleted)) {
    participants.push({ employee_id: project.hodId, role: 'HOD' });
  }

  // Senior Lead gets experience credit on: Successful tender outcome or project completion
  if (project.seniorLeadId && (isSuccessful || isCompleted)) {
    participants.push({ employee_id: project.seniorLeadId, role: 'Senior Lead' });
  }

  if (team) {
    if (team.teamLeadId) {
      participants.push({ employee_id: team.teamLeadId, role: 'Team Lead' });
    }
    if (team.members && Array.isArray(team.members)) {
      team.members.forEach((mId: number) => {
        if (mId && mId !== team.teamLeadId) {
          participants.push({ employee_id: mId, role: 'Team Member' });
        }
      });
    }
  }

  const currentParticipantIds = new Set(participants.map(p => p.employee_id));

  if (!db.employeeExperiences) db.employeeExperiences = [];
  if (!db.leadershipHistory) db.leadershipHistory = [];

  // Remove experiences and leadership records for this project that are no longer associated
  db.employeeExperiences = db.employeeExperiences.filter((ee: any) => {
    if (ee.project_id === projectId) {
      return currentParticipantIds.has(ee.employee_id);
    }
    return true;
  });

  db.leadershipHistory = db.leadershipHistory.filter((lh: any) => {
    if (lh.project_id === projectId) {
      return currentParticipantIds.has(lh.employee_id);
    }
    return true;
  });

  // Reconcile / insert experiences
  participants.forEach((part) => {
    const start_date = project.startDate ? new Date(project.startDate) : (project.createdAt ? new Date(project.createdAt) : new Date());
    const end_date = project.status === 'Completed' ? (project.endDate ? new Date(project.endDate) : new Date()) : null;
    const experienceStatus = project.tenderOutcome?.result === "Success" ? "Completed" : project.status;

    let expRecord = db.employeeExperiences.find((ee: any) => ee.employee_id === part.employee_id && ee.project_id === projectId);

    if (expRecord) {
      expRecord.project_category = project.category || 'General';
      expRecord.role = part.role;
      expRecord.start_date = start_date;
      expRecord.end_date = end_date;
      expRecord.status = experienceStatus;
      expRecord.updated_at = new Date();
    } else {
      if (!db.employeeExperienceIdCounter) db.employeeExperienceIdCounter = 1;
      db.employeeExperiences.push({
        id: db.employeeExperienceIdCounter++,
        employee_id: part.employee_id,
        project_id: projectId,
        project_category: project.category || 'General',
        role: part.role,
        start_date,
        end_date,
        status: experienceStatus,
        created_at: new Date(),
        updated_at: new Date()
      });
    }

    // Leadership record if role is Senior Lead or Team Lead
    if (part.role === 'Senior Lead' || part.role === 'Team Lead') {
      let leadRecord = db.leadershipHistory.find((lh: any) => lh.employee_id === part.employee_id && lh.project_id === projectId);
      const team_size = team ? (team.members || []).length + 1 : 0;

      if (leadRecord) {
        leadRecord.leadership_role = part.role;
        leadRecord.team_size = team_size;
        leadRecord.project_category = project.category || 'General';
        leadRecord.updated_at = new Date();
      } else {
        if (!db.leadershipHistoryIdCounter) db.leadershipHistoryIdCounter = 1;
        db.leadershipHistory.push({
          id: db.leadershipHistoryIdCounter++,
          employee_id: part.employee_id,
          project_id: projectId,
          leadership_role: part.role,
          team_size,
          project_category: project.category || 'General',
          created_at: new Date(),
          updated_at: new Date()
        });
      }
    }

    // Push completion notifications if newly completed
    if (project.status === 'Completed') {
      const alreadyNotified = db.notifications.some((n: any) => n.userId === part.employee_id && n.message.includes(`Project ${project.name} has been completed`));
      if (!alreadyNotified) {
        db.notifications.push({
          id: db.notificationIdCounter++,
          userId: part.employee_id,
          message: `Project ${project.name} has been completed! Added to your experience.`,
          read: false,
          timestamp: new Date(),
        });
      }
    }

    // Keep the old experienceHistory in sync
    let histRecord = db.experienceHistory.find((eh: any) => eh.userId === part.employee_id && eh.projectId === projectId);
    if (histRecord) {
      histRecord.projectName = project.name;
      histRecord.category = project.category || 'General';
      histRecord.role = part.role;
      histRecord.dateCompleted = project.status === 'Completed' ? end_date : null;
    } else {
      db.experienceHistory.push({
        userId: part.employee_id,
        projectId: projectId,
        projectName: project.name,
        category: project.category || 'General',
        role: part.role,
        date: new Date(),
        dateCompleted: project.status === 'Completed' ? end_date : null
      });
    }
  });
};

const creditProjectExperience = (project: any) => {
  syncExperiencesForProject(project.id);
};

// Auth middleware
const auth = (req: any, res: any, next: any) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
};

const requireRole = (roles: string[]) => (req: any, res: any, next: any) => {
  if (!roles.includes(req.user.role))
    return res.status(403).json({ error: "Forbidden" });
  next();
};

router.post("/auth/login", (req, res) => {
  try {
    const { email, password } = req.body;
    console.log(`[LOGIN ATTEMPT] Email: ${email}`);
    
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const user = db.users.find(
      (u) => u.email === email && u.password === password,
    );
    
    if (!user) {
      console.log(`[LOGIN FAILED] No user found for ${email}`);
      return res.status(401).json({ error: "Invalid credentials" });
    }
    
    console.log(`[LOGIN SUCCESS] User: ${user.name}`);

    const token = jwt.sign(
      { id: user.id, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: "8h" },
    );

    const isCurrentTeamLead = db.teams?.some(t => 
      t.teamLeadId === user.id && 
      (db.projects?.find(p => p.teamId === t.id)?.status ?? '') !== 'Completed'
    ) || false;

    res.json({
      token,
      user: { 
        id: user.id, 
        name: user.name, 
        role: user.role, 
        email: user.email, 
        isTeamLead: isCurrentTeamLead 
      },
    });
  } catch (error) {
    console.error("[LOGIN ERROR]", error);
    res.status(500).json({ error: "An internal error occurred during login" });
  }
});

router.get("/api/users", auth, (req, res) => {
  const userRole = (req as any).user.role;
  const canSeeFullProfile = ["HOD", "Creator", "Senior Lead"].includes(userRole);

  res.json(
    db.users.map((u) => {
      const activeProjectsCount = getActiveProjectsCountForUser(u.id);

      return {
        id: u.id,
        name: u.name,
        role: u.role,
        email: canSeeFullProfile ? u.email : undefined,
        password: (userRole === "HOD" || userRole === "Creator") ? u.password : undefined,
        experience: canSeeFullProfile 
          ? (db.employeeExperiences || []).filter((e) => e.employee_id === u.id).map(ee => ({
              ...ee,
              category: ee.project_category
            }))
          : [],
        leadershipHistory: canSeeFullProfile
          ? (db.leadershipHistory || []).filter((lh) => lh.employee_id === u.id)
          : [],
        performanceScore: u.performanceScore || 80,
        activeProjectsCount
      };
    }),
  );
});

router.get("/api/profile", auth, (req: any, res) => {
  const userId = req.user.id;
  const user = db.users.find(u => u.id === userId);
  if (!user) return res.status(404).json({ error: "User not found" });

  const experience = (db.employeeExperiences || [])
    .filter(e => e.employee_id === userId && e.status === "Completed")
    .map(ee => ({
    ...ee,
    category: ee.project_category
  }));
  const leadershipHistory = (db.leadershipHistory || []).filter(lh => lh.employee_id === userId);
  const userReviews = (db.performanceReviews || []).filter((review: any) => review.memberId === userId);
  const averageRating = userReviews.length
    ? Number((userReviews.reduce((sum: number, review: any) => sum + Number(review.rating || 0), 0) / userReviews.length).toFixed(2))
    : 0;
  
  // Find projects the user is involved in
  const userTeams = db.teams.filter(t => t.teamLeadId === userId || t.members?.includes(userId));
  const projectIds = userTeams.map(t => t.projectId);
  const leadProjects = db.projects.filter(p => p.seniorLeadId === userId);
  
  const allProjectIds = Array.from(new Set([...projectIds, ...leadProjects.map(p => p.id)]));
  const userProjects = db.projects.filter(p => allProjectIds.includes(p.id));

  const isCurrentTeamLead = db.teams.some(t => t.teamLeadId === userId && db.projects.find(p => p.teamId === t.id)?.status !== 'Completed');

  res.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isTeamLead: isCurrentTeamLead,
      performanceScore: user.performanceScore || 80,
      averageRating,
      taskReviewCount: userReviews.length
    },
    experience,
    leadershipHistory,
    projects: {
      previous: userProjects.filter(p => p.status === 'Completed'),
      current: userProjects.filter(p => p.status === 'In Progress'),
      upcoming: userProjects.filter(p => p.status === 'Bid Dropped')
    }
  });
});

router.get("/api/users/:id/experiences", auth, (req, res) => {
  const userId = parseInt(req.params.id);
  const { category } = req.query;

  let list = (db.employeeExperiences || []).filter((ee: any) => ee.employee_id === userId && ee.status === "Completed");
  if (category) {
    list = list.filter((ee: any) => ee.project_category.toLowerCase() === (category as string).toLowerCase());
  }

  // Populate details
  const result = list.map((ee: any) => {
    let projectDetails: any = null;
    let duration = "—";

    if (ee.project_id) {
      const project = db.projects.find(p => p.id === ee.project_id);
      if (project) {
        // Find team
        const team = db.teams.find(t => t.id === project.teamId || t.projectId === project.id);
        const seniorLead = db.users.find(u => u.id === project.seniorLeadId);
        const teamLead = team ? db.users.find(u => u.id === team.teamLeadId) : null;
        const members = team ? db.users.filter(u => team.members?.includes(u.id)) : [];

        // Calculate duration string
        const start = project.startDate ? new Date(project.startDate) : (project.createdAt ? new Date(project.createdAt) : null);
        const end = project.status === 'Completed' ? (project.endDate ? new Date(project.endDate) : new Date()) : new Date();
        if (start) {
          const diffTime = Math.abs(end.getTime() - start.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          if (diffDays < 30) {
            duration = `${diffDays} days`;
          } else {
            const diffMonths = Math.round(diffDays / 30.4);
            duration = `${diffMonths} ${diffMonths === 1 ? 'month' : 'months'}`;
          }
        }

        projectDetails = {
          name: project.name,
          description: project.description || "—",
          objectives: project.objectives || "—",
          workPerformed: project.workPerformed || "—",
          startDate: project.startDate || "—",
          endDate: project.endDate || "—",
          status: project.status,
          seniorLeadName: seniorLead ? seniorLead.name : "—",
          teamLeadName: teamLead ? teamLead.name : "—",
          teamMembers: members.map(m => m.name)
        };
      }
    }

    if (!projectDetails) {
      // Prior Experience fallback
      projectDetails = {
        name: "Prior Experience",
        description: `Prior project in ${ee.project_category}.`,
        objectives: "Accumulated structural expertise and domain knowledge.",
        workPerformed: "Collaborated on project execution and technical reviews.",
        startDate: ee.start_date ? new Date(ee.start_date).toISOString().split('T')[0] : "—",
        endDate: ee.end_date ? new Date(ee.end_date).toISOString().split('T')[0] : "—",
        status: "Completed",
        seniorLeadName: "—",
        teamLeadName: "—",
        teamMembers: []
      };
      if (ee.start_date && ee.end_date) {
        const diffTime = Math.abs(new Date(ee.end_date).getTime() - new Date(ee.start_date).getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const diffMonths = Math.round(diffDays / 30.4);
        duration = `${diffMonths} ${diffMonths === 1 ? 'month' : 'months'}`;
      }
    }

    return {
      ...ee,
      duration,
      projectDetails
    };
  });

  res.json(result);
});

router.get("/api/users/:id/leadership", auth, (req, res) => {
  const userId = parseInt(req.params.id);

  const list = (db.leadershipHistory || []).filter((lh: any) => lh.employee_id === userId);

  // Populate details
  const result = list.map((lh: any) => {
    let projectDetails: any = null;
    let duration = "—";

    if (lh.project_id) {
      const project = db.projects.find(p => p.id === lh.project_id);
      if (project) {
        const team = db.teams.find(t => t.id === project.teamId || t.projectId === project.id);
        const members = team ? db.users.filter(u => team.members?.includes(u.id)) : [];

        // Calculate duration string
        const start = project.startDate ? new Date(project.startDate) : (project.createdAt ? new Date(project.createdAt) : null);
        const end = project.status === 'Completed' ? (project.endDate ? new Date(project.endDate) : new Date()) : new Date();
        if (start) {
          const diffTime = Math.abs(end.getTime() - start.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          if (diffDays < 30) {
            duration = `${diffDays} days`;
          } else {
            const diffMonths = Math.round(diffDays / 30.4);
            duration = `${diffMonths} ${diffMonths === 1 ? 'month' : 'months'}`;
          }
        }

        projectDetails = {
          name: project.name,
          category: project.category,
          status: project.status,
          outcome: project.tenderOutcome ? project.tenderOutcome.result : (project.status === 'Completed' ? "Success" : "Pending"),
          outcomeDetails: project.tenderOutcome || null,
          teamMembers: members.map(m => m.name),
          teamSize: lh.team_size
        };
      }
    }

    if (!projectDetails) {
      projectDetails = {
        name: "Prior Leadership Project",
        category: lh.project_category,
        status: "Completed",
        outcome: "Success",
        outcomeDetails: { result: "Success" },
        teamMembers: [],
        teamSize: lh.team_size
      };
    }

    return {
      ...lh,
      duration,
      projectDetails
    };
  });

  res.json(result);
});

router.post("/api/users/create", auth, requireRole(["HOD", "Creator"]), (req, res) => {
  const { name, email, role, password, experienceList } = req.body;
  if (!name || !email || !role || !password) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  // Validate role
  const validRoles = ["Member", "Senior Lead", "HOD", "Viewer"];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ error: "Invalid role assignment" });
  }

  const existingUser = db.users.find((u) => u.email === email);
  if (existingUser) {
    return res
      .status(400)
      .json({ error: "User with this email already exists" });
  }

  const newUser = {
    id: db.userIdCounter++,
    name,
    email,
    password, // In a real app this would be hashed
    role,
    performanceScore: 80,
  };

  db.users.push(newUser);

  if (experienceList && Array.isArray(experienceList)) {
    experienceList.forEach((exp) => {
      for (let i = 0; i < exp.count; i++) {
        db.experienceHistory.push({
          userId: newUser.id,
          projectId: null,
          category: exp.category,
          projectName: "Prior Experience",
          role: role,
          date: new Date(),
          message: `Prior project in ${exp.category}`,
        });
      }
    });
  }

  res.json({
    success: true,
    user: {
      id: newUser.id,
      name: newUser.name,
      role: newUser.role,
      email: newUser.email,
    },
  });
});

router.delete("/api/users/:id", auth, requireRole(["HOD", "Creator"]), (req, res) => {
  const userId = parseInt(req.params.id);
  const userIndex = db.users.findIndex((u) => u.id === userId);
  if (userIndex !== -1) {
    db.users.splice(userIndex, 1);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: "User not found" });
  }
});

const isBidDroppedProject = (project: any) =>
  project.bidDropped || project.status === "Bid Dropped" || project.status === "Dropped";

const normalizeProjectStatus = (project: any) => {
  if (isBidDroppedProject(project)) return "Bid Dropped";
  if (project.status === "Completed") return "Completed";
  return "In Progress";
};

const mapProjectsForResponse = (filteredProjects: any[]) =>
  filteredProjects
  .slice()
  .sort((a, b) => {
    const timeA = a.createdAt ? new Date(a.createdAt).getTime() : a.id || 0;
    const timeB = b.createdAt ? new Date(b.createdAt).getTime() : b.id || 0;
    return timeB - timeA;
  })
  .map(p => {
    const hod = db.users.find(u => u.id === p.hodId);
    const seniorLead = db.users.find(u => u.id === p.seniorLeadId);
    const team = db.teams.find(t => t.id === p.teamId);
    const categoryInfo = (db.categories || []).find(c => c.name === p.category);

    let fullTeam: any = null;
    if (team) {
      const leader = db.users.find(u => u.id === team.teamLeadId);
      const members = db.users.filter(u => team.members?.includes(u.id));
      fullTeam = {
        leader: leader ? { id: leader.id, name: leader.name } : null,
        members: members.map(m => ({ id: m.id, name: m.name }))
      };
    }

    return {
      ...p,
      status: normalizeProjectStatus(p),
      categoryColor: categoryInfo?.color,
      hod: hod ? { id: hod.id, name: hod.name } : null,
      seniorLead: seniorLead ? { id: seniorLead.id, name: seniorLead.name } : null,
      teamDetails: fullTeam,
      isBidDropped: isBidDroppedProject(p)
    };
  });

router.get("/api/projects", auth, (req: any, res: any) => {
  try {
    const excludeBidDropped =
      req.query.excludeBidDropped === "true" ||
      req.query.calendar === "true" ||
      req.query.scope === "calendar";

    const filteredProjects = excludeBidDropped
      ? db.projects.filter(p => !isBidDroppedProject(p))
      : db.projects;

    res.json(mapProjectsForResponse(filteredProjects));
  } catch (error) {
    console.error("Error fetching projects:", error);
    res.status(500).json({ error: "Failed to fetch projects" });
  }
});

// Alias for sidebar Projects page — same as GET /api/projects (includes bid-dropped)
router.get("/api/projects/directory", auth, (_req: any, res: any) => {
  try {
    res.json(mapProjectsForResponse(db.projects));
  } catch (error) {
    console.error("Error fetching project directory:", error);
    res.status(500).json({ error: "Failed to fetch project directory" });
  }
});

router.get("/api/categories", auth, (req, res) => {
  try {
    res.json(db.categories || []);
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/api/categories", auth, requireRole(["Creator"]), (req, res) => {
  const { name, color } = req.body;
  if (!name) return res.status(400).json({ error: "Category name required" });
  
  const colors = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#4b5563'];
  const randomColor = colors[Math.floor(Math.random() * colors.length)];

  if (!db.categories) db.categories = [];
  if (db.categories.find(c => c.name.toLowerCase() === name.toLowerCase())) {
    return res.status(400).json({ error: "Category already exists" });
  }

  const newCategory = { name, color: color || randomColor };
  db.categories.push(newCategory);
  res.json(newCategory);
});

router.post(
  "/api/projects/create",
  auth,
  requireRole(["Creator"]),
  (req, res) => {
    const { name } = req.body;
    if (!name || name.trim() === "") {
      return res.status(400).json({ error: "Project name is required" });
    }
    const duplicate = db.projects.find(p => p.name.toLowerCase() === name.trim().toLowerCase());
    if (duplicate) {
      return res.status(400).json({ error: "A project with this name already exists" });
    }

    const currentYear = new Date().getFullYear();
    const projectNumber = db.projectIdCounter;
    const projectCode = `LT-${currentYear}-${String(projectNumber).padStart(3, '0')}`;
    
    // Determine HOD based on project type
    // Azad (HOD for all projects except BRIDGES)
    // Anurag (HOD for bridges)
    const isBridge = req.body.category === 'Bridges';
    const azad = db.users.find(u => u.name.includes('Azad') && u.role === 'HOD');
    const anurag = db.users.find(u => u.name.includes('Anurag') && u.role === 'HOD');
    
    // Default to Azad if not Bridges, otherwise Anurag
    const assignedHodId = isBridge ? (anurag?.id || 7) : (azad?.id || 2);

    const project = {
      id: db.projectIdCounter++,
      projectCode,
      ...req.body,
      pipelineStages: normalizePipelineStages(req.body.pipelineStages),
      hodId: assignedHodId,
      status: "In Progress",
      completedStages: [],
      tenderOutcome: null,
      seniorLeadId: req.body.seniorLeadId
        ? parseInt(req.body.seniorLeadId)
        : null,
      teamId: null,
      createdAt: new Date(),
    };
    if (project.seniorLeadId) {
      db.notifications.push({
        id: db.notificationIdCounter++,
        userId: project.seniorLeadId,
        message: `You have been assigned to lead project: ${project.name}`,
        read: false,
        timestamp: new Date(),
      });
    }
    db.projects.push(project);
    syncExperiencesForProject(project.id);
    res.json(project);
  },
);

router.patch(
  "/api/projects/:id",
  auth,
  requireRole(["Creator"]),
  (req, res) => {
    const { id } = req.params;
    const project = db.projects.find((p) => p.id == (id as any));
    if (!project) return res.status(404).json({ error: "Project not found" });

    const { name, clientName, description, category, estimatedValue, currency, projectState, country, status, seniorLeadId, startDate, endDate } = req.body;
    const previousStatus = project.status;
    if (name !== undefined) {
      if (name.trim() === "") {
        return res.status(400).json({ error: "Project name cannot be empty" });
      }
      const duplicate = db.projects.find(p => p.id !== project.id && p.name.toLowerCase() === name.trim().toLowerCase());
      if (duplicate) {
        return res.status(400).json({ error: "A project with this name already exists" });
      }
      project.name = name.trim();
    }
    if (clientName !== undefined) project.clientName = clientName;
    if (description !== undefined) project.description = description;
    if (category !== undefined) project.category = category;
    if (estimatedValue !== undefined) project.estimatedValue = estimatedValue;
    if (currency !== undefined) project.currency = currency;
    if (projectState !== undefined) project.projectState = projectState;
    if (country !== undefined) project.country = country;
    if (startDate !== undefined) project.startDate = startDate;
    if (endDate !== undefined) project.endDate = endDate;
    if (status !== undefined) {
      if (!VALID_PROJECT_STATUSES.includes(status)) {
        return res.status(400).json({ error: "Invalid status. Must be: In Progress, Completed, or Bid Dropped" });
      }
      if (status === "Completed" && !hasCompletedAllStages(project)) {
        return res.status(400).json({ error: "Complete every status pipeline stage before marking this project as Completed." });
      }
      project.status = status;
      if (status === "Bid Dropped") project.bidDropped = true;
      if (status !== "Bid Dropped") project.bidDropped = false;
    }
    if (seniorLeadId !== undefined) project.seniorLeadId = seniorLeadId ? parseInt(seniorLeadId) : null;
    if (previousStatus !== "Completed" && project.status === "Completed") {
      creditProjectExperience(project);
    } else {
      syncExperiencesForProject(project.id);
    }

    res.json(project);
  },
);

// Update project status
router.post(
  "/api/projects/:id/update-status",
  auth,
  (req: any, res: any) => {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    const project = db.projects.find((p) => p.id == (id as any));
    if (!project) return res.status(404).json({ error: "Project not found" });

    if (!VALID_PROJECT_STATUSES.includes(status)) {
      return res.status(400).json({ error: "Invalid status. Must be: In Progress, Completed, or Bid Dropped" });
    }

    const isTeamLead = db.teams.find(t => t.id === project.teamId)?.teamLeadId === userId;
    const isAssignedSeniorLead = userRole === "Senior Lead" && isSeniorLeadForProject(userId, project);
    const hasPermission =
      ["HOD", "Creator"].includes(userRole) || isAssignedSeniorLead || isTeamLead;

    if (!hasPermission) {
      return res.status(403).json({ error: "No permission to update status" });
    }

    if (status === "Bid Dropped" && userRole !== "Creator") {
      return res.status(403).json({ error: "Only the Project Creator can mark a project as Bid Dropped" });
    }
    if (userRole === "HOD" && !canHodManageProject(req.user, project)) {
      return res.status(403).json({ error: "This HOD can only manage projects in their assigned category scope" });
    }
    if (status === "Completed" && !ensureProjectCanComplete(project, res)) {
      return;
    }

    const previousStatus = project.status;
    project.status = status;
    if (status === "Bid Dropped") project.bidDropped = true;
    if (status !== "Bid Dropped") project.bidDropped = false;
    if (previousStatus !== "Completed" && status === "Completed") {
      creditProjectExperience(project);
    } else {
      syncExperiencesForProject(project.id);
    }

    const stakeholders = new Set([project.hodId, project.seniorLeadId]);
    const team = db.teams.find(t => t.id === project.teamId);
    if (team) {
      team.members?.forEach((mId: number) => stakeholders.add(mId));
      stakeholders.add(team.teamLeadId);
    }

    const creator = db.users.find(u => u.role === 'Creator');
    if (creator) stakeholders.add(creator.id);
    stakeholders.delete(userId);

    stakeholders.forEach(sId => {
      if (sId) {
        db.notifications.push({
          id: db.notificationIdCounter++,
          userId: sId,
          message: `Project ${project.name} status updated to: ${status}`,
          read: false,
          timestamp: new Date(),
        });
      }
    });

    res.json({ success: true, project });
  },
);

router.delete(
  "/api/projects/:id",
  auth,
  requireRole(["Creator"]),
  (req, res) => {
    const { id } = req.params;
    const projectId = parseInt(id as any);
    const projectIndex = db.projects.findIndex((p) => p.id === projectId);
    if (projectIndex === -1) return res.status(404).json({ error: "Project not found" });

    const project = db.projects[projectIndex];
    db.projects.splice(projectIndex, 1);
    db.teams = db.teams.filter((t) => t.projectId != projectId);
    db.tasks = db.tasks.filter((t) => t.projectId != projectId);
    db.activityFeed = (db.activityFeed || []).filter((a: any) => a.projectId != projectId);
    db.notifications = (db.notifications || []).filter((n: any) => n.projectId != projectId);

    res.json({ success: true, projectId });
  },
);

router.post(
  "/api/projects/:id/bid-drop",
  auth,
  requireRole(["Creator"]),
  (req, res) => {
    const { id } = req.params;
    const project = db.projects.find((p) => p.id == (id as any));
    if (!project) return res.status(404).json({ error: "Project not found" });

    project.bidDropped = true;
    project.status = "Bid Dropped";

    res.json({ success: true, project });
  },
);

router.post(
  "/api/projects/:id/revert-bid-drop",
  auth,
  requireRole(["Creator"]),
  (req, res) => {
    const { id } = req.params;
    const project = db.projects.find((p) => p.id == (id as any));
    if (!project) return res.status(404).json({ error: "Project not found" });

    project.bidDropped = false;
    project.status = "In Progress";
    syncExperiencesForProject(project.id);

    res.json({ success: true, project });
  },
);

router.post(
  "/api/projects/:id/assign-senior-lead",
  auth,
  requireRole(["HOD", "Creator"]),
  (req: any, res: any) => {
    const { id } = req.params;
    const { seniorLeadId } = req.body;
    const project = db.projects.find((p) => p.id == (id as any));
    if (project) {
      if (req.user.role === "HOD" && !canHodManageProject(req.user, project)) {
        return res.status(403).json({ error: "This HOD can only assign leads within their assigned category scope" });
      }
      project.seniorLeadId = parseInt(seniorLeadId);
      if (!VALID_PROJECT_STATUSES.includes(project.status)) {
        project.status = "In Progress";
      }

      db.notifications.push({
        id: db.notificationIdCounter++,
        userId: project.seniorLeadId,
        message: `You have been assigned to lead project: ${project.name}`,
        read: false,
        timestamp: new Date(),
      });

      syncExperiencesForProject(project.id);

      res.json(project);
    } else {
      res.status(404).json({ error: "Project not found" });
    }
  },
);

router.post(
  "/api/projects/:id/complete",
  auth,
  requireRole(["Senior Lead", "HOD"]),
  (req: any, res: any) => {
    const { id } = req.params;
    const project = db.projects.find((p) => p.id == (id as any));

    if (project) {
      if (req.user.role === "Senior Lead" && !isSeniorLeadForProject(req.user.id, project)) {
        return res.status(403).json({ error: "You can only complete projects assigned to you" });
      }
      if (req.user.role === "HOD" && !canHodManageProject(req.user, project)) {
        return res.status(403).json({ error: "This HOD can only manage projects in their assigned category scope" });
      }
      if (!ensureProjectCanComplete(project, res)) return;
      project.status = "Completed";
      project.bidDropped = false;
      creditProjectExperience(project);

      res.json(project);
    } else {
      res.status(404).json({ error: "Project not found" });
    }
  },
);

router.get("/api/teams", auth, (req, res) => {
  res.json(db.teams);
});

router.patch(
  "/api/teams/:id/update",
  auth,
  requireRole(["Senior Lead", "HOD"]),
  (req: any, res: any) => {
    const { teamLeadId, members } = req.body;
    const team = db.teams.find((t) => t.id == (req.params.id as any));
    if (team) {
      const project = db.projects.find(p => p.id === team.projectId);
      if (!project || !canManageProjectTeam(req.user, project)) {
        return res.status(403).json({ error: "You can only manage teams for projects assigned to you" });
      }
      const parsedTeamLeadId = parseInt(teamLeadId);
      const parsedMembers = (members || []).map((memberId: any) => parseInt(memberId));
      const allocationError = validateProjectAllocation([parsedTeamLeadId, ...parsedMembers], project.id);
      if (allocationError) return res.status(400).json({ error: allocationError });

      team.teamLeadId = parsedTeamLeadId;
      team.members = parsedMembers;
      
      syncExperiencesForProject(project.id);

      res.json(team);
    } else {
      res.status(404).json({ error: "Team not found" });
    }
  },
);

router.post(
  "/api/teams/create",
  auth,
  requireRole(["Senior Lead", "HOD"]),
  (req: any, res: any) => {
    const { projectId, teamLeadId, members } = req.body;

    const project = db.projects.find((p) => p.id == projectId);
    if (!project) return res.status(404).json({ error: "Project not found" });
    if (!canManageProjectTeam(req.user, project)) {
      return res.status(403).json({ error: "You can only form teams for projects assigned to you" });
    }
    if (project.teamId) {
      return res.status(400).json({ error: "Team already exists. Update the existing team to add members." });
    }

    const parsedTeamLeadId = parseInt(teamLeadId);
    const parsedMembers = (members || []).map((memberId: any) => parseInt(memberId));
    const allocationError = validateProjectAllocation([parsedTeamLeadId, ...parsedMembers], project.id);
    if (allocationError) return res.status(400).json({ error: allocationError });

    const teamId = db.teamIdCounter++;
    const team = { id: teamId, projectId, teamLeadId: parsedTeamLeadId, members: parsedMembers };
    db.teams.push(team);

    project.teamId = teamId;

    syncExperiencesForProject(project.id);

    res.json(team);
  },
);

router.post(
  "/api/teams/:id/remove-member",
  auth,
  requireRole(["Senior Lead", "HOD"]),
  (req: any, res: any) => {
    const { userId } = req.body;
    const team = db.teams.find(t => t.id == (req.params.id as any));
    if (!team) return res.status(404).json({ error: "Team not found" });

    const project = db.projects.find(p => p.id === team.projectId);
    if (!project || !canManageProjectTeam(req.user, project)) {
      return res.status(403).json({ error: "You can only manage teams for projects assigned to you" });
    }

    if (team.teamLeadId === userId) {
        return res.status(400).json({ error: "Cannot remove Team Lead. Reassign Lead first." });
    }

    team.members = team.members.filter((m: number) => m !== userId);

    syncExperiencesForProject(project.id);

    res.json({ success: true, team });
  }
);

router.get("/api/tasks", auth, (req: any, res: any) => {
  const userId = req.user.id;
  const userRole = req.user.role;

  let filteredTasks: any[] = [];
  
  // HOD, Creator, Senior Lead cannot see any tasks
  if (userRole === "Creator" || userRole === "HOD" || userRole === "Senior Lead") {
    filteredTasks = [];
  } 
  // Members: only see tasks from their team
  else if (userRole === "Member") {
    // Get teams where this user is a member or team lead
    const userTeams = db.teams.filter(t => t.members?.includes(userId) || t.teamLeadId === userId);
    const teamIds = userTeams.map(t => t.id);
    const projectIds = userTeams.map(t => t.projectId);
    
    // Get tasks that are:
    // 1. From a team the user is in (by teamId)
    // 2. From a project the user's team is assigned to (by projectId)
    // 3. Directly assigned to the user
    filteredTasks = db.tasks.filter(t => 
      (t.teamId && teamIds.includes(t.teamId)) ||
      (t.projectId && projectIds.includes(t.projectId)) ||
      t.assignedToId === userId
    );
  }

  const tasksWithInfo = filteredTasks
  .slice()
  .sort((a, b) => {
    const timeA = a.createdAt ? new Date(a.createdAt).getTime() : a.id || 0;
    const timeB = b.createdAt ? new Date(b.createdAt).getTime() : b.id || 0;
    return timeB - timeA;
  })
  .map(t => {
    const project = db.projects.find(p => p.id == t.projectId);
    const assignedUser = db.users.find(u => u.id == t.assignedToId);
    return {
      ...t,
      projectCode: project?.projectCode || `LT-${new Date(project?.createdAt || Date.now()).getFullYear()}-${String(project?.id).padStart(3, '0')}`,
      projectName: project?.name,
      assignedToName: assignedUser?.name || 'Unassigned'
    };
  });
  res.json(tasksWithInfo);
});

router.post("/api/tasks/create", auth, (req: any, res: any) => {
  const isSeniorLead = req.user.role === "Senior Lead";
  const isTeamLeadForProject = db.teams.some(
    (team) =>
      team.projectId == req.body.projectId && team.teamLeadId == req.user.id,
  );

  if (!isSeniorLead && !isTeamLeadForProject) {
    return res
      .status(403)
      .json({
        error: "Forbidden. Must be Senior Lead or Team Lead for this project.",
      });
  }

  if (isSeniorLead) {
    const project = db.projects.find(p => p.id == req.body.projectId);
    if (!project || !isSeniorLeadForProject(req.user.id, project)) {
      return res.status(403).json({ error: "You can only create tasks for projects assigned to you" });
    }
  }

  // Find the team associated with this project
  const project = db.projects.find(p => p.id == req.body.projectId);
  const teamId = project?.teamId || null;

  const task = {
    id: db.taskIdCounter++,
    assignedBy: req.user.id,
    ...req.body,
    teamId: teamId,
    assignedToId: req.body.assignedToId ? parseInt(req.body.assignedToId) : null,
    status: "To Do",
    progress: 0,
    stage: req.body.stage || "None", // Assigned to a project stage
    createdAt: new Date(),
  };
  db.tasks.push(task);

  if (task.assignedToId) {
    db.notifications.push({
      id: db.notificationIdCounter++,
      userId: task.assignedToId,
      message: `You have been assigned a new task: ${task.title}`,
      read: false,
      timestamp: new Date(),
    });
  }

  res.json(task);
});

router.patch("/api/tasks/:id/status", auth, (req: any, res: any) => {
  const userId = req.user.id;
  const userRole = req.user.role;
  const task = db.tasks.find((t) => t.id == (req.params.id as any));
  if (!task) return res.status(404).json({ error: "Task not found" });

  const project = db.projects.find(p => p.id === task.projectId);
  const team = project ? db.teams.find(t => t.id === project.teamId) : null;
  const isTeamLead = team?.teamLeadId === userId;
  const isSeniorOrHod = ["Senior Lead", "HOD", "Creator"].includes(userRole);
  const isAssignedMember = task.assignedToId === userId;

  if (!isTeamLead && !isSeniorOrHod && !isAssignedMember) {
    return res.status(403).json({ error: "Only Team Lead, senior management, or the assigned member can update task status" });
  }

  if (task) {
    const oldStatus = task.status;
    const nextStatus = req.body.status;
    const rating = Number(req.body.rating);
    if (nextStatus === "Completed" && isTeamLead && (!rating || rating < 1 || rating > 5)) {
      return res.status(400).json({ error: "Team Lead must provide a 1-5 star performance rating when completing a task" });
    }
    task.status = req.body.status;
    if (req.body.status === "Completed") task.progress = 100;
    if (req.body.status === "Completed" && isTeamLead) {
      upsertTaskPerformanceReview(task, req.user, rating, req.body.reviewNotes);
    }
    if (oldStatus !== task.status) {
      db.activityFeed.push({
        id: db.activityIdCounter++,
        userId: req.user.id,
        taskId: task.id,
        taskTitle: task.title,
        oldStatus,
        newStatus: task.status,
        timestamp: new Date(),
      });

      if (task.status === "Completed") {
        db.notifications.push({
          id: db.notificationIdCounter++,
          userId: task.assignedBy,
          message: `Task completed: ${task.title} (by ${req.user.name})`,
          read: false,
          timestamp: new Date(),
        });
      }
    }
    res.json(task);
  } else {
    res.status(404).json({ error: "Task not found" });
  }
});

router.patch("/api/tasks/:id/edit", auth, (req: any, res: any) => {
  const taskId = parseInt(req.params.id);
  const task = db.tasks.find(t => t.id === taskId);
  if (!task) return res.status(404).json({ error: "Task not found" });

  const isAssignedBy = task.assignedBy === req.user.id;
  const isSeniorLead = req.user.role === "Senior Lead";
  const taskProject = db.projects.find(p => p.id === task.projectId);

  if (!isAssignedBy && !isSeniorLead) {
    return res.status(403).json({ error: "Only the creator or a Senior Lead can edit this task" });
  }

  if (isSeniorLead && (!taskProject || !isSeniorLeadForProject(req.user.id, taskProject))) {
    return res.status(403).json({ error: "You can only edit tasks for projects assigned to you" });
  }

  const { title, assignedToId, stage, startDate, endDate, priority } = req.body;
  if (title) task.title = title;
  if (assignedToId) task.assignedToId = parseInt(assignedToId);
  if (stage) task.stage = stage;
  if (startDate) task.startDate = startDate;
  if (endDate) task.endDate = endDate;
  if (priority) task.priority = priority;

  res.json({ success: true, task });
});

router.delete("/api/tasks/:id", auth, (req: any, res: any) => {
  const taskId = parseInt(req.params.id);
  const taskIndex = db.tasks.findIndex(t => t.id === taskId);
  if (taskIndex === -1) return res.status(404).json({ error: "Task not found" });

  const task = db.tasks[taskIndex];
  const isAssignedBy = task.assignedBy === req.user.id;
  const isSeniorLead = req.user.role === "Senior Lead";
  const taskProject = db.projects.find(p => p.id === task.projectId);

  if (!isAssignedBy && !isSeniorLead) {
    return res.status(403).json({ error: "Only the creator or a Senior Lead can delete this task" });
  }

  if (isSeniorLead && (!taskProject || !isSeniorLeadForProject(req.user.id, taskProject))) {
    return res.status(403).json({ error: "You can only delete tasks for projects assigned to you" });
  }

  db.tasks.splice(taskIndex, 1);
  res.json({ success: true });
});

router.get("/api/users/me/activity", auth, (req: any, res: any) => {
  const activities = db.activityFeed
    .filter((a) => a.userId === req.user.id)
    .sort((a, b) => {
      const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return timeB - timeA;
    })
    .slice(0, 10);
  res.json(activities);
});

// Get tasks grouped by completed projects (for archive view)
router.get("/api/tasks/completed-projects", auth, (req: any, res: any) => {
  const userId = req.user.id;
  const userRole = req.user.role;

  // Get all completed projects visible to this user
  let completedProjects = db.projects.filter(p => p.status === "Completed");

  if (userRole === "Member") {
    const userTeams = db.teams.filter(t => t.members?.includes(userId) || t.teamLeadId === userId);
    const projectIds = new Set(userTeams.map(t => t.projectId));
    completedProjects = completedProjects.filter(p => projectIds.has(p.id));
  } else if (userRole === "Senior Lead") {
    completedProjects = completedProjects.filter(p => p.seniorLeadId === userId);
  } else if (userRole === "HOD") {
    completedProjects = completedProjects.filter(p => canHodManageProject(req.user, p));
  }
  // Creator sees all

  const result = completedProjects
    .sort((a, b) => {
      const ta = a.endDate ? new Date(a.endDate).getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
      const tb = b.endDate ? new Date(b.endDate).getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
      return tb - ta;
    })
    .map(project => {
      const projectTasks = db.tasks.filter(t => t.projectId === project.id);
      const team = db.teams.find(t => t.id === project.teamId || t.projectId === project.id);
      const seniorLead = db.users.find(u => u.id === project.seniorLeadId);
      const hod = db.users.find(u => u.id === project.hodId);

      const tasksWithDetails = projectTasks.map(task => {
        const assignedUser = db.users.find(u => u.id === task.assignedToId);
        const review = db.performanceReviews.find((r: any) => r.taskId === task.id);
        return {
          id: task.id,
          title: task.title,
          status: task.status,
          priority: task.priority || "Medium",
          stage: task.stage,
          startDate: task.startDate,
          endDate: task.endDate,
          assignedToId: task.assignedToId,
          assignedToName: assignedUser?.name || "Unassigned",
          rating: task.rating || review?.rating || null,
          reviewNotes: task.reviewNotes || review?.notes || "",
          reviewedAt: task.reviewedAt || review?.reviewedAt || null,
          reviewedBy: db.users.find(u => u.id === (task.reviewedBy || review?.reviewerId))?.name || null,
        };
      });

      const completedTasks = tasksWithDetails.filter(t => t.status === "Completed");
      const avgRating = completedTasks.filter(t => t.rating).length > 0
        ? Number((completedTasks.filter(t => t.rating).reduce((sum, t) => sum + (t.rating || 0), 0) / completedTasks.filter(t => t.rating).length).toFixed(2))
        : null;

      const teamMembers = team ? db.users.filter(u => team.members?.includes(u.id) || u.id === team.teamLeadId).map(u => ({
        id: u.id,
        name: u.name,
        role: u.id === team.teamLeadId ? "Team Lead" : "Member"
      })) : [];

      return {
        projectId: project.id,
        projectCode: project.projectCode,
        projectName: project.name,
        category: project.category,
        categoryColor: (db.categories || []).find((c: any) => c.name === project.category)?.color,
        startDate: project.startDate,
        endDate: project.endDate,
        tenderOutcome: project.tenderOutcome,
        hod: hod ? { id: hod.id, name: hod.name } : null,
        seniorLead: seniorLead ? { id: seniorLead.id, name: seniorLead.name } : null,
        teamMembers,
        tasks: tasksWithDetails,
        taskCount: tasksWithDetails.length,
        completedTaskCount: completedTasks.length,
        averageRating: avgRating,
      };
    });

  res.json(result);
});



router.get("/api/notifications", auth, (req: any, res: any) => {
  const notifications = db.notifications
    .filter((n) => n.userId === req.user.id)
    .sort((a, b) => {
      const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return timeB - timeA;
    });
  res.json(notifications);
});

router.patch("/api/notifications/:id/read", auth, (req: any, res: any) => {
  const notif = db.notifications.find(
    (n) => n.id == req.params.id && n.userId === req.user.id,
  );
  if (notif) {
    notif.read = true;
    res.json(notif);
  } else {
    res.status(404).json({ error: "Notification not found" });
  }
});

router.patch("/api/notifications/read-all", auth, (req: any, res: any) => {
  const unread = db.notifications.filter(
    (n) => n.userId === req.user.id && !n.read,
  );
  unread.forEach((n) => (n.read = true));
  res.json({ success: true, updatedCount: unread.length });
});

// Stage completion endpoints
router.post("/api/projects/:id/complete-stage", auth, (req: any, res: any) => {
  const { id } = req.params;
  const { stage } = req.body;
  const project = db.projects.find((p) => p.id == (id as any));
  
  if (!project) return res.status(404).json({ error: "Project not found" });
  
  // Allow Team Lead, matching HOD, or Creator to mark stages
  const team = db.teams.find(t => t.id === project.teamId);
  const isTeamLead = team?.teamLeadId === req.user.id;
  const isCreator = req.user.role === 'Creator';
  const isAllowedHod = req.user.role === 'HOD' && canHodManageProject(req.user, project);
  
  if (!isTeamLead && !isCreator && !isAllowedHod) {
    return res.status(403).json({ error: "Only Team Lead, matching HOD, or Creator can update stages" });
  }
  
  if (!project.completedStages) project.completedStages = [];
  
  if (!project.completedStages.includes(stage)) {
    project.completedStages.push(stage);
  }

  if (hasCompletedAllStages(project) && project.status !== "Completed") {
    project.status = "Completed";
    project.bidDropped = false;
    creditProjectExperience(project);
  }
  
  res.json({ success: true, completedStages: project.completedStages, project });
});

// Remove stage from completed
router.delete("/api/projects/:id/complete-stage/:stage", auth, (req: any, res: any) => {
  const { id, stage } = req.params;
  const project = db.projects.find((p) => p.id == (id as any));
  
  if (!project) return res.status(404).json({ error: "Project not found" });
  
  // Allow Team Lead, matching HOD, or Creator
  const team = db.teams.find(t => t.id === project.teamId);
  const isTeamLead = team?.teamLeadId === req.user.id;
  const isCreator = req.user.role === 'Creator';
  const isAllowedHod = req.user.role === 'HOD' && canHodManageProject(req.user, project);
  
  if (!isTeamLead && !isCreator && !isAllowedHod) {
    return res.status(403).json({ error: "Only Team Lead, matching HOD, or Creator can update stages" });
  }
  
  if (!project.completedStages) project.completedStages = [];
  project.completedStages = project.completedStages.filter((s: string) => s !== stage);
  if (project.status === "Completed") {
    project.status = "In Progress";
    project.bidDropped = false;
    syncExperiencesForProject(project.id);
  }
  
  res.json({ success: true, completedStages: project.completedStages, project });
});

// Record tender outcome
router.post("/api/projects/:id/tender-outcome", auth, requireRole(["Creator"]), (req: any, res: any) => {
  const { id } = req.params;
  const { result, ranking, remarks } = req.body;
  const project = db.projects.find((p) => p.id == (id as any));
  
  if (!project) return res.status(404).json({ error: "Project not found" });
  if (project.status !== "Completed") {
    return res.status(400).json({ error: "Project must be completed to record outcome" });
  }
  
  if (!["Success", "Fail"].includes(result)) {
    return res.status(400).json({ error: "Invalid result. Must be Success or Fail" });
  }
  
  const outcome = {
    projectId: project.id,
    projectCode: project.projectCode,
    projectName: project.name,
    result,
    ranking: result === "Fail" ? (ranking || null) : null,
    remarks: result === "Fail" ? (remarks || null) : null,
    recordedAt: new Date(),
  };
  
  project.tenderOutcome = outcome;
  db.tenderOutcomes.push(outcome);
  if (result === "Success") {
    syncExperiencesForProject(project.id);
  }
  
  res.json({ success: true, outcome });
});

const getAnalyticsOutcomesForUser = (user: any) => {
  const outcomeByProject = new Map<number, any>();
  db.projects.forEach((project: any) => {
    if (project.tenderOutcome) {
      outcomeByProject.set(project.id, {
        ...project.tenderOutcome,
        projectId: project.id,
        projectCode: project.projectCode,
        projectName: project.name,
      });
    }
  });
  db.tenderOutcomes.forEach((outcome: any) => outcomeByProject.set(outcome.projectId, outcome));
  const allOutcomes = Array.from(outcomeByProject.values());

  if (user.role === "Creator" || user.role === "Viewer") return allOutcomes;

  const visibleProjectIds = new Set<number>();

  if (user.role === "HOD") {
    db.projects.filter(p => !isBidDroppedProject(p) && canHodManageProject(user, p)).forEach(p => visibleProjectIds.add(p.id));
  } else if (user.role === "Senior Lead") {
    db.projects
      .filter(p => p.seniorLeadId === user.id && !isBidDroppedProject(p))
      .forEach(p => visibleProjectIds.add(p.id));
  } else if (user.role === "Member") {
    db.teams
      .filter(t => t.teamLeadId === user.id || t.members?.includes(user.id))
      .forEach(t => {
        const project = db.projects.find(p => p.id === t.projectId);
        if (project && !isBidDroppedProject(project)) visibleProjectIds.add(project.id);
      });
  }

  return allOutcomes.filter(o => visibleProjectIds.has(o.projectId));
};

// Analytics endpoint
router.get("/api/analytics/tender-outcomes", auth, (req: any, res: any) => {
  const outcomes = getAnalyticsOutcomesForUser(req.user);
  
  const totalParticipated = outcomes.length;
  const totalSuccess = outcomes.filter((o: any) => o.result === "Success").length;
  const totalFailed = outcomes.filter((o: any) => o.result === "Fail").length;
  
  const successRate = totalParticipated > 0 ? ((totalSuccess / totalParticipated) * 100).toFixed(2) : "0.00";
  const failureRate = totalParticipated > 0 ? ((totalFailed / totalParticipated) * 100).toFixed(2) : "0.00";
  
  // Ranking distribution for failed tenders
  const failedByRanking: { [key: number]: number } = {};
  outcomes.filter((o: any) => o.result === "Fail" && o.ranking).forEach((o: any) => {
    failedByRanking[o.ranking] = (failedByRanking[o.ranking] || 0) + 1;
  });
  
  const avgFailurePosition = outcomes.length > 0 
    ? (outcomes
        .filter((o: any) => o.result === "Fail" && o.ranking)
        .reduce((sum: number, o: any) => sum + (o.ranking || 0), 0) / 
        outcomes.filter((o: any) => o.result === "Fail" && o.ranking).length).toFixed(2)
    : "0.00";
  
  res.json({
    totalParticipated,
    totalSuccess,
    totalFailed,
    successRate: parseFloat(successRate),
    failureRate: parseFloat(failureRate),
    failedByRanking,
    averageFailurePosition: parseFloat(avgFailurePosition),
    details: outcomes
  });
});

router.get("/api/analytics/performance", auth, (req: any, res: any) => {
  const reviews = (db.performanceReviews || []).filter((review: any) => {
    const project = db.projects.find(p => p.id === review.projectId);
    if (!project || isBidDroppedProject(project)) return false;

    if (req.user.role === "Creator" || req.user.role === "Viewer") return true;
    if (req.user.role === "HOD") return canHodManageProject(req.user, project);
    if (req.user.role === "Senior Lead") return project.seniorLeadId === req.user.id;
    if (req.user.role === "Member") {
      const team = db.teams.find(t => t.id === review.teamId || t.projectId === review.projectId);
      return review.memberId === req.user.id || team?.teamLeadId === req.user.id || team?.members?.includes(req.user.id);
    }
    return false;
  });

  const memberUsers = db.users.filter((user: any) => user.role === "Member");
  const memberName = (id: number) => memberUsers.find((user: any) => user.id === id)?.name || "Unknown Member";
  const avg = (items: any[]) => items.length ? Number((items.reduce((sum, item) => sum + Number(item.rating || 0), 0) / items.length).toFixed(2)) : 0;
  const daysBetween = (start?: string, end?: string) => {
    if (!start || !end) return null;
    const diff = Math.ceil(Math.abs(new Date(end).getTime() - new Date(start).getTime()) / 86400000);
    return Number.isFinite(diff) ? diff : null;
  };

  const memberPerformance = memberUsers.map((member: any) => {
    const memberReviews = reviews.filter((review: any) => review.memberId === member.id);
    const completedProjects = Object.values(memberReviews.reduce((acc: any, review: any) => {
      const project = db.projects.find((p: any) => p.id === review.projectId);
      if (!project || project.status !== "Completed") return acc;
      acc[review.projectId] = acc[review.projectId] || {
        projectId: review.projectId,
        projectName: review.projectName,
        category: review.category,
        reviews: [],
      };
      acc[review.projectId].reviews.push(review);
      return acc;
    }, {})).map((item: any) => ({
      projectId: item.projectId,
      projectName: item.projectName,
      category: item.category,
      averageRating: avg(item.reviews),
      taskCount: item.reviews.length,
      tasks: item.reviews.map((review: any) => ({
        taskTitle: review.taskTitle,
        rating: review.rating,
        notes: review.notes,
        reviewedAt: review.reviewedAt,
      })),
    }));
    return {
      memberId: member.id,
      memberName: member.name,
      averageRating: avg(memberReviews),
      reviewsCount: memberReviews.length,
      completedTasks: memberReviews.length,
      completedProjects,
      bestCategory: Object.entries(
        memberReviews.reduce((acc: any, review: any) => {
          acc[review.category] = acc[review.category] || [];
          acc[review.category].push(review);
          return acc;
        }, {})
      )
        .map(([category, items]: [string, any]) => ({ category, averageRating: avg(items) }))
        .sort((a, b) => b.averageRating - a.averageRating)[0]?.category || "No ratings yet",
    };
  }).filter((member: any) => member.reviewsCount > 0);

  const taskWiseAnalytics = Object.values(
    reviews.reduce((acc: any, review: any) => {
      acc[review.taskTitle] = acc[review.taskTitle] || { taskTitle: review.taskTitle, reviews: [] };
      acc[review.taskTitle].reviews.push(review);
      return acc;
    }, {})
  ).map((group: any) => {
    const top = [...group.reviews].sort((a: any, b: any) => b.rating - a.rating)[0];
    return {
      taskTitle: group.taskTitle,
      averageRating: avg(group.reviews),
      reviewsCount: group.reviews.length,
      topMember: memberName(top.memberId),
      topRating: top.rating,
      projectName: top.projectName,
    };
  }).sort((a: any, b: any) => b.averageRating - a.averageRating);

  const projectTeamAnalytics = db.projects
    .filter((project: any) => !isBidDroppedProject(project))
    .map((project: any) => {
      const projectReviews = reviews.filter((review: any) => review.projectId === project.id);
      const team = db.teams.find(t => t.id === project.teamId || t.projectId === project.id);
      const top = [...projectReviews].sort((a: any, b: any) => b.rating - a.rating)[0];
      return {
        projectId: project.id,
        projectName: project.name,
        projectCode: project.projectCode,
        category: project.category || "General",
        averageRating: avg(projectReviews),
        reviewsCount: projectReviews.length,
        durationDays: daysBetween(project.startDate, project.endDate),
        teamLead: team ? memberName(team.teamLeadId) : "Not formed",
        teamSize: team ? (team.members || []).length + 1 : 0,
        topMember: top ? memberName(top.memberId) : "No ratings yet",
      };
    })
    .filter((project: any) => project.reviewsCount > 0)
    .sort((a: any, b: any) => b.averageRating - a.averageRating);

  const categoryAnalytics = Object.values(
    reviews.reduce((acc: any, review: any) => {
      acc[review.category] = acc[review.category] || { category: review.category, reviews: [] };
      acc[review.category].reviews.push(review);
      return acc;
    }, {})
  ).map((group: any) => {
    const memberGroups = Object.values(group.reviews.reduce((acc: any, review: any) => {
      acc[review.memberId] = acc[review.memberId] || { memberId: review.memberId, reviews: [] };
      acc[review.memberId].reviews.push(review);
      return acc;
    }, {})).map((item: any) => ({
      memberId: item.memberId,
      memberName: memberName(item.memberId),
      averageRating: avg(item.reviews),
      reviewsCount: item.reviews.length,
    })).sort((a: any, b: any) => b.averageRating - a.averageRating);

    return {
      category: group.category,
      averageRating: avg(group.reviews),
      reviewsCount: group.reviews.length,
      topMembers: memberGroups.slice(0, 3),
    };
  }).sort((a: any, b: any) => b.averageRating - a.averageRating);

  res.json({
    summary: {
      totalReviews: reviews.length,
      averageRating: avg(reviews),
      membersRated: new Set(reviews.map((review: any) => review.memberId)).size,
      projectsRated: new Set(reviews.map((review: any) => review.projectId)).size,
    },
    memberPerformance: memberPerformance.sort((a: any, b: any) => b.averageRating - a.averageRating),
    taskWiseAnalytics,
    projectTeamAnalytics,
    categoryAnalytics,
    projectRatings: projectTeamAnalytics.map((project: any) => ({
      name: project.projectName,
      rating: project.averageRating,
      durationDays: project.durationDays || 0,
    })),
    recentReviews: reviews
      .slice()
      .sort((a: any, b: any) => new Date(b.reviewedAt).getTime() - new Date(a.reviewedAt).getTime())
      .slice(0, 12)
      .map((review: any) => ({
        ...review,
        memberName: memberName(review.memberId),
        reviewerName: db.users.find((user: any) => user.id === review.reviewerId)?.name || "Team Lead",
      })),
  });
});

export default router;
