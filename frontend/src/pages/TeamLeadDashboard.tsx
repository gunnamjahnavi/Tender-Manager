import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Target, CheckCircle, Plus, LayoutGrid, Kanban, CalendarDays, ChartBar, User, Edit2, Trash2, X, Star } from 'lucide-react';
import { KanbanBoard } from '../components/views/KanbanBoard';
import { UnifiedCalendarView } from '../components/views/UnifiedCalendar';
import { GanttChart } from '../components/views/GanttChart';

import { ProjectStatusStepper } from '../components/ProjectStatusStepper';
import { ProjectDetailModal } from '../components/ProjectDetailModal';
import { PREDEFINED_TASKS, UPDATABLE_PROJECT_STATUSES, getDisplayStatus, getProjectStageDeadlines, getProjectStages, getStatusPillClass } from '../constants/project';

export function TeamLeadDashboard() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [taskTemplate, setTaskTemplate] = useState('');
  const [assignedUserId, setAssignedUserId] = useState('');
  const [selectedStage, setSelectedStage] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [priority, setPriority] = useState('Medium');
  
  const [activeTab, setActiveTab] = useState('Overview');
  const [detailProject, setDetailProject] = useState<any>(null);
  const [reviewTask, setReviewTask] = useState<any>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewNotes, setReviewNotes] = useState('');

  const fetchData = async () => {
    const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
    const [tRes, pRes, teamRes, uRes] = await Promise.all([
      fetch('/api/tasks', { headers }),
      fetch('/api/projects?excludeBidDropped=true', { headers }),
      fetch('/api/teams', { headers }),
      fetch('/api/users', { headers })
    ]);
    
    if (tRes.ok) setTasks(await tRes.json());
    if (pRes.ok) setProjects(await pRes.json());
    if (teamRes.ok) setTeams(await teamRes.json());
    if (uRes.ok) setUsers(await uRes.json());
  };

  useEffect(() => {
    fetchData();
  }, []);

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  
  // Find projects where this user is the team lead
  const myProjects = projects.filter(p => 
    teams.some(t => t.projectId === p.id && t.teamLeadId === user.id)
  );
  const myProjectIds = myProjects.map(p => p.id);
  
  const myTasks = tasks.filter(t => myProjectIds.includes(t.projectId)).map(t => {
    const assignee = users.find(u => u.id == t.assignedToId);
    return {
      ...t,
      assignedToName: t.assignedToName || assignee?.name || 'Unassigned'
    };
  });
  
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId || !assignedUserId) return;
    
    await fetch('/api/tasks/create', {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({ 
        projectId: parseInt(selectedProjectId), 
        title: newTaskTitle,
        assignedToId: parseInt(assignedUserId),
        stage: selectedStage,
        startDate: startDate ? startDate : undefined,
        endDate: endDate ? endDate : undefined,
        priority
      })
    });
    
    closeModal();
    fetchData();
  };

  const handleEditTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask) return;

    await fetch(`/api/tasks/${editingTask.id}/edit`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: newTaskTitle,
        assignedToId: parseInt(assignedUserId),
        stage: selectedStage,
        startDate: startDate ? startDate : undefined,
        endDate: endDate ? endDate : undefined,
        priority
      })
    });

    closeModal();
    fetchData();
  };

  const handleDeleteTask = async (taskId: number) => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    
    await fetch(`/api/tasks/${taskId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    fetchData();
  };

  const openEditModal = (task: any) => {
    setEditingTask(task);
    setSelectedProjectId(task.projectId.toString());
    setNewTaskTitle(task.title);
    setTaskTemplate(PREDEFINED_TASKS.includes(task.title) ? task.title : 'Custom');
    setAssignedUserId(task.assignedToId.toString());
    setSelectedStage(task.stage);
    setStartDate(task.startDate || '');
    setEndDate(task.endDate || '');
    setPriority(task.priority || 'Medium');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingTask(null);
    setSelectedProjectId('');
    setNewTaskTitle('');
    setTaskTemplate('');
    setAssignedUserId('');
    setSelectedStage('');
    setStartDate('');
    setEndDate('');
    setPriority('Medium');
  };

  const openReviewModal = (task: any) => {
    setReviewTask(task);
    setReviewRating(task.rating || 5);
    setReviewNotes(task.reviewNotes || '');
  };

  const changeTaskStatus = async (taskId: number, newStatus: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (newStatus === 'Completed' && task?.status !== 'Completed') {
      openReviewModal(task);
      return;
    }

    await fetch(`/api/tasks/${taskId}/status`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status: newStatus })
    });
    fetchData();
  };

  const submitTaskReview = async () => {
    if (!reviewTask) return;
    const res = await fetch(`/api/tasks/${reviewTask.id}/status`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        status: 'Completed',
        rating: reviewRating,
        reviewNotes
      })
    });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error || 'Failed to save task review');
      return;
    }
    setReviewTask(null);
    setReviewRating(5);
    setReviewNotes('');
    fetchData();
  };

  const updateProjectStatus = async (projectId: number, newStatus: string) => {
    const res = await fetch(`/api/projects/${projectId}/update-status`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status: newStatus })
    });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error || 'Failed to update project status');
    }
    fetchData();
  };

  const toggleStageCompletion = async (projectId: number, stage: string) => {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;
    
    const isCompleted = project.completedStages?.includes(stage);
    const encodedStage = encodeURIComponent(stage);
    const endpoint = isCompleted 
      ? `/api/projects/${projectId}/complete-stage/${encodedStage}`
      : `/api/projects/${projectId}/complete-stage`;
    
    const method = isCompleted ? 'DELETE' : 'POST';
    
    await fetch(endpoint, {
      method,
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      },
      ...(method === 'POST' && { body: JSON.stringify({ stage }) })
    });
    fetchData();
  };

  const tabs = [
    { name: 'Overview', icon: LayoutGrid },
    { name: 'Kanban', icon: Kanban },
    { name: 'Calendar', icon: CalendarDays },
    { name: 'Gantt Chart', icon: ChartBar },
  ];

  return (
    <div className="space-y-6 text-[#333]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-primary-dark)]">Project Action Dashboard</h1>
          <p className="text-sm text-[#666] mt-1">Project Execution & Task Management</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/dashboard/member')}
            className="flex items-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-700 px-4 py-2 rounded-lg border border-blue-200 transition-all font-bold text-xs uppercase"
          >
            <User className="w-4 h-4" />
            My Personal Workspace
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white px-4 py-2 rounded font-bold text-sm uppercase tracking-wide transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Task
          </button>
        </div>
      </div>

      <div className="flex bg-white rounded-lg p-1 border border-gray-200 inline-flex shadow-sm">
        {tabs.map(tab => (
          <button
            key={tab.name}
            onClick={() => setActiveTab(tab.name)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === tab.name ? 'bg-[var(--color-primary)] text-white shadow' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.name}
          </button>
        ))}
      </div>

      {activeTab === 'Overview' && (
        <div className="panel p-0 overflow-hidden">
          <div className="panel-header px-5 pt-5 mb-0 border-b border-gray-100 pb-4">
            <div className="panel-title flex items-center gap-2">
              <Target className="w-5 h-5 text-[var(--color-primary)]" /> Task Overview
            </div>
          </div>
          
          <div className="p-5">
              {myProjects.length === 0 ? (
                  <div className="p-10 border-2 border-dashed border-[#e1e1e1] rounded text-center text-[#666]">
                  You have not been assigned to lead any teams yet.
                  </div>
              ) : (
                  <div className="space-y-6">
                  {myProjects.map(p => {
                      const projectTasks = tasks.filter(t => t.projectId === p.id);
                      return (
                          <div
                            key={p.id}
                            className="border border-gray-200 rounded p-4 bg-white shadow-sm cursor-pointer hover:border-[var(--color-primary)] transition-colors"
                            onClick={() => setDetailProject(p)}
                          >
                              <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-50">
                                  <div className="flex items-center gap-3">
                                      <div 
                                        className="w-1.5 h-10 rounded-full" 
                                        style={{ backgroundColor: p.categoryColor || '#CBD5E1' }}
                                      ></div>
                                      <div>
                                          <h3 className="font-bold text-[var(--color-primary-dark)] text-lg">{p.name}</h3>
                                          <div className="flex items-center gap-2">
                                            <div className="text-[10px] text-gray-500 font-mono">{p.projectCode}</div>
                                            <div className="text-[10px] text-[var(--color-primary)] font-bold">
                                              {p.currency === 'Dollars' ? '$' : '₹'} {p.estimatedValue} {p.currency === 'Dollars' ? 'Million' : 'Crore'}
                                              {p.projectState && <span className="text-gray-400 font-normal ml-1">({p.projectState})</span>}
                                            </div>
                                            <span 
                                                className="text-[9px] uppercase font-bold text-white px-1.5 py-0.5 rounded"
                                                style={{ backgroundColor: p.categoryColor || '#6B7280' }}
                                            >
                                                {p.category}
                                            </span>
                                          </div>
                                      </div>
                                  </div>
                                  <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                                      <div className="text-right">
                                          <div className="text-[10px] uppercase text-gray-400 font-bold mb-1">Update Status</div>
                                          <select 
                                              value={getDisplayStatus(p)} 
                                              onChange={(e) => updateProjectStatus(p.id, e.target.value)}
                                              className="text-xs border border-gray-200 rounded px-2 py-1 bg-gray-50 focus:bg-white focus:ring-1 focus:ring-[var(--color-primary)] outline-none font-bold text-gray-700 cursor-pointer"
                                          >
                                              {UPDATABLE_PROJECT_STATUSES.map(status => (
                                                  <option key={status} value={status}>{status}</option>
                                              ))}
                                          </select>
                                      </div>
                                      <div className={`status-pill ${getStatusPillClass(getDisplayStatus(p))} px-3 py-1.5`}>{getDisplayStatus(p)}</div>
                                  </div>
                              </div>

                              <div className="px-10 py-2 bg-gray-50/50 rounded-lg mb-8 border border-gray-100 shadow-inner overflow-x-auto" onClick={(e) => e.stopPropagation()}>
                                  <ProjectStatusStepper 
                                    completedStages={p.completedStages || []} 
                                    stages={getProjectStages(p)} 
                                    stageDeadlines={getProjectStageDeadlines(p)}
                                    onStageToggle={(stage) => toggleStageCompletion(p.id, stage)}
                                  />
                              </div>
                              
                              {projectTasks.length === 0 ? (
                                  <p className="text-sm text-gray-400">No tasks created for this project.</p>
                              ) : (
                                  <div className="space-y-2">
                                  {projectTasks.map(t => {
                                      const assignee = users.find(u => u.id == t.assignedToId);
                                      const isCreator = t.assignedBy == user.id;
                                      return (
                                          <div key={t.id} className="p-3 bg-[var(--color-surface)] rounded flex flex-col gap-3 border border-[#e1e1e1] md:flex-row md:items-center md:justify-between" onClick={(e) => e.stopPropagation()}>
                                              <div className="min-w-0 flex-1">
                                                  <p className="break-words font-bold text-sm leading-snug">{t.title}</p>
                                                  <div className="flex flex-wrap items-center gap-2 mt-1">
                                                     <p className="text-xs text-[#666]">Assigned to: <span className="font-bold text-[var(--color-primary)]">{t.assignedToName || assignee?.name || 'Unassigned'}</span></p>
                                                     <span className="max-w-full break-words text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 font-medium">{t.stage}</span>
                                                  </div>
                                              </div>
                                              <div className="flex flex-wrap items-center gap-2 md:justify-end">
                                                  <span className={`status-pill ${t.status === 'Completed' ? 'active' : 'warning'}`}>{t.status}</span>
                                                  {t.rating && (
                                                    <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-700">
                                                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" /> {t.rating}/5
                                                    </span>
                                                  )}
                                                  <button
                                                    onClick={() => openReviewModal(t)}
                                                    className={`rounded px-3 py-1.5 text-[10px] font-bold uppercase transition-colors ${
                                                      t.status === 'Completed'
                                                        ? 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                                                        : 'bg-green-50 text-green-700 hover:bg-green-100'
                                                    }`}
                                                  >
                                                    {t.status === 'Completed' ? 'Edit Review' : 'Review & Complete'}
                                                  </button>
                                                  {isCreator && (
                                                     <div className="flex items-center gap-1 border-l pl-3 ml-1">
                                                        <button 
                                                          onClick={() => openEditModal(t)}
                                                          className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                          title="Edit Task"
                                                        >
                                                          <Edit2 className="w-4 h-4" />
                                                        </button>
                                                        <button 
                                                          onClick={() => handleDeleteTask(t.id)}
                                                          className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                                                          title="Delete Task"
                                                        >
                                                          <Trash2 className="w-4 h-4" />
                                                        </button>
                                                     </div>
                                                  )}
                                              </div>
                                          </div>
                                      )
                                  })}
                                  </div>
                              )}
                          </div>
                      )
                  })}
                  </div>
              )}
          </div>
        </div>
      )}

      {activeTab === 'Kanban' && <KanbanBoard tasks={myTasks} onStatusChange={changeTaskStatus} />}
      {activeTab === 'Calendar' && <UnifiedCalendarView projectIds={myProjectIds} />}
      {activeTab === 'Gantt Chart' && <GanttChart tasks={myTasks} />}

      {detailProject && (
        <ProjectDetailModal project={detailProject} onClose={() => setDetailProject(null)} />
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full overflow-hidden text-[#333]">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-semibold text-gray-900">{editingTask ? 'Edit Task' : 'Create New Task'}</h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={editingTask ? handleEditTask : handleCreateTask} className="p-6 space-y-4 text-sm">
              <div>
                <label className="block text-gray-700 font-bold mb-1">Select Project</label>
                <select 
                  required 
                  disabled={!!editingTask}
                  value={selectedProjectId} 
                  onChange={e => {
                    setSelectedProjectId(e.target.value);
                    setSelectedStage('');
                  }} 
                  className="w-full border border-gray-300 rounded p-2 focus:ring-[var(--color-primary)] outline-none disabled:bg-gray-100"
                >
                  <option value="">-- Choose Project --</option>
                  {myProjects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-gray-700 font-bold mb-1">Task Title</label>
                <select
                  required
                  value={taskTemplate}
                  onChange={e => {
                    const value = e.target.value;
                    setTaskTemplate(value);
                    if (value !== 'Custom') setNewTaskTitle(value);
                    if (value === 'Custom') setNewTaskTitle('');
                  }}
                  className="w-full border border-gray-300 rounded p-2 focus:ring-[var(--color-primary)] outline-none bg-white mb-2"
                >
                  <option value="">-- Choose Task --</option>
                  {PREDEFINED_TASKS.map(task => (
                    <option key={task} value={task}>{task}</option>
                  ))}
                  <option value="Custom">Custom Task</option>
                </select>
                {taskTemplate === 'Custom' && (
                  <input required type="text" value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)} className="w-full border border-gray-300 rounded p-2 focus:ring-[var(--color-primary)] outline-none" />
                )}
              </div>
              <div>
                <label className="block text-gray-700 font-bold mb-1">Assign To Member</label>
                <select required value={assignedUserId} onChange={e => setAssignedUserId(e.target.value)} className="w-full border border-gray-300 rounded p-2 focus:ring-[var(--color-primary)] outline-none">
                  <option value="">-- Choose Member --</option>
                  {(() => {
                    const currentTeam = teams.find(t => t.projectId.toString() === selectedProjectId);
                    if (!currentTeam) return null;
                    return users.filter(u => currentTeam.members?.includes(u.id) || currentTeam.teamLeadId === u.id).map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ));
                  })()}
                </select>
              </div>
              <div>
                <label className="block text-gray-700 font-bold mb-1">Associate with Project Stage</label>
                <select required value={selectedStage} onChange={e => setSelectedStage(e.target.value)} className="w-full border border-gray-300 rounded p-2 focus:ring-[var(--color-primary)] outline-none">
                  <option value="">-- Choose Stage --</option>
                  {getProjectStages(projects.find(p => p.id.toString() === selectedProjectId) || {}).map(stage => (
                    <option key={stage} value={stage}>{stage}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="block text-gray-700 font-bold mb-1">Start Date</label>
                   <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full border border-gray-300 rounded-md p-2 focus:ring-[var(--color-primary)] outline-none" />
                </div>
                <div>
                   <label className="block text-gray-700 font-bold mb-1">Project Ending Deadline</label>
                   <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full border border-gray-300 rounded-md p-2 focus:ring-[var(--color-primary)] outline-none" />
                </div>
              </div>
              <div>
                 <label className="block text-gray-700 font-bold mb-1">Priority</label>
                 <select value={priority} onChange={e => setPriority(e.target.value)} className="w-full border border-gray-300 rounded-md p-2 focus:ring-[var(--color-primary)] outline-none bg-white">
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                 </select>
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={closeModal} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded font-bold text-xs uppercase">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white rounded font-bold text-xs uppercase">
                  {editingTask ? 'Update Task' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {reviewTask && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full overflow-hidden text-[#333]">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <div>
                <h3 className="font-semibold text-gray-900">Review Completed Task</h3>
                <p className="text-xs text-gray-500 mt-1">{reviewTask.title}</p>
              </div>
              <button onClick={() => setReviewTask(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-5 text-sm">
              <div>
                <p className="text-[10px] font-bold uppercase text-gray-500 mb-2">Member Performance Rating</p>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewRating(star)}
                      className="rounded p-1 text-amber-400 hover:bg-amber-50"
                      title={`${star} star${star > 1 ? 's' : ''}`}
                    >
                      <Star className={`h-8 w-8 ${star <= reviewRating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`} />
                    </button>
                  ))}
                  <span className="ml-2 text-lg font-black text-[var(--color-primary-dark)]">{reviewRating}/5</span>
                </div>
              </div>
              <label className="block">
                <span className="text-[10px] font-bold uppercase text-gray-500">Review Notes</span>
                <textarea
                  value={reviewNotes}
                  onChange={e => setReviewNotes(e.target.value)}
                  placeholder="Add a short performance note..."
                  className="mt-1 w-full rounded border border-gray-200 px-3 py-2 min-h-[90px] outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
                />
              </label>
              <div className="flex justify-end gap-3 border-t pt-4">
                <button onClick={() => setReviewTask(null)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded font-bold text-xs uppercase">Cancel</button>
                <button onClick={submitTaskReview} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded font-bold text-xs uppercase">
                  Save Review & Complete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
