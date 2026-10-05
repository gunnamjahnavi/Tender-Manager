import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar as CalendarIcon, CheckCircle, Activity, LayoutGrid, Kanban, CalendarDays, 
  ChartBar, ExternalLink, Shield, ListTodo, Filter, FolderOpen, Star, ChevronDown, 
  ChevronUp, Clock, AlertCircle, Archive, Layers
} from 'lucide-react';
import { KanbanBoard } from '../components/views/KanbanBoard';
import { UnifiedCalendarView } from '../components/views/UnifiedCalendar';
import { GanttChart } from '../components/views/GanttChart';
import { ProjectStatusStepper } from '../components/ProjectStatusStepper';
import { ProjectDetailModal } from '../components/ProjectDetailModal';
import { getDisplayStatus, getProjectStageDeadlines, getProjectStages, getStatusPillClass, isBidDroppedProject } from '../constants/project';

const StarRating = ({ rating }: { rating: number }) => (
  <div className="flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map(s => (
      <Star key={s} className={`w-3 h-3 ${s <= Math.round(rating) ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`} />
    ))}
  </div>
);

const priorityColors: Record<string, string> = {
  High: 'bg-red-50 text-red-600 border-red-100',
  Medium: 'bg-amber-50 text-amber-600 border-amber-100',
  Low: 'bg-green-50 text-green-600 border-green-100',
};

const statusColors: Record<string, string> = {
  'To Do': 'bg-gray-50 text-gray-500 border-gray-200',
  'In Progress': 'bg-blue-50 text-blue-600 border-blue-100',
  'Completed': 'bg-green-50 text-green-600 border-green-100',
};

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export function MemberDashboard() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [completedProjectData, setCompletedProjectData] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('Overview');
  const [detailProject, setDetailProject] = useState<any>(null);

  // All Tasks filters
  const [taskFilterMonth, setTaskFilterMonth] = useState<string>('All');
  const [taskFilterProject, setTaskFilterProject] = useState<string>('All');
  const [taskFilterStatus, setTaskFilterStatus] = useState<string>('All');
  const [expandedCompletedProject, setExpandedCompletedProject] = useState<number | null>(null);

  const fetchData = async () => {
    const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
    
    const [tRes, aRes, pRes, uRes, cpRes] = await Promise.all([
      fetch('/api/tasks', { headers }),
      fetch('/api/users/me/activity', { headers }),
      fetch('/api/projects?excludeBidDropped=true', { headers }),
      fetch('/api/users', { headers }),
      fetch('/api/tasks/completed-projects', { headers }),
    ]);
    
    if (tRes.ok) setTasks(await tRes.json());
    if (aRes.ok) setActivities(await aRes.json());
    if (pRes.ok) setProjects(await pRes.json());
    if (uRes.ok) setUsers(await uRes.json());
    if (cpRes.ok) setCompletedProjectData(await cpRes.json());
  };

  useEffect(() => {
    fetchData();
  }, []);

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const isUserAssignedToProject = (p: any) => {
    const teamDetails = p.teamDetails;
    if (!teamDetails) return false;
    const isLead = teamDetails.leader?.id === user.id;
    const isMember = teamDetails.members?.some((m: any) => m.id === user.id);
    return isLead || isMember;
  };

  const myProjects = projects.filter(p => !isBidDroppedProject(p) && isUserAssignedToProject(p));
  const myProjectIds = myProjects.map(p => p.id);

  const myTasks = tasks.filter(t => t.assignedToId == user.id).map(t => {
    const assignee = users.find(u => u.id == t.assignedToId);
    return { ...t, assignedToName: t.assignedToName && t.assignedToName !== 'Unassigned' ? t.assignedToName : (assignee?.name || 'Unassigned') };
  });

  const accessibleProjectTasks = tasks.map(t => {
    const assignee = users.find(u => u.id == t.assignedToId);
    return { ...t, assignedToName: t.assignedToName && t.assignedToName !== 'Unassigned' ? t.assignedToName : (assignee?.name || 'Unassigned') };
  });

  const pendingTasks = myTasks.filter(t => t.status !== 'Completed');
  const completedTasks = myTasks.filter(t => t.status === 'Completed');

  // All tasks filtering
  const allTasksFiltered = useMemo(() => {
    return myTasks.filter(t => {
      if (taskFilterStatus !== 'All' && t.status !== taskFilterStatus) return false;
      if (taskFilterProject !== 'All' && String(t.projectId) !== taskFilterProject) return false;
      if (taskFilterMonth !== 'All') {
        const d = t.createdAt ? new Date(t.createdAt) : null;
        if (!d || MONTHS[d.getMonth()] !== taskFilterMonth) return false;
      }
      return true;
    });
  }, [myTasks, taskFilterMonth, taskFilterProject, taskFilterStatus]);

  const changeTaskStatus = async (taskId: number, newStatus: string) => {
    await fetch(`/api/tasks/${taskId}/status`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });
    fetchData();
  };

  const toggleTaskStatus = async (taskId: number, currentStatus: string) => {
    const newStatus = currentStatus === 'Completed' ? 'In Progress' : 'Completed';
    await changeTaskStatus(taskId, newStatus);
  };

  const tabs = [
    { name: 'Overview', icon: LayoutGrid },
    { name: 'All Tasks', icon: ListTodo },
    { name: 'Task Archive', icon: Archive },
    { name: 'Kanban', icon: Kanban },
    { name: 'Calendar', icon: CalendarDays },
    { name: 'Gantt Chart', icon: ChartBar },
  ];

  // Project options for filter dropdown
  const projectOptions = useMemo(() => {
    const seen = new Set<string>();
    const opts: { id: string; name: string }[] = [];
    myTasks.forEach(t => {
      if (t.projectId && !seen.has(String(t.projectId))) {
        seen.add(String(t.projectId));
        opts.push({ id: String(t.projectId), name: t.projectName || `Project ${t.projectId}` });
      }
    });
    return opts;
  }, [myTasks]);

  return (
    <div className="space-y-6 text-[#333]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-primary-dark)]">Member Workspace</h1>
          <p className="text-sm text-[#666] mt-1">My tasks and project contributions</p>
        </div>
        {user?.isTeamLead && (
           <button 
             onClick={() => navigate('/dashboard/team-lead')}
             className="flex items-center gap-2 bg-amber-50 hover:bg-amber-100 text-amber-700 px-4 py-2 rounded-lg border border-amber-200 transition-all font-bold text-xs uppercase"
           >
             <Shield className="w-4 h-4" />
             Switch to Lead View
             <ExternalLink className="w-3.5 h-3.5 opacity-50" />
           </button>
        )}
      </div>

      {/* Tab Bar */}
      <div className="flex flex-wrap bg-white rounded-xl p-1 border border-gray-200 shadow-sm gap-1">
        {tabs.map(tab => (
          <button
            key={tab.name}
            onClick={() => setActiveTab(tab.name)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === tab.name ? 'bg-[var(--color-primary)] text-white shadow' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.name}
          </button>
        ))}
      </div>

      {/* ==================== OVERVIEW TAB ==================== */}
      {activeTab === 'Overview' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm text-center">
                <div className="text-2xl font-black text-[var(--color-primary)]">{myTasks.length}</div>
                <div className="text-[10px] uppercase font-bold text-gray-400 mt-1">Total Tasks</div>
              </div>
              <div className="bg-white rounded-xl p-4 border border-amber-100 shadow-sm text-center">
                <div className="text-2xl font-black text-amber-600">{pendingTasks.length}</div>
                <div className="text-[10px] uppercase font-bold text-amber-400 mt-1">Pending</div>
              </div>
              <div className="bg-white rounded-xl p-4 border border-green-100 shadow-sm text-center">
                <div className="text-2xl font-black text-green-600">{completedTasks.length}</div>
                <div className="text-[10px] uppercase font-bold text-green-400 mt-1">Completed</div>
              </div>
            </div>

            {/* Pending Tasks */}
            <div className="panel">
              <div className="panel-header border-none pb-0">
                <div className="panel-title flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-[var(--color-primary)]" /> My Pending Tasks
                  {pendingTasks.length > 0 && <span className="ml-auto bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full">{pendingTasks.length}</span>}
                </div>
              </div>
              {pendingTasks.length === 0 ? (
                <div className="mt-4 p-8 border-2 border-dashed border-[#e1e1e1] rounded text-center text-[#666] text-sm">
                  You are up to date! No pending tasks right now.
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  {pendingTasks.map(t => (
                    <div 
                      key={t.id} 
                      onClick={() => toggleTaskStatus(t.id, t.status)}
                      className="p-4 rounded-xl flex items-center justify-between border select-none transition-all cursor-pointer hover:border-[var(--color-primary)] bg-white border-gray-100 shadow-sm hover:shadow-md"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[9px] font-black text-blue-500 bg-blue-50 px-1 py-0 rounded border border-blue-100">{t.projectCode}</span>
                          {t.priority && <span className={`text-[9px] font-bold px-1.5 py-0 rounded border ${priorityColors[t.priority] || 'bg-gray-50 text-gray-500 border-gray-200'}`}>{t.priority}</span>}
                          <p className="font-bold text-sm truncate text-[#333]">{t.title}</p>
                        </div>
                        <p className="text-[10px] text-gray-500 font-medium">
                          {t.projectName} • <span className={`font-bold ${t.status === 'In Progress' ? 'text-blue-500' : 'text-gray-500'}`}>{t.status}</span>
                        </p>
                      </div>
                      <div className="w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 border-gray-300 ml-3">
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* My Projects */}
            <div className="panel">
              <div className="panel-header border-none pb-0">
                <div className="panel-title flex items-center gap-2">
                  <LayoutGrid className="w-5 h-5 text-[var(--color-primary)]" /> My Assigned Projects ({myProjects.length})
                </div>
              </div>
              {myProjects.length === 0 ? (
                <div className="mt-4 p-8 border-2 border-dashed border-[#e1e1e1] rounded text-center text-[#666] text-sm">No projects available</div>
              ) : (
                <div className="mt-6 space-y-6">
                  {myProjects.map(p => (
                    <div key={p.id} onClick={() => setDetailProject(p)} className="p-6 border border-gray-100 bg-white rounded-xl shadow-sm cursor-pointer hover:border-[var(--color-primary)] transition-colors">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-1 h-8 rounded-full" style={{ backgroundColor: p.categoryColor || '#CBD5E1' }}></div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{p.projectCode}</p>
                              <span className="text-[8px] uppercase font-bold text-white px-1 py-0.5 rounded" style={{ backgroundColor: p.categoryColor || '#6B7280' }}>{p.category}</span>
                            </div>
                            <h4 className="font-bold text-[var(--color-primary-dark)] text-base">{p.name}</h4>
                          </div>
                        </div>
                        <span className={`status-pill ${getStatusPillClass(getDisplayStatus(p))} px-4 py-1.5`}>{getDisplayStatus(p)}</span>
                      </div>
                      <div className="px-4 py-2 bg-gray-50/30 rounded-lg">
                        <ProjectStatusStepper 
                          completedStages={p.completedStages || []} 
                          stages={getProjectStages(p)} 
                          stageDeadlines={getProjectStageDeadlines(p)}
                          isReadOnly={true}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="panel">
              <div className="panel-header border-none pb-0">
                <div className="panel-title flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5 text-[var(--color-primary)]" /> Quick Actions
                </div>
              </div>
              <div className="mt-4 space-y-2">
                <button onClick={() => setActiveTab('All Tasks')} className="w-full text-left p-3 rounded-lg border border-gray-100 hover:border-blue-200 hover:bg-blue-50/20 transition-all text-sm font-medium text-gray-700 flex items-center gap-3">
                  <ListTodo className="w-4 h-4 text-[var(--color-primary)]" /> View All Tasks
                </button>
                <button onClick={() => setActiveTab('Task Archive')} className="w-full text-left p-3 rounded-lg border border-gray-100 hover:border-green-200 hover:bg-green-50/20 transition-all text-sm font-medium text-gray-700 flex items-center gap-3">
                  <Archive className="w-4 h-4 text-green-500" /> Completed Project Tasks
                </button>
                <button onClick={() => setActiveTab('Kanban')} className="w-full text-left p-3 rounded-lg border border-gray-100 hover:border-purple-200 hover:bg-purple-50/20 transition-all text-sm font-medium text-gray-700 flex items-center gap-3">
                  <Kanban className="w-4 h-4 text-purple-500" /> Kanban Board
                </button>
                <button onClick={() => setActiveTab('Calendar')} className="w-full text-left p-3 rounded-lg border border-gray-100 hover:border-amber-200 hover:bg-amber-50/20 transition-all text-sm font-medium text-gray-700 flex items-center gap-3">
                  <CalendarDays className="w-4 h-4 text-amber-500" /> Calendar View
                </button>
              </div>
            </div>

            <div className="panel">
              <div className="panel-header border-none pb-0">
                <div className="panel-title flex items-center gap-2">
                  <Activity className="w-5 h-5 text-[var(--color-primary)]" /> Activity Feed
                </div>
              </div>
              {activities.length === 0 ? (
                <div className="mt-4 p-6 border-2 border-dashed border-[#e1e1e1] rounded text-center text-[#666] text-sm">No recent activity.</div>
              ) : (
                <div className="mt-4 space-y-3">
                  {activities.map(a => (
                    <div key={a.id} className="text-sm flex flex-col pb-3 border-b border-[#e1e1e1] last:border-0 last:pb-0">
                      <p className="font-medium text-[var(--color-primary-dark)] text-xs">
                        <span className="font-bold">{a.taskTitle}</span>
                      </p>
                      <p className="text-xs text-[#666] mt-0.5">{a.oldStatus} ➔ {a.newStatus}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5 uppercase">{new Date(a.timestamp).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================== ALL TASKS TAB ==================== */}
      {activeTab === 'All Tasks' && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex flex-wrap items-center gap-3 mb-5">
              <div className="flex items-center gap-2 text-sm font-bold text-gray-700">
                <Filter className="w-4 h-4 text-[var(--color-primary)]" />
                Filter Tasks
              </div>
              
              {/* Month Filter */}
              <div className="flex items-center gap-1.5">
                <label className="text-[10px] uppercase font-bold text-gray-400">Month</label>
                <select
                  value={taskFilterMonth}
                  onChange={e => setTaskFilterMonth(e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-700 bg-white focus:border-[var(--color-primary)] outline-none"
                >
                  <option value="All">All Months</option>
                  {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>

              {/* Project Filter */}
              <div className="flex items-center gap-1.5">
                <label className="text-[10px] uppercase font-bold text-gray-400">Project</label>
                <select
                  value={taskFilterProject}
                  onChange={e => setTaskFilterProject(e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-700 bg-white focus:border-[var(--color-primary)] outline-none"
                >
                  <option value="All">All Projects</option>
                  {projectOptions.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-1.5">
                <label className="text-[10px] uppercase font-bold text-gray-400">Status</label>
                <select
                  value={taskFilterStatus}
                  onChange={e => setTaskFilterStatus(e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-700 bg-white focus:border-[var(--color-primary)] outline-none"
                >
                  <option value="All">All Status</option>
                  <option value="To Do">To Do</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>

              <div className="ml-auto text-sm text-gray-500 font-medium">
                {allTasksFiltered.length} task{allTasksFiltered.length !== 1 ? 's' : ''}
              </div>
              {(taskFilterMonth !== 'All' || taskFilterProject !== 'All' || taskFilterStatus !== 'All') && (
                <button
                  onClick={() => { setTaskFilterMonth('All'); setTaskFilterProject('All'); setTaskFilterStatus('All'); }}
                  className="text-xs text-red-500 hover:text-red-700 font-bold"
                >
                  Clear Filters
                </button>
              )}
            </div>

            {allTasksFiltered.length === 0 ? (
              <div className="p-12 border-2 border-dashed border-gray-100 rounded-xl text-center">
                <ListTodo className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-400 font-medium">No tasks match the selected filters</p>
              </div>
            ) : (
              <div className="space-y-2">
                {allTasksFiltered.map(t => (
                  <div key={t.id} className={`p-4 rounded-xl flex items-center gap-4 border transition-all hover:shadow-sm cursor-pointer ${t.status === 'Completed' ? 'bg-green-50/50 border-green-100' : 'bg-white border-gray-100 hover:border-[var(--color-primary)]'}`}
                    onClick={() => toggleTaskStatus(t.id, t.status)}
                  >
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${t.status === 'Completed' ? 'border-green-500 bg-green-500' : 'border-gray-300'}`}>
                      {t.status === 'Completed' && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <span className="text-[9px] font-black text-blue-500 bg-blue-50 px-1 py-0 rounded border border-blue-100">{t.projectCode}</span>
                        {t.priority && <span className={`text-[9px] font-bold px-1.5 rounded border ${priorityColors[t.priority] || ''}`}>{t.priority}</span>}
                        <p className={`font-bold text-sm ${t.status === 'Completed' ? 'text-gray-400 line-through' : 'text-gray-800'}`}>{t.title}</p>
                      </div>
                      <p className="text-[10px] text-gray-500">
                        {t.projectName}
                        {t.createdAt && <span className="ml-2">· {new Date(t.createdAt).toLocaleDateString()}</span>}
                      </p>
                    </div>
                    <div className="shrink-0 flex items-center gap-2">
                      {t.rating && <div className="flex items-center gap-1"><StarRating rating={t.rating} /><span className="text-xs font-bold text-amber-600">{t.rating}/5</span></div>}
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${statusColors[t.status] || ''}`}>{t.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================== TASK ARCHIVE TAB ==================== */}
      {activeTab === 'Task Archive' && (
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <Archive className="w-5 h-5 text-green-600" />
            <h2 className="text-lg font-bold text-gray-800">Completed Project Task Archive</h2>
            <span className="bg-green-50 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full border border-green-100">{completedProjectData.length} Projects</span>
          </div>

          {completedProjectData.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-12 text-center">
              <Archive className="w-12 h-12 text-gray-200 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">No completed projects yet</p>
              <p className="text-gray-400 text-sm mt-1">Task archives will appear here when projects are completed</p>
            </div>
          ) : (
            <div className="space-y-4">
              {completedProjectData.map(proj => {
                const isExpanded = expandedCompletedProject === proj.projectId;
                return (
                  <div key={proj.projectId} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <button
                      onClick={() => setExpandedCompletedProject(isExpanded ? null : proj.projectId)}
                      className="w-full p-5 flex items-center gap-4 hover:bg-gray-50/50 transition-colors text-left"
                    >
                      <div className="w-3 h-10 rounded-full shrink-0" style={{ backgroundColor: proj.categoryColor || '#CBD5E1' }}></div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-[10px] font-bold text-gray-400 uppercase">{proj.projectCode}</span>
                          <span className="text-[9px] font-bold text-white px-1.5 py-0.5 rounded" style={{ backgroundColor: proj.categoryColor || '#6B7280' }}>{proj.category}</span>
                          {proj.tenderOutcome && (
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${proj.tenderOutcome.result === 'Success' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-red-50 text-red-500 border-red-100'}`}>
                              {proj.tenderOutcome.result === 'Success' ? '✓ Successful' : '✗ Failed'}
                            </span>
                          )}
                        </div>
                        <h3 className="font-bold text-gray-800 text-base">{proj.projectName}</h3>
                        <div className="flex items-center gap-4 mt-1 text-[10px] text-gray-400">
                          <span>{proj.completedTaskCount}/{proj.taskCount} tasks completed</span>
                          {proj.averageRating && <span className="flex items-center gap-1">Avg: <StarRating rating={proj.averageRating} /> {proj.averageRating}/5</span>}
                          {proj.endDate && <span>Completed: {new Date(proj.endDate).toLocaleDateString()}</span>}
                        </div>
                      </div>
                      <div className="shrink-0 flex items-center gap-2">
                        <span className="bg-green-50 text-green-600 text-xs font-bold px-3 py-1 rounded-full border border-green-100">Completed</span>
                        {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="border-t border-gray-100 p-5 space-y-4">
                        {/* Team Info */}
                        {proj.teamMembers.length > 0 && (
                          <div className="flex items-center gap-3 flex-wrap pb-4 border-b border-gray-50">
                            <span className="text-[10px] font-bold text-gray-400 uppercase">Team:</span>
                            {proj.teamMembers.map((m: any) => (
                              <span key={m.id} className={`text-xs font-medium px-2.5 py-1 rounded-full border ${m.role === 'Team Lead' ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-gray-50 text-gray-600 border-gray-100'}`}>
                                {m.name} {m.role === 'Team Lead' ? '(Lead)' : ''}
                              </span>
                            ))}
                          </div>
                        )}
                        
                        {/* Tasks */}
                        {proj.tasks.length === 0 ? (
                          <p className="text-sm text-gray-400 italic text-center py-4">No tasks recorded for this project</p>
                        ) : (
                          <div className="space-y-2">
                            <div className="grid grid-cols-12 gap-2 text-[10px] font-bold text-gray-400 uppercase px-3 pb-1">
                              <div className="col-span-5">Task</div>
                              <div className="col-span-2">Assigned To</div>
                              <div className="col-span-2">Status</div>
                              <div className="col-span-3">Rating</div>
                            </div>
                            {proj.tasks.map((task: any) => (
                              <div key={task.id} className={`grid grid-cols-12 gap-2 items-center p-3 rounded-xl border ${task.status === 'Completed' ? 'bg-green-50/30 border-green-100' : 'bg-gray-50/30 border-gray-100'}`}>
                                <div className="col-span-5">
                                  <p className="font-bold text-sm text-gray-800">{task.title}</p>
                                  {task.stage && <p className="text-[10px] text-gray-400">{task.stage}</p>}
                                </div>
                                <div className="col-span-2 text-xs text-gray-600 font-medium">{task.assignedToName}</div>
                                <div className="col-span-2">
                                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${statusColors[task.status] || 'bg-gray-50 text-gray-500 border-gray-200'}`}>{task.status}</span>
                                </div>
                                <div className="col-span-3">
                                  {task.rating ? (
                                    <div className="space-y-0.5">
                                      <div className="flex items-center gap-1.5">
                                        <StarRating rating={task.rating} />
                                        <span className="text-xs font-black text-amber-600">{task.rating}/5</span>
                                      </div>
                                      {task.reviewedBy && <p className="text-[10px] text-gray-400">by {task.reviewedBy}</p>}
                                    </div>
                                  ) : (
                                    <span className="text-[10px] text-gray-300 italic">Not rated</span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'Kanban' && <KanbanBoard tasks={accessibleProjectTasks} onStatusChange={changeTaskStatus} />}
      {activeTab === 'Calendar' && <UnifiedCalendarView projectIds={myProjectIds} />}
      {activeTab === 'Gantt Chart' && <GanttChart tasks={accessibleProjectTasks} />}

      {detailProject && (
        <ProjectDetailModal project={detailProject} onClose={() => setDetailProject(null)} />
      )}
    </div>
  );
}
