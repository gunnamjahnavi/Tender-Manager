import React, { useState, useEffect } from 'react';
import { Users, FileText, ChevronRight, Plus, Award } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { ProjectStatusStepper } from '../components/ProjectStatusStepper';
import { ProjectDetailModal } from '../components/ProjectDetailModal';
import { getDisplayStatus, getProjectStageDeadlines, getProjectStages, getStatusPillClass } from '../constants/project';

const MAX_ACTIVE_PROJECTS_PER_USER = 5;

export function HodDashboard() {
  const [projects, setProjects] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [teamProject, setTeamProject] = useState<any>(null);
  const [detailProject, setDetailProject] = useState<any>(null);
  const [assignedLead, setAssignedLead] = useState('');
  const [teamLeadId, setTeamLeadId] = useState('');
  const [memberIds, setMemberIds] = useState<string[]>([]);

  const fetchData = async () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const pRes = await fetch('/api/projects?excludeBidDropped=true', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
    if (pRes.ok) {
      const allProjects = await pRes.json();
      setProjects(allProjects);
    }
    
    const uRes = await fetch('/api/users', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
    if (uRes.ok) setUsers(await uRes.json());
  };

  useEffect(() => {
    fetchData();
  }, []);

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAzad = user.name?.includes('Azad');
  const isAnurag = user.name?.includes('Anurag');
  const canManageCategory = (project: any) =>
    (!isAzad || project.category !== 'Bridges') && (!isAnurag || project.category === 'Bridges');

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject || !assignedLead) return;
    
    await fetch(`/api/projects/${selectedProject.id}/assign-senior-lead`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({ seniorLeadId: parseInt(assignedLead) })
    });
    setSelectedProject(null);
    fetchData();
  };

  const openTeamModal = (project: any) => {
    if (isAzad && project.category === 'Bridges') return;
    if (isAnurag && project.category !== 'Bridges') return;
    setTeamProject(project);
    setTeamLeadId(project.teamDetails?.leader?.id ? String(project.teamDetails.leader.id) : '');
    setMemberIds(project.teamDetails?.members?.map((member: any) => String(member.id)) || []);
  };

  const toggleMember = (id: string) => {
    setMemberIds(prev => prev.includes(id) ? prev.filter(memberId => memberId !== id) : [...prev, id]);
  };

  const getExperienceCount = (user: any, category: string) => {
    if (!user.experience) return 0;
    return user.experience.filter((e: any) => e.category === category).length;
  };

  const getDeadlineScore = (project: any) => {
    const deadline = project?.endDate ? new Date(project.endDate).getTime() : 0;
    if (!deadline) return 0;
    const daysUntilDeadline = Math.ceil((deadline - Date.now()) / 86400000);
    if (daysUntilDeadline <= 14) return 2;
    if (daysUntilDeadline <= 30) return 1;
    return 0;
  };

  const getRecommendationScore = (member: any, project: any) => {
    const exp = getExperienceCount(member, project.category || 'General');
    return (exp * 10) - ((member.activeProjectsCount || 0) * 3) + getDeadlineScore(project);
  };

  const membersPool = users.filter(u => u.role === 'Member');
  const getRecommendedMembers = (project: any) =>
    [...membersPool].sort((a, b) => {
      const scoreDiff = getRecommendationScore(b, project) - getRecommendationScore(a, project);
      if (scoreDiff !== 0) return scoreDiff;
      return (a.activeProjectsCount || 0) - (b.activeProjectsCount || 0);
    });

  const handleSaveTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamProject || !teamLeadId) return;

    const endpoint = teamProject.teamId ? `/api/teams/${teamProject.teamId}/update` : '/api/teams/create';
    const method = teamProject.teamId ? 'PATCH' : 'POST';
    const res = await fetch(endpoint, {
      method,
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        projectId: teamProject.id,
        teamLeadId: parseInt(teamLeadId),
        members: memberIds.map(id => parseInt(id))
      })
    });

    if (!res.ok) {
      const data = await res.json();
      alert(data.error || 'Failed to save team');
      return;
    }

    setTeamProject(null);
    setTeamLeadId('');
    setMemberIds([]);
    fetchData();
  };

  const updateProjectStatus = async (projectId: number, newStatus: string) => {
    const project = projects.find(p => p.id === projectId);
    
    // Restriction: Azad only deals with Non-Bridges, Anurag only deals with Bridges
    if (isAzad && project?.category === 'Bridges') return;
    if (isAnurag && project?.category !== 'Bridges') return;

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
    
    // Restriction: Azad only deals with Non-Bridges, Anurag only deals with Bridges
    if (isAzad && project.category === 'Bridges') return;
    if (isAnurag && project.category !== 'Bridges') return;
    
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

  const cData = [
    { name: 'Active', count: projects.filter(p => p.status !== 'Completed').length },
    { name: 'Completed', count: projects.filter(p => p.status === 'Completed').length },
  ];

  const seniorLeads = users.filter(u => u.role === 'Senior Lead');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">HOD Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Highest level visibility and assignment</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="panel lg:col-span-2 flex flex-col p-0 overflow-hidden">
          <div className="panel-header px-5 pt-5 mb-0">
            <div className="panel-title flex items-center gap-2">
              <FileText className="w-5 h-5 text-[var(--color-primary)]" />
              Assign Senior Lead to New Projects
            </div>
          </div>
          <div className="flex-1 overflow-auto p-5">
            <div className="space-y-3">
              {projects
                .filter(p => !p.seniorLeadId)
                .filter(p => !isAzad || p.category !== 'Bridges') // Azad cannot deal with Bridges
                .filter(p => !isAnurag || p.category === 'Bridges') // Anurag only deals with Bridges
                .map(p => (
                  <div key={p.id} className="p-4 border border-[var(--color-primary-light)] bg-white rounded-lg flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-2 h-10 rounded-full" 
                      style={{ backgroundColor: p.categoryColor || '#CBD5E1' }}
                      title={p.category}
                    ></div>
                    <div>
                      <h3 className="font-bold text-[var(--color-primary-dark)] text-sm">{p.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-[10px] text-[#666] uppercase">Client: {p.clientName}</p>
                        <p className="text-[10px] text-[var(--color-primary)] font-bold">
                          {p.currency === 'Dollars' ? '$' : '₹'} {p.estimatedValue} {p.currency === 'Dollars' ? 'M' : 'Cr'}
                        </p>
                        {p.projectState && <span className="text-[10px] text-gray-500">[{p.projectState}]</span>}
                        <span className="text-[10px] uppercase font-black px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">{p.category}</span>
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedProject(p)}
                    className="flex items-center gap-1 text-xs bg-[var(--color-primary)] text-white px-3 py-1.5 rounded hover:bg-[var(--color-primary-dark)] transition-colors uppercase font-bold"
                  >
                    Assign
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {projects
                .filter(p => !p.seniorLeadId)
                .filter(p => !isAzad || p.category !== 'Bridges')
                .filter(p => !isAnurag || p.category === 'Bridges')
                .length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-4">No pending unassigned projects.</p>
                )}
            </div>
          </div>
        </div>
        
        <div className="panel flex flex-col items-center justify-center min-w-0">
             <div className="panel-title self-start w-full mb-6">Project Stats</div>
             <div className="w-full h-48 min-h-[192px]">
               <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={cData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                   <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                   <Tooltip />
                   <Bar dataKey="count" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
                 </BarChart>
               </ResponsiveContainer>
             </div>
        </div>
      </div>

      <div className="panel p-0 overflow-hidden">
        <div className="panel-header px-5 pt-5 mb-0 border-b border-gray-100 pb-4 flex justify-between items-center">
           <div className="panel-title flex items-center gap-2">
             <Users className="w-5 h-5 text-[var(--color-primary)]" />
             All Projects Overview
           </div>
           <button 
               onClick={() => {
                   const reportData = JSON.stringify(projects, null, 2);
                   const blob = new Blob([reportData], { type: "application/json" });
                   const url = URL.createObjectURL(blob);
                   const link = document.createElement('a');
                   link.href = url;
                   link.download = `Projects_Report_${new Date().toISOString().split('T')[0]}.json`;
                   document.body.appendChild(link);
                   link.click();
                   document.body.removeChild(link);
               }}
               className="text-xs bg-[var(--color-primary)] text-white px-3 py-1.5 rounded hover:bg-[var(--color-primary-dark)] font-bold uppercase transition-colors"
           >
               Export Report
           </button>
        </div>
        <div className="overflow-x-auto text-sm">
          <table className="data-table">
            <thead>
              <tr>
                <th>Project</th>
                <th>Status Pipeline</th>
                <th>Status Info</th>
                <th>Senior Lead</th>
                <th>Team</th>
              </tr>
            </thead>
            <tbody>
              {projects.map(p => {
                const leadName = users.find(u => u.id === p.seniorLeadId)?.name || 'Unassigned';
                return (
                  <tr
                    key={p.id}
                    onClick={() => setDetailProject(p)}
                    className="cursor-pointer hover:bg-gray-50/80"
                  >
                    <td className="font-medium text-[var(--color-primary-dark)]">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.categoryColor || '#eee' }}></div>
                        <div>
                          <div>{p.name}</div>
                          <div className="text-[9px] text-[var(--color-primary)] font-bold uppercase">
                            {p.currency === 'Dollars' ? '$' : '₹'} {p.estimatedValue} {p.currency === 'Dollars' ? 'M' : 'Cr'}
                            {p.projectState && <span className="text-gray-400 font-normal ml-1">| {p.projectState}</span>}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="w-1/2" onClick={(e) => e.stopPropagation()}>
                       <div className="py-2">
                          <ProjectStatusStepper 
                            completedStages={p.completedStages || []} 
                            stages={getProjectStages(p)} 
                            stageDeadlines={getProjectStageDeadlines(p)}
                            onStageToggle={(stage) => toggleStageCompletion(p.id, stage)}
                            isReadOnly={
                                (isAzad && p.category === 'Bridges') || 
                                (isAnurag && p.category !== 'Bridges')
                            }
                          />
                       </div>
                    </td>
                    <td>
                      <span className={`status-pill ${getStatusPillClass(getDisplayStatus(p))}`}>
                        {getDisplayStatus(p)}
                      </span>
                    </td>
                    <td>{leadName}</td>
                    <td>
                      {p.teamDetails ? (
                        <div className="text-[11px]">
                          <div className="font-bold">{p.teamDetails.leader?.name || '—'}</div>
                          <div className="text-gray-500 text-xs">{p.teamDetails.members?.map((m: any) => m.name).join(', ') || 'No members'}</div>
                          {p.status !== 'Completed' && canManageCategory(p) && (
                            <button
                              onClick={(e) => { e.stopPropagation(); openTeamModal(p); }}
                              className="mt-2 inline-flex items-center gap-1 rounded bg-blue-50 px-2 py-1 text-[10px] font-bold uppercase text-blue-700 hover:bg-blue-100"
                            >
                              <Plus className="w-3 h-3" /> Add Members
                            </button>
                          )}
                        </div>
                      ) : (
                        <div>
                          <span className="text-[10px] text-gray-300 italic">Not formed</span>
                          {p.status !== 'Completed' && canManageCategory(p) && (
                            <button
                              onClick={(e) => { e.stopPropagation(); openTeamModal(p); }}
                              className="mt-2 flex items-center gap-1 rounded bg-[var(--color-primary-light)] px-2 py-1 text-[10px] font-bold uppercase text-[var(--color-primary)] hover:bg-[#d4e9ff]"
                            >
                              <Plus className="w-3 h-3" /> Form Team
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {detailProject && (
        <ProjectDetailModal project={detailProject} onClose={() => setDetailProject(null)} />
      )}

      {selectedProject && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-sm w-full overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Assign Senior Lead</h3>
              <p className="text-xs text-gray-500 mt-1">Project: {selectedProject.name}</p>
            </div>
            <form onSubmit={handleAssign} className="p-6 space-y-4 text-sm">
              <div>
                <label className="block text-gray-700 font-bold mb-1">Select Lead</label>
                <select required value={assignedLead} onChange={e => setAssignedLead(e.target.value)} className="w-full border border-gray-300 rounded p-2 focus:ring-[var(--color-primary)] outline-none">
                  <option value="">-- Choose Senior Lead --</option>
                  {seniorLeads.map(l => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setSelectedProject(null)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md font-bold text-xs uppercase">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-[var(--color-primary)] text-white rounded hover:bg-[var(--color-primary-dark)] font-bold text-xs uppercase">Confirm Assignment</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {teamProject && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <div>
                <h3 className="font-semibold text-gray-900">
                  {teamProject.teamId ? 'Update Team for' : 'Form Team for'} <span className="text-[var(--color-primary)]">{teamProject.name}</span>
                </h3>
                <p className="text-[10px] font-bold text-gray-500 mt-1 uppercase bg-gray-100 px-2 py-0.5 rounded inline-block">
                  Target Experience: {teamProject.category || 'General'}
                </p>
              </div>
              <span className="text-[10px] bg-red-50 text-red-600 px-2 py-1 rounded font-bold uppercase border border-red-100">Max 5 Projects/Member</span>
            </div>
            <form onSubmit={handleSaveTeam} className="p-6 space-y-5 text-sm overflow-y-auto">
              <div>
                <label className="block text-gray-700 font-bold mb-3">1. Designate Team Lead</label>
                <div className="grid grid-cols-1 gap-3 max-h-72 overflow-y-auto pr-2">
                  {getRecommendedMembers(teamProject).map((member, index) => {
                    const exp = getExperienceCount(member, teamProject.category || 'General');
                    const isLimitReached = (member.activeProjectsCount || 0) >= MAX_ACTIVE_PROJECTS_PER_USER;
                    return (
                      <label key={member.id} className={`flex items-start justify-between gap-4 p-4 rounded-lg border transition-all cursor-pointer ${teamLeadId === member.id.toString() ? 'bg-blue-50 border-blue-400 ring-1 ring-blue-400' : 'bg-white border-gray-200 hover:border-gray-300'} ${isLimitReached ? 'border-orange-200 bg-orange-50/20' : ''}`}>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start gap-2">
                            <input type="radio" required name="hodTeamLead" value={member.id} checked={teamLeadId === member.id.toString()} onChange={e => { setTeamLeadId(e.target.value); setMemberIds(prev => prev.filter(id => id !== e.target.value)); }} className="text-[var(--color-primary)] focus:ring-[var(--color-primary)] w-4 h-4" />
                            <div className="min-w-0 flex-1">
                              <span className="block font-bold text-gray-800 whitespace-normal break-words leading-snug">{member.name}</span>
                              <div className="mt-1 flex flex-wrap gap-1">
                                {index < 3 && <span className="text-[9px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-bold uppercase border border-green-200">Recommended</span>}
                                {isLimitReached && <span className="text-[9px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded font-bold uppercase border border-orange-200">High Load</span>}
                              </div>
                            </div>
                          </div>
                          <span className={`ml-6 text-[10px] font-bold ${isLimitReached ? 'text-orange-600' : 'text-gray-400'}`}>{member.activeProjectsCount || 0}/5 Active</span>
                        </div>
                        {exp > 0 && (
                          <span className="flex items-center gap-1 text-[9px] font-bold text-orange-600 bg-orange-50 border border-orange-100 px-2 py-0.5 rounded-full uppercase whitespace-nowrap">
                            <Award className="w-2.5 h-2.5" /> {exp} {teamProject.category}
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-3">2. Add Team Members</label>
                <div className="grid grid-cols-1 gap-3 max-h-72 overflow-y-auto pr-2">
                  {getRecommendedMembers(teamProject).filter(member => member.id.toString() !== teamLeadId).map((member, index) => {
                    const exp = getExperienceCount(member, teamProject.category || 'General');
                    const isLimitReached = (member.activeProjectsCount || 0) >= MAX_ACTIVE_PROJECTS_PER_USER;
                    return (
                      <label key={member.id} className={`flex items-start justify-between gap-4 p-4 rounded-lg border transition-all cursor-pointer ${memberIds.includes(member.id.toString()) ? 'bg-blue-50 border-blue-400 ring-1 ring-blue-400' : 'bg-white border-gray-200 hover:border-gray-300'} ${isLimitReached ? 'border-orange-200 bg-orange-50/20' : ''}`}>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start gap-2">
                            <input type="checkbox" checked={memberIds.includes(member.id.toString())} onChange={() => toggleMember(member.id.toString())} className="rounded text-[var(--color-primary)] focus:ring-[var(--color-primary)] w-4 h-4" />
                            <div className="min-w-0 flex-1">
                              <span className="block font-bold text-gray-800 whitespace-normal break-words leading-snug">{member.name}</span>
                              <div className="mt-1 flex flex-wrap gap-1">
                                {index < 3 && <span className="text-[9px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-bold uppercase border border-green-200">Recommended</span>}
                                {isLimitReached && <span className="text-[9px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded font-bold uppercase border border-orange-200">High Load</span>}
                              </div>
                            </div>
                          </div>
                          <span className={`ml-6 text-[10px] font-bold ${isLimitReached ? 'text-orange-600' : 'text-gray-400'}`}>{member.activeProjectsCount || 0}/5 Active</span>
                        </div>
                        {exp > 0 && (
                          <span className="flex items-center gap-1 text-[9px] font-bold text-orange-600 bg-orange-50 border border-orange-100 px-2 py-0.5 rounded-full uppercase whitespace-nowrap">
                            <Award className="w-2.5 h-2.5" /> {exp} {teamProject.category}
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t">
                <button type="button" onClick={() => setTeamProject(null)} className="px-5 py-2 text-gray-600 hover:bg-gray-100 rounded-md font-bold text-xs uppercase transition-colors">Cancel</button>
                <button type="submit" className="px-6 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white rounded-md font-bold text-xs uppercase shadow-md transition-all">
                  {teamProject.teamId ? 'Save Team' : 'Form Project Team'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
