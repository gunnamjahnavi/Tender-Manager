import React, { useState, useEffect } from 'react';
import { Users, FileText, Plus, CheckCircle, Award } from 'lucide-react';
import { ProjectStatusStepper } from '../components/ProjectStatusStepper';
import { ProjectDetailModal } from '../components/ProjectDetailModal';
import { getProjectStageDeadlines, getProjectStages } from '../constants/project';

const MAX_ACTIVE_PROJECTS_PER_USER = 5;

export function SeniorLeadDashboard() {
  const [myProjects, setMyProjects] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [detailProject, setDetailProject] = useState<any>(null);
  
  const [teamLeadId, setTeamLeadId] = useState('');
  const [memberIds, setMemberIds] = useState<string[]>([]);

  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  const fetchMyData = async () => {
    const pRes = await fetch('/api/projects?excludeBidDropped=true', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
    if (pRes.ok) {
       const allP = await pRes.json();
       setMyProjects(allP.filter((p: any) => p.seniorLeadId === currentUser.id));
    }
    
    const uRes = await fetch('/api/users', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
    if (uRes.ok) setUsers(await uRes.json());
  };

  useEffect(() => {
    fetchMyData();
  }, []);

  const openTeamModal = (project: any) => {
    setSelectedProject(project);
    setTeamLeadId(project.teamDetails?.leader?.id ? String(project.teamDetails.leader.id) : '');
    setMemberIds(project.teamDetails?.members?.map((member: any) => String(member.id)) || []);
  };

  const getDeadlineScore = (project: any) => {
    const deadline = project?.endDate ? new Date(project.endDate).getTime() : 0;
    if (!deadline) return 0;
    const daysUntilDeadline = Math.ceil((deadline - Date.now()) / 86400000);
    if (daysUntilDeadline <= 14) return 2;
    if (daysUntilDeadline <= 30) return 1;
    return 0;
  };

  const getRecommendationScore = (user: any, project: any) => {
    const exp = getExperienceCount(user, project.category || 'General');
    const workload = user.activeProjectsCount || 0;
    return (exp * 10) - (workload * 3) + getDeadlineScore(project);
  };

  const getRecommendedMembers = (project: any) =>
    [...membersPool].sort((a, b) => {
      const scoreDiff = getRecommendationScore(b, project) - getRecommendationScore(a, project);
      if (scoreDiff !== 0) return scoreDiff;
      return (a.activeProjectsCount || 0) - (b.activeProjectsCount || 0);
    });

  const handleSaveTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject || !teamLeadId) return;
    
    const endpoint = selectedProject.teamId ? `/api/teams/${selectedProject.teamId}/update` : '/api/teams/create';
    const method = selectedProject.teamId ? 'PATCH' : 'POST';
    const res = await fetch(endpoint, {
      method,
      headers: { 
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({ 
        projectId: selectedProject.id, 
        teamLeadId: parseInt(teamLeadId),
        members: memberIds.map(id => parseInt(id))
      })
    });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error || 'Failed to save team');
      return;
    }
    setSelectedProject(null);
    setTeamLeadId('');
    setMemberIds([]);
    fetchMyData();
  };

  const completeProject = async (id: number) => {
      const res = await fetch(`/api/projects/${id}/complete`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json' 
        }
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Failed to complete project');
      }
      fetchMyData();
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
    fetchMyData();
  };

  const toggleStageCompletion = async (projectId: number, stage: string) => {
    const project = myProjects.find(p => p.id === projectId);
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
    fetchMyData();
  };

  const toggleMember = (id: string) => {
      setMemberIds(prev => prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]);
  };

  const membersPool = users.filter(u => u.role === 'Member');

  const getExperienceCount = (user: any, category: string) => {
      if (!user.experience) return 0;
      return user.experience.filter((e: any) => e.category === category).length;
  };

  return (
    <div className="space-y-6 text-[#333]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-primary-dark)]">Senior Lead Dashboard</h1>
          <p className="text-sm text-[#666] mt-1">Operational Leadership & Team Formation</p>
        </div>
      </div>

      <div className="panel p-0 overflow-hidden">
        <div className="panel-header px-5 pt-5 mb-0 border-b border-gray-100 pb-4">
           <div className="panel-title flex items-center gap-2">
             <FileText className="w-5 h-5 text-[var(--color-primary)]" />
             My Assigned Projects
           </div>
        </div>
        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
           {myProjects.length === 0 ? (
               <p className="text-sm text-gray-400 p-4">No projects assigned currently.</p>
           ) : myProjects.map(p => (
               <div
                 key={p.id}
                 onClick={() => setDetailProject(p)}
                 className={`border ${p.status === 'Completed' ? 'border-green-200 bg-green-50/30' : 'border-gray-200 bg-white'} rounded-lg p-5 hover:border-[var(--color-primary)] transition-colors shadow-sm flex flex-col justify-between relative cursor-pointer`}
               >
                   {p.status === 'Completed' && (
                       <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-green-100 text-green-700 text-[10px] font-bold px-3 py-1 rounded-full uppercase flex items-center gap-1 shadow-sm">
                           <CheckCircle className="w-3 h-3" /> Completed
                       </div>
                   )}
                   <div className={p.status === 'Completed' ? 'mt-3 opacity-60' : ''}>
                       <div className="flex justify-between items-start mb-2 gap-2">
                           <div>
                             <div className="text-[10px] font-black text-blue-600 mb-1">{p.projectCode || `LT-${new Date(p.createdAt || Date.now()).getFullYear()}-${String(p.id).padStart(3, '0')}`}</div>
                             <h3 className="font-bold text-[var(--color-primary-dark)] leading-tight text-sm">{p.name}</h3>
                             <span 
                               className="text-[10px] uppercase font-bold text-white px-1.5 py-0.5 rounded mt-1 inline-block"
                               style={{ backgroundColor: p.categoryColor || '#6B7280' }}
                             >
                               {p.category || 'General'}
                             </span>
                           </div>
                           <span className={`status-pill shrink-0 ${p.teamId ? 'active' : 'warning'}`}>
                               {p.teamId ? 'Formed' : 'Needs Team'}
                           </span>
                       </div>
                       <p className="text-xs text-gray-500 mb-4 line-clamp-2">{p.description}</p>
                       <div className="text-[11px] text-[#666] space-y-1 uppercase">
                           <p>Client: {p.clientName}</p>
                           {p.projectState && <p>Location: {p.projectState}</p>}
                           <p className="text-[var(--color-primary)] font-bold">
                             Value: {p.currency === 'Dollars' ? '$' : '₹'} {p.estimatedValue} {p.currency === 'Dollars' ? 'Million' : 'Crore'}
                           </p>
                           {p.teamDetails && (
                             <div className="mt-2 text-[11px] text-gray-700">
                               <div><strong>Team Lead:</strong> {p.teamDetails.leader?.name || '—'}</div>
                               <div><strong>Members:</strong> {p.teamDetails.members?.map((m: any) => m.name).join(', ') || '—'}</div>
                             </div>
                           )}
                       </div>
                   </div>

                   <div className="mt-4 px-2 py-2 bg-gray-50/50 rounded-lg" onClick={(e) => e.stopPropagation()}>
                     <ProjectStatusStepper 
                        completedStages={p.completedStages || []} 
                        stages={getProjectStages(p)} 
                        stageDeadlines={getProjectStageDeadlines(p)}
                        onStageToggle={(stage) => toggleStageCompletion(p.id, stage)}
                     />
                   </div>

                   {!p.teamId && p.status !== 'Completed' && (
                       <button 
                         onClick={(e) => { e.stopPropagation(); openTeamModal(p); }}
                         className="mt-4 w-full flex items-center justify-center gap-1 bg-[var(--color-primary-light)] text-[var(--color-primary)] hover:bg-[#d4e9ff] transition-colors rounded px-4 py-2 text-xs font-bold uppercase"
                       >
                         <Plus className="w-3 h-3" /> Form Team
                       </button>
                   )}
                   {p.teamId && p.status !== 'Completed' && (
                     <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                       <button
                         onClick={(e) => { e.stopPropagation(); openTeamModal(p); }}
                         className="flex items-center justify-center gap-1 bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors rounded px-4 py-2 text-xs font-bold uppercase"
                       >
                         <Plus className="w-3 h-3" /> Add Members
                       </button>
                       <button 
                         onClick={(e) => { e.stopPropagation(); completeProject(p.id); }}
                         className="flex items-center justify-center gap-1 bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 transition-colors rounded px-4 py-2 text-xs font-bold uppercase"
                       >
                         <CheckCircle className="w-3 h-3" /> Mark Completed
                       </button>
                     </div>
                   )}
               </div>
           ))}
        </div>
      </div>

      {detailProject && (
        <ProjectDetailModal project={detailProject} onClose={() => setDetailProject(null)} />
      )}

      {selectedProject && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <div>
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  {selectedProject.teamId ? 'Update Team for' : 'Form Team for'} <span className="text-[var(--color-primary)]">{selectedProject.name}</span>
                </h3>
                <p className="text-[10px] font-bold text-gray-500 mt-1 uppercase bg-gray-100 px-2 py-0.5 rounded inline-block">
                  Target Experience: {selectedProject.category || 'General'}
                </p>
              </div>
              <div className="text-right">
                <span className="text-[10px] bg-red-50 text-red-600 px-2 py-1 rounded font-bold uppercase mr-2 border border-red-100">Max 5 Projects/Member</span>
              </div>
            </div>
            <form onSubmit={handleSaveTeam} className="p-6 space-y-5 text-sm overflow-y-auto">
              <div>
                <label className="block text-gray-700 font-bold mb-3 flex items-center justify-between">
                  <span>1. Designate Team Lead</span>
                  <span className="text-[10px] text-gray-400 font-normal italic">Selected from all Members</span>
                </label>
                <div className="grid grid-cols-1 gap-3 max-h-72 overflow-y-auto pr-2">
                  {getRecommendedMembers(selectedProject).map((l, index) => {
                    const exp = getExperienceCount(l, selectedProject.category || 'General');
                    const isLimitReached = l.activeProjectsCount >= MAX_ACTIVE_PROJECTS_PER_USER;
                    return (
                      <label key={l.id} className={`flex items-start justify-between gap-4 p-4 rounded-lg border transition-all cursor-pointer ${teamLeadId === l.id.toString() ? 'bg-blue-50 border-blue-400 ring-1 ring-blue-400' : 'bg-white border-gray-200 hover:border-gray-300'} ${isLimitReached ? 'border-orange-200 bg-orange-50/20' : ''}`}>
                        <div className="flex flex-col gap-1 min-w-0 flex-1">
                           <div className="flex items-start gap-2">
                              <input type="radio" required name="teamLead" value={l.id} checked={teamLeadId === l.id.toString()} onChange={e => { setTeamLeadId(e.target.value); setMemberIds(prev => prev.filter(mid => mid !== e.target.value)); }} className="text-[var(--color-primary)] focus:ring-[var(--color-primary)] w-4 h-4" />
                              <div className="min-w-0 flex-1">
                                <span className="block font-bold text-gray-800 whitespace-normal break-words leading-snug">{l.name}</span>
                                <div className="mt-1 flex flex-wrap gap-1">
                                  {index < 3 && <span className="text-[9px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-bold uppercase border border-green-200">Recommended</span>}
                                  {isLimitReached && <span className="text-[9px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded font-bold uppercase border border-orange-200">High Load</span>}
                                </div>
                              </div>
                           </div>
                           <div className="ml-6 flex items-center gap-2">
                              <span className={`text-[10px] font-bold ${isLimitReached ? 'text-orange-600' : 'text-gray-400'}`}>{l.activeProjectsCount}/5 Active</span>
                           </div>
                        </div>
                        {exp > 0 && (
                           <span className="flex items-center gap-1 text-[9px] font-bold text-orange-600 bg-orange-50 border border-orange-100 px-2 py-0.5 rounded-full uppercase whitespace-nowrap">
                               <Award className="w-2.5 h-2.5" /> {exp} {selectedProject.category}
                           </span>
                        )}
                      </label>
                    );
                  })}
                </div>
              </div>
              
              <div>
                <label className="block text-gray-700 font-bold mb-3 flex items-center justify-between">
                   <span>2. Add Team Members</span>
                   <span className="text-[10px] text-gray-400 font-normal italic">Assign remaining workforce</span>
                </label>
                <div className="grid grid-cols-1 gap-3 max-h-72 overflow-y-auto pr-2">
                   {getRecommendedMembers(selectedProject).filter(m => m.id.toString() !== teamLeadId).map((m, index) => {
                       const exp = getExperienceCount(m, selectedProject.category || 'General');
                       const isLimitReached = m.activeProjectsCount >= MAX_ACTIVE_PROJECTS_PER_USER;
                       return (
                           <label key={m.id} className={`flex items-start justify-between gap-4 p-4 rounded-lg border transition-all cursor-pointer ${memberIds.includes(m.id.toString()) ? 'bg-blue-50 border-blue-400 ring-1 ring-blue-400' : 'bg-white border-gray-200 hover:border-gray-300'} ${isLimitReached ? 'border-orange-200 bg-orange-50/20' : ''}`}>
                               <div className="min-w-0 flex-1">
                                   <div className="flex items-start gap-2">
                                       <input type="checkbox" checked={memberIds.includes(m.id.toString())} onChange={() => toggleMember(m.id.toString())} className="rounded text-[var(--color-primary)] focus:ring-[var(--color-primary)] w-4 h-4" />
                                       <div className="min-w-0 flex-1">
                                         <span className="block font-bold text-gray-800 whitespace-normal break-words leading-snug">{m.name}</span>
                                         <div className="mt-1 flex flex-wrap gap-1">
                                           {index < 3 && <span className="text-[9px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-bold uppercase border border-green-200">Recommended</span>}
                                           {isLimitReached && <span className="text-[9px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded font-bold uppercase border border-orange-200">High Load</span>}
                                         </div>
                                       </div>
                                   </div>
                                   <div className="ml-6 flex items-center gap-2">
                                      <span className={`text-[10px] font-bold ${isLimitReached ? 'text-orange-600' : 'text-gray-400'}`}>{m.activeProjectsCount}/5 Active</span>
                                   </div>
                               </div>
                               {exp > 0 && (
                                   <span className="flex items-center gap-1 text-[9px] font-bold text-orange-600 bg-orange-50 border border-orange-100 px-2 py-0.5 rounded-full uppercase whitespace-nowrap">
                                       <Award className="w-2.5 h-2.5" /> {exp} {selectedProject.category}
                                   </span>
                               )}
                           </label>
                       );
                   })}
                </div>
              </div>
              <div className="pt-4 flex justify-end gap-3 border-t">
                <button type="button" onClick={() => setSelectedProject(null)} className="px-5 py-2 text-gray-600 hover:bg-gray-100 rounded-md font-bold text-xs uppercase transition-colors">Cancel</button>
                <button type="submit" className="px-6 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white rounded-md font-bold text-xs uppercase shadow-md transition-all">
                  {selectedProject.teamId ? 'Save Team' : 'Form Project Team'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
