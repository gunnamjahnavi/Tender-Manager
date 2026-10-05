import React, { useState, useEffect } from 'react';
import { Plus, Briefcase, UserCheck, Users, GraduationCap, X, Lock, ChevronDown, Check, ChevronUp } from 'lucide-react';
import { ProjectStatusStepper } from '../components/ProjectStatusStepper';
import { PROJECT_STAGES, getDisplayStatus, getProjectStageDeadlines, getProjectStages, getStatusPillClass } from '../constants/project';

export function CreatorDashboard() {
  const [projects, setProjects] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState('#3b82f6');
  const [categories, setCategories] = useState<any[]>([]);
  const [expandedProjectId, setExpandedProjectId] = useState<number | null>(null);
  const [pipelineStages, setPipelineStages] = useState(
    PROJECT_STAGES.map(name => ({ name, selected: true, deadline: '' }))
  );
  const [customPipelineStage, setCustomPipelineStage] = useState('');
  const [createNameError, setCreateNameError] = useState('');

  const moveStage = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= pipelineStages.length) return;
    setPipelineStages(prev => {
      const next = [...prev];
      const temp = next[index];
      next[index] = next[newIndex];
      next[newIndex] = temp;
      return next;
    });
  };

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'Member',
    experienceList: [] as { category: string, count: number }[]
  });
  const [expCategory, setExpCategory] = useState('Roads');
  const [expCount, setExpCount] = useState(1);
  
  const fetchData = async () => {
    const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
    const [pRes, uRes, cRes] = await Promise.all([
        fetch('/api/projects', { headers }),
        fetch('/api/users', { headers }),
        fetch('/api/categories', { headers })
    ]);
    if (pRes.ok) setProjects(await pRes.json());
    if (uRes.ok) setUsers(await uRes.json());
    if (cRes.ok) setCategories(await cRes.json());
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/categories', {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name: newCatName, color: newCatColor })
    });
    setNewCatName('');
    setIsCategoryModalOpen(false);
    fetchData();
  };

  const handleCreateProject = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const body = Object.fromEntries(formData.entries());
    const projectName = (body.name as string)?.trim();
    if (projects.some(p => p.name.toLowerCase() === projectName.toLowerCase())) {
      setCreateNameError('A project with this name already exists');
      return;
    }
    setCreateNameError('');

    const selectedPipelineStages = pipelineStages
      .filter(stage => stage.selected)
      .map(({ name, deadline }) => ({ name, deadline: deadline || null }));
    if (selectedPipelineStages.length === 0) {
      alert('Select at least one pipeline stage for this project.');
      return;
    }
    
    const res = await fetch('/api/projects/create', {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ ...body, pipelineStages: selectedPipelineStages })
    });

    if (!res.ok) {
      const errorData = await res.json();
      if (errorData.error && errorData.error.toLowerCase().includes('name already exists')) {
        setCreateNameError(errorData.error);
      } else {
        alert(errorData.error || 'Failed to create project');
      }
      return;
    }

    setIsModalOpen(false);
    setPipelineStages(PROJECT_STAGES.map(name => ({ name, selected: true, deadline: '' })));
    setCustomPipelineStage('');
    setCreateNameError('');
    fetchData();
  };

  const updatePipelineStage = (index: number, changes: Partial<{ selected: boolean; deadline: string }>) => {
    setPipelineStages(prev => prev.map((stage, i) => i === index ? { ...stage, ...changes } : stage));
  };

  const addCustomPipelineStage = () => {
    const name = customPipelineStage.trim();
    if (!name || pipelineStages.some(stage => stage.name.toLowerCase() === name.toLowerCase())) return;
    setPipelineStages(prev => [...prev, { name, selected: true, deadline: '' }]);
    setCustomPipelineStage('');
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/users/create', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(formData)
    });

    if (res.ok) {
        setIsMemberModalOpen(false);
        setFormData({
            name: '',
            email: '',
            password: '',
            role: 'Member',
            experienceList: []
        });
        fetchData();
    } else {
        const data = await res.json();
        alert(data.error || 'Failed to create user');
    }
  };

  const addExperience = () => {
    setFormData({
      ...formData,
      experienceList: [...formData.experienceList, { category: expCategory, count: expCount }]
    });
  };

  const removeExperience = (index: number) => {
    setFormData({
      ...formData,
      experienceList: formData.experienceList.filter((_, i) => i !== index)
    });
  };

  const seniorLeads = users.filter(u => u.role === 'Senior Lead');

  const assignSeniorLead = async (projectId: number, seniorLeadId: string) => {
      await fetch(`/api/projects/${projectId}/assign-senior-lead`, {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ seniorLeadId })
      });
      fetchData();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Creator Panel</h1>
          <p className="text-sm text-gray-500 mt-1">Manage new tenders and projects</p>
        </div>
        <button 
          onClick={() => {
            setCreateNameError('');
            setPipelineStages(PROJECT_STAGES.map(name => ({ name, selected: true, deadline: '' })));
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white px-4 py-2 rounded-md transition-colors font-bold text-sm uppercase tracking-wide"
        >
          <Plus className="w-4 h-4" />
          Create Project
        </button>
      </div>

      <div className="flex gap-4 mb-6">
        <button 
          onClick={() => setIsCategoryModalOpen(true)}
          className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md transition-colors font-bold text-xs uppercase"
        >
          <Plus className="w-3 h-3" />
          Add Category
        </button>
        <button 
          onClick={() => setIsMemberModalOpen(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors font-bold text-xs uppercase"
        >
          <Users className="w-3 h-3" />
          Add Member
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="stat-card">
          <div className="stat-val text-[var(--color-primary)]">{projects.length}</div>
          <div className="stat-label flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-[var(--color-primary)] opacity-50" />
            Total Projects
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-val text-blue-600">{users.length}</div>
          <div className="stat-label flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-500 opacity-50" />
            Total Workforce
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-val text-green-600">{seniorLeads.length}</div>
          <div className="stat-label flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-green-500 opacity-50" />
            Active Leads
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Projects Panel */}
        <div className="panel">
          <div className="panel-header flex justify-between items-center">
            <div className="panel-title flex items-center gap-2">
               <Briefcase className="w-5 h-5 text-[var(--color-primary)]" />
               Recent Tenders
            </div>
          </div>
          <div className="overflow-x-auto text-sm">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Lead Assignment</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {projects.slice().reverse().slice(0, 5).map(p => (
                  <React.Fragment key={p.id}>
                    <tr>
                      <td>
                        <div className="flex items-center gap-2">
                           <button 
                             onClick={() => setExpandedProjectId(expandedProjectId === p.id ? null : p.id)}
                             className="p-0.5 hover:bg-gray-100 rounded transition-colors"
                           >
                             <ChevronDown className={`w-4 h-4 transition-transform ${expandedProjectId === p.id ? 'rotate-180' : ''}`} />
                           </button>
                           <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">{p.projectCode || `LT-${new Date(p.createdAt || Date.now()).getFullYear()}-${String(p.id).padStart(3, '0')}`}</span>
                           <div className="font-bold text-[var(--color-primary-dark)]">{p.name}</div>
                        </div>
                        <div className="text-[10px] text-[var(--color-primary)] font-bold mt-0.5">
                          {p.currency === 'Dollars' ? '$' : '₹'} {p.estimatedValue} {p.currency === 'Dollars' ? 'M' : 'Cr'} 
                          {p.projectState && <span className="text-gray-400 font-normal ml-1">({p.projectState})</span>}
                        </div>
                        <div className="text-[10px] text-gray-400 uppercase ml-0 mt-0.5">{p.clientName}</div>
                      </td>
                      <td>
                        {p.seniorLeadId ? (
                            <div className="flex items-center gap-1 text-sm font-medium text-green-700">
                                <UserCheck className="w-4 h-4" /> {users.find(u => u.id === p.seniorLeadId)?.name}
                            </div>
                        ) : (
                            <select 
                                className="border border-gray-300 rounded px-2 py-1 text-[10px] outline-none focus:border-[var(--color-primary)]"
                                onChange={(e) => assignSeniorLead(p.id, e.target.value)}
                                value=""
                            >
                                <option value="" disabled>Assign Lead...</option>
                                {seniorLeads.map(l => (
                                    <option key={l.id} value={l.id}>{l.name}</option>
                                ))}
                            </select>
                        )}
                      </td>
                      <td><span className={`status-pill ${getStatusPillClass(getDisplayStatus(p))}`}>{getDisplayStatus(p)}</span></td>
                    </tr>
                    {expandedProjectId === p.id && (
                      <tr className="bg-gray-50/50 hover:bg-gray-50/50">
                        <td colSpan={3} className="px-6 py-4">
                          <div className="space-y-4">
                            {/* Full Project Details */}
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <p className="text-[10px] font-bold uppercase text-gray-500 mb-1">Client Name</p>
                                <p className="font-semibold text-gray-800">{p.clientName}</p>
                              </div>
                              <div>
                                <p className="text-[10px] font-bold uppercase text-gray-500 mb-1">Category</p>
                                <span className="inline-block px-2 py-0.5 rounded-full text-white text-[10px]" style={{ backgroundColor: p.categoryColor || '#94a3b8' }}>
                                  {p.category}
                                </span>
                              </div>
                              <div>
                                <p className="text-[10px] font-bold uppercase text-gray-500 mb-1">State</p>
                                <p className="font-semibold text-gray-800">{p.projectState || '—'}</p>
                              </div>
                              <div>
                                <p className="text-[10px] font-bold uppercase text-gray-500 mb-1">Country</p>
                                <p className="font-semibold text-gray-800">{p.country || '—'}</p>
                              </div>
                              <div>
                                <p className="text-[10px] font-bold uppercase text-gray-500 mb-1">Estimated Value</p>
                                <p className="font-semibold text-gray-800">{p.currency === 'Dollars' ? '$' : '₹'} {p.estimatedValue} {p.currency === 'Dollars' ? 'Million' : 'Crore'}</p>
                              </div>
                              <div>
                                <p className="text-[10px] font-bold uppercase text-gray-500 mb-1">Project Status</p>
                                <p className="font-semibold text-gray-800">{getDisplayStatus(p)}</p>
                              </div>
                            </div>
                            
                            {/* Assigned Team */}
                            <div>
                              <p className="text-[10px] font-bold uppercase text-gray-500 mb-2">Assigned Team</p>
                              {p.teamDetails ? (
                                <div className="bg-white p-3 rounded border border-gray-200 text-sm space-y-1">
                                  <div><span className="text-[10px] font-bold uppercase text-gray-400">Team Lead: </span><span className="font-semibold">{p.teamDetails.leader?.name || '—'}</span></div>
                                  <div><span className="text-[10px] font-bold uppercase text-gray-400">Members: </span><span className="font-semibold">{p.teamDetails.members?.map((m: any) => m.name).join(', ') || '—'}</span></div>
                                </div>
                              ) : (
                                <p className="text-sm text-gray-400 italic">Team not yet formed</p>
                              )}
                            </div>

                            {/* Full Description */}
                            {p.description && (
                              <div>
                                <p className="text-[10px] font-bold uppercase text-gray-500 mb-2">Project Description</p>
                                <div className="bg-white p-3 rounded border border-gray-200 text-sm text-gray-700 leading-relaxed max-h-32 overflow-y-auto">
                                  {p.description}
                                </div>
                              </div>
                            )}

                            {/* Status Pipeline */}
                            <div>
                              <p className="text-[10px] font-bold uppercase text-gray-500 mb-2">Status Pipeline</p>
                              <div className="bg-white p-3 rounded border border-gray-200">
                                <ProjectStatusStepper 
                                  completedStages={p.completedStages || []} 
                                  stages={getProjectStages(p)}
                                  stageDeadlines={getProjectStageDeadlines(p)}
                                  isReadOnly={true}
                                />
                              </div>
                            </div>

                            {/* Tender Outcome - if completed */}
                            {p.status === 'Completed' && p.tenderOutcome && (
                              <div>
                                <p className="text-[10px] font-bold uppercase text-gray-500 mb-2">Tender Outcome</p>
                                <div className={`p-3 rounded border ${p.tenderOutcome.result === 'Success' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                                  <div className="flex items-center gap-2 mb-2">
                                    {p.tenderOutcome.result === 'Success' ? (
                                      <Check className="w-5 h-5 text-green-600" />
                                    ) : (
                                      <X className="w-5 h-5 text-red-600" />
                                    )}
                                    <span className={`font-bold text-sm ${p.tenderOutcome.result === 'Success' ? 'text-green-700' : 'text-red-700'}`}>
                                      {p.tenderOutcome.result === 'Success' ? 'Successful' : `Failed at Position ${p.tenderOutcome.ranking}`}
                                    </span>
                                  </div>
                                  {p.tenderOutcome.remarks && (
                                    <p className="text-xs text-gray-700">Remarks: {p.tenderOutcome.remarks}</p>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Member Management Panel */}
        <div className="panel">
          <div className="panel-header flex justify-between items-center">
            <div className="panel-title flex items-center gap-2">
               <Users className="w-5 h-5 text-[var(--color-primary)]" />
               Member Management
            </div>
            <button 
              onClick={() => setIsMemberModalOpen(true)}
              className="text-[var(--color-primary)] hover:underline text-xs font-bold uppercase"
            >
              + Add Member
            </button>
          </div>
          <div className="overflow-x-auto text-sm">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Experience</th>
                </tr>
              </thead>
              <tbody>
                {users.slice(0, 5).map(u => (
                  <tr key={u.id}>
                    <td>
                      <div className="font-bold text-gray-800">{u.name}</div>
                      <div className="text-[10px] text-gray-400">{u.email}</div>
                    </td>
                    <td><span className="status-pill active text-[10px]">{u.role}</span></td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        {u.experience?.length > 0 ? (
                           <span className="text-[10px] bg-blue-50 text-blue-700 font-bold px-1.5 py-0.5 rounded border border-blue-100">
                             {u.experience.length} Projects
                           </span>
                        ) : (
                          <span className="text-gray-400 italic text-[10px]">None</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-2xl w-full overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-semibold text-gray-900">Create New Project</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">&times;</button>
            </div>
            <form onSubmit={handleCreateProject} className="p-6 space-y-4 text-sm max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Project Name</label>
                  <input 
                    required 
                    name="name" 
                    type="text" 
                    onChange={() => setCreateNameError('')}
                    className={`w-full border rounded-md p-2 outline-none focus:ring-1 ${createNameError ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]'}`} 
                  />
                  {createNameError && <p className="text-red-500 text-xs mt-1">{createNameError}</p>}
                </div>
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Project Category</label>
                  <select required name="category" className="w-full border border-gray-300 rounded-md p-2 focus:ring-[var(--color-primary)] outline-none bg-white">
                      {categories.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-gray-700 font-bold mb-1">Client Name</label>
                <input required name="clientName" type="text" className="w-full border border-gray-300 rounded-md p-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="block text-gray-700 font-bold mb-1">Estimated Value</label>
                   <div className="flex gap-2">
                     <select 
                       name="currency" 
                       defaultValue="Rupees"
                       className="border border-gray-300 rounded-md p-2 focus:ring-[var(--color-primary)] outline-none bg-white text-xs"
                     >
                       <option value="Rupees">₹ (Rupees)</option>
                       <option value="Dollars">$ (Dollars)</option>
                     </select>
                     <input required name="estimatedValue" type="number" step="0.01" className="w-full border border-gray-300 rounded-md p-2 focus:ring-[var(--color-primary)] outline-none" placeholder="Value" />
                   </div>
                   <p className="text-[10px] text-gray-500 mt-1">
                     * Rupees in Crores, Dollars in Millions
                   </p>
                </div>
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Country</label>
                  <input required name="country" type="text" className="w-full border border-gray-300 rounded-md p-2 focus:ring-[var(--color-primary)] outline-none" placeholder="e.g. India" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="block text-gray-700 font-bold mb-1">State</label>
                   <input required name="projectState" type="text" className="w-full border border-gray-300 rounded-md p-2 focus:ring-[var(--color-primary)] outline-none" placeholder="e.g. Maharashtra" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="block text-gray-700 font-bold mb-1">Start Date</label>
                   <input required name="startDate" type="date" className="w-full border border-gray-300 rounded-md p-2 focus:ring-[var(--color-primary)] outline-none" />
                </div>
                <div>
                   <label className="block text-gray-700 font-bold mb-1">End Date</label>
                   <input required name="endDate" type="date" className="w-full border border-gray-300 rounded-md p-2 focus:ring-[var(--color-primary)] outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-gray-700 font-bold mb-1">Description</label>
                <textarea required name="description" rows={3} className="w-full border border-gray-300 rounded-md p-2 focus:ring-[var(--color-primary)] outline-none"></textarea>
              </div>
              <div className="border-t pt-4">
                <label className="block text-gray-700 font-bold mb-2">Status Pipeline</label>
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {pipelineStages.map((stage, index) => (
                    <div key={stage.name} className="grid grid-cols-[auto_1fr_150px] gap-3 items-center bg-gray-50 border border-gray-200 rounded-md p-2 animate-in fade-in duration-200">
                      <div className="flex flex-col">
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => moveStage(index, 'up')}
                          className="p-0.5 hover:bg-gray-200 rounded text-gray-500 disabled:opacity-30 disabled:hover:bg-transparent"
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={index === pipelineStages.length - 1}
                          onClick={() => moveStage(index, 'down')}
                          className="p-0.5 hover:bg-gray-200 rounded text-gray-500 disabled:opacity-30 disabled:hover:bg-transparent"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <label className="flex items-center gap-2 font-semibold text-gray-700 min-w-0">
                        <input
                          type="checkbox"
                          checked={stage.selected}
                          onChange={e => updatePipelineStage(index, { selected: e.target.checked })}
                          className="rounded text-[var(--color-primary)] focus:ring-[var(--color-primary)] shrink-0"
                        />
                        <span className="truncate">{stage.name}</span>
                      </label>
                      <input
                        type="date"
                        value={stage.deadline}
                        disabled={!stage.selected}
                        onChange={e => updatePipelineStage(index, { deadline: e.target.value })}
                        className="w-full border border-gray-300 rounded-md p-2 text-xs outline-none disabled:bg-gray-100"
                      />
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 mt-3">
                  <input
                    type="text"
                    value={customPipelineStage}
                    onChange={e => setCustomPipelineStage(e.target.value)}
                    placeholder="Custom pipeline stage"
                    className="flex-1 border border-gray-300 rounded-md p-2 focus:ring-[var(--color-primary)] outline-none"
                  />
                  <button type="button" onClick={addCustomPipelineStage} className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md font-bold uppercase text-xs">
                    Add
                  </button>
                </div>
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md font-bold uppercase text-xs">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-[var(--color-primary)] text-white rounded hover:bg-[var(--color-primary-dark)] font-bold uppercase text-xs">Create Project</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isMemberModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-2xl w-full overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-semibold text-gray-900">Create New User</h3>
              <button onClick={() => setIsMemberModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleCreateUser} className="p-6 space-y-4 text-sm max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Full Name</label>
                  <input 
                    required 
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    type="text" 
                    className="w-full border border-gray-300 rounded-md p-2 focus:ring-[var(--color-primary)] outline-none" 
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Designation</label>
                  <select 
                    value={formData.role}
                    onChange={e => setFormData({...formData, role: e.target.value})}
                    className="w-full border border-gray-300 rounded-md p-2 focus:ring-[var(--color-primary)] outline-none bg-white"
                  >
                    <option value="Member">Member</option>
                    <option value="Senior Lead">Senior Lead</option>
                    <option value="HOD">HOD</option>
                    <option value="Viewer">Viewer</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-gray-700 font-bold mb-1">Email</label>
                <input 
                  required 
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  type="email" 
                  className="w-full border border-gray-300 rounded-md p-2 focus:ring-[var(--color-primary)] outline-none" 
                />
              </div>
              <div>
                <label className="block text-gray-700 font-bold mb-1">Password</label>
                <div className="relative">
                  <input 
                    required 
                    value={formData.password}
                    onChange={e => setFormData({...formData, password: e.target.value})}
                    type="text" 
                    placeholder="Enter password for new user"
                    className="w-full border border-gray-300 rounded-md p-2 focus:ring-[var(--color-primary)] outline-none" 
                  />
                  <Lock className="absolute right-3 top-2.5 w-4 h-4 text-gray-400" />
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-bold text-[var(--color-primary-dark)] mb-4 flex items-center gap-2">
                  <GraduationCap className="w-4 h-4" /> Add Prior Experience
                </h4>
                
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <div className="flex gap-2 mb-4">
                    <div className="flex-1">
                      <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1 ml-1">Category</label>
                      <select 
                        value={expCategory}
                        onChange={e => setExpCategory(e.target.value)}
                        className="w-full border border-gray-300 rounded-md p-2 focus:ring-[var(--color-primary)] outline-none bg-white text-sm"
                      >
                        {categories.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                      </select>
                    </div>
                    <div className="w-24">
                      <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1 ml-1">Projects</label>
                      <input 
                        type="number" 
                        min="1"
                        value={isNaN(expCount) ? '' : expCount}
                        onChange={e => setExpCount(parseInt(e.target.value) || 0)}
                        className="w-full border border-gray-300 rounded-md p-2 focus:ring-[var(--color-primary)] outline-none text-sm font-bold"
                        placeholder="Count"
                      />
                    </div>
                    <div className="flex items-end">
                      <button 
                        type="button"
                        onClick={addExperience}
                        className="bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-dark)] px-4 py-2 rounded-md font-bold text-xs uppercase transition-colors"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    {formData.experienceList.map((exp, i) => (
                      <div key={i} className="flex justify-between items-center bg-white px-3 py-2 rounded-md border border-gray-100 shadow-sm">
                        <span className="text-sm font-medium text-gray-700">
                          {exp.category} <span className="text-gray-300 mx-1.5">|</span> <span className="text-[var(--color-primary)] font-bold">{exp.count} Projects</span>
                        </span>
                        <button type="button" onClick={() => removeExperience(i)} className="text-gray-400 hover:text-red-500 transition-colors">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    {formData.experienceList.length === 0 && (
                      <div className="text-center py-4 text-gray-400 text-xs italic">No experience entries added</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-6 flex justify-end gap-3 border-t">
                <button type="button" onClick={() => setIsMemberModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md font-bold uppercase text-xs">Cancel</button>
                <button type="submit" className="px-6 py-2 bg-[var(--color-primary)] text-white rounded-md hover:bg-[var(--color-primary-dark)] font-bold uppercase text-xs shadow-md">Create User Account</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isCategoryModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-semibold text-gray-900">Manage Project Categories</h3>
              <button onClick={() => setIsCategoryModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6">
              <form onSubmit={handleCreateCategory} className="space-y-4 mb-6">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Name</label>
                    <input 
                      required 
                      value={newCatName}
                      onChange={e => setNewCatName(e.target.value)}
                      placeholder="e.g. Roads"
                      className="w-full border border-gray-300 rounded-md p-2 outline-none text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Color</label>
                    <input 
                      type="color"
                      value={newCatColor}
                      onChange={e => setNewCatColor(e.target.value)}
                      className="w-full h-10 border border-gray-300 rounded-md cursor-pointer"
                    />
                  </div>
                </div>
                <button type="submit" className="w-full bg-purple-600 text-white py-2 rounded-md hover:bg-purple-700 font-bold uppercase text-xs">
                  Create Category
                </button>
              </form>

              <div className="border-t pt-4">
                <h4 className="text-xs font-bold text-gray-500 uppercase mb-3 text-center">Existing Categories</h4>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                  {categories.map(c => (
                    <div key={c.name} className="flex items-center gap-2 p-2 bg-gray-50 rounded border border-gray-100">
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: c.color }}></div>
                      <span className="text-sm text-gray-700 truncate">{c.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
