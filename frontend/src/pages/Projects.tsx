import { useState, useEffect } from 'react';
import { Briefcase, Search, Filter, Calendar, Edit2, Trash2, X, MoreVertical, Trophy, ChevronDown, RotateCcw } from 'lucide-react';
import { ProjectDetailModal } from '../components/ProjectDetailModal';
import { VALID_PROJECT_STATUSES, getDisplayStatus, getStatusPillClass, isBidDroppedProject } from '../constants/project';

export function Projects() {
  const [projects, setProjects] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchState, setSearchState] = useState('');
  const [searchCategory, setSearchCategory] = useState('');
  const [searchSeniorLead, setSearchSeniorLead] = useState('');
  const [searchCountry, setSearchCountry] = useState('');
  const [searchMonth, setSearchMonth] = useState('');
  const [searchYear, setSearchYear] = useState('');
  const [searchStatus, setSearchStatus] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<any>(null);
  const [editValues, setEditValues] = useState<any>({
    name: '',
    clientName: '',
    description: '',
    category: '',
    projectState: '',
    country: '',
    status: '',
    estimatedValue: '',
    currency: 'Dollars',
    seniorLeadId: '',
    startDate: '',
    endDate: ''
  });
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [detailProject, setDetailProject] = useState<any>(null);
  const [editNameError, setEditNameError] = useState('');
  const [showTenderOutcomeModal, setShowTenderOutcomeModal] = useState<any>(null);
  const [tenderOutcomeForm, setTenderOutcomeForm] = useState<any>({
    result: 'Success',
    ranking: '',
    remarks: ''
  });

  const fetchProjects = async () => {
    const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
    try {
      const res = await fetch('/api/projects', { headers });
      if (!res.ok) {
        console.error('Failed to load projects:', res.status);
        return;
      }
      const data = await res.json();
      setProjects(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load projects:', error);
    }
  };

  const fetchUsers = async () => {
    const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
    const res = await fetch('/api/users', { headers });
    if (res.ok) {
      setUsers(await res.json());
    }
  };

  useEffect(() => {
    fetchProjects();
    fetchUsers();
  }, []);

  const getMonthName = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleString('default', { month: 'long' });
  };

  const toDateInputValue = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return '';
    return date.toISOString().split('T')[0];
  };

  const getProjectFilterDate = (project: any) => project.endDate || project.startDate || project.createdAt;

  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  const openEditModal = (project: any) => {
    setEditNameError('');
    setEditingProject(project);
    setEditValues({
      name: project.name || '',
      clientName: project.clientName || '',
      description: project.description || '',
      category: project.category || '',
      projectState: project.projectState || '',
      country: project.country || '',
      status: project.status || '',
      estimatedValue: project.estimatedValue || '',
      currency: project.currency || 'Dollars',
      seniorLeadId: project.seniorLead?.id ? String(project.seniorLead.id) : '',
      startDate: toDateInputValue(project.startDate),
      endDate: toDateInputValue(project.endDate)
    });
  };

  const closeEditModal = () => {
    setEditNameError('');
    setEditingProject(null);
    setEditValues({
      name: '',
      clientName: '',
      description: '',
      category: '',
      projectState: '',
      country: '',
      status: '',
      estimatedValue: '',
      currency: 'Dollars',
      seniorLeadId: '',
      startDate: '',
      endDate: ''
    });
  };

  const saveProjectChanges = async () => {
    if (!editingProject) return;
    const projectName = editValues.name?.trim();
    if (projects.some(p => p.id !== editingProject.id && p.name.toLowerCase() === projectName.toLowerCase())) {
      setEditNameError('A project with this name already exists');
      return;
    }
    setEditNameError('');

    try {
      const response = await fetch(`/api/projects/${editingProject.id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...editValues,
          seniorLeadId: editValues.seniorLeadId || null
        })
      });
      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.error && errorData.error.toLowerCase().includes('name already exists')) {
          setEditNameError(errorData.error);
        } else {
          alert(errorData.error || 'Failed to save project changes');
        }
        return;
      }
      closeEditModal();
      fetchProjects();
    } catch (error) {
      console.error('Save project error:', error);
      alert('Unable to save project changes. Please try again.');
    }
  };

  const deleteProject = async (project: any) => {
    if (!window.confirm(`Delete project ${project.name}? This cannot be undone.`)) return;
    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (!response.ok) {
        const errorData = await response.json();
        alert(errorData.error || 'Failed to delete project');
        return;
      }
      fetchProjects();
    } catch (error) {
      console.error('Delete project error:', error);
      alert('Unable to delete project. Please try again.');
    }
  };

  const bidDropProject = async (project: any) => {
    if (!window.confirm(`Drop bid for project ${project.name}? The project will be marked as Bid Dropped and remain visible in the Projects directory.`)) return;
    try {
      const response = await fetch(`/api/projects/${project.id}/bid-drop`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (!response.ok) {
        const errorData = await response.json();
        alert(errorData.error || 'Failed to drop bid for project');
        return;
      }
      fetchProjects();
    } catch (error) {
      console.error('Bid drop project error:', error);
      alert('Unable to drop bid for project. Please try again.');
    }
  };

  const revertBidDropProject = async (project: any) => {
    if (!window.confirm(`Revert bid drop for project ${project.name}? The project will return to In Progress.`)) return;
    try {
      const response = await fetch(`/api/projects/${project.id}/revert-bid-drop`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (!response.ok) {
        const errorData = await response.json();
        alert(errorData.error || 'Failed to revert bid drop');
        return;
      }
      fetchProjects();
    } catch (error) {
      console.error('Revert bid drop error:', error);
      alert('Unable to revert bid drop. Please try again.');
    }
  };

  const recordTenderOutcome = async () => {
    if (!showTenderOutcomeModal) return;
    if (tenderOutcomeForm.result === 'Fail' && !tenderOutcomeForm.ranking) {
      alert('Please enter the ranking/position for failed tenders');
      return;
    }
    
    try {
      const response = await fetch(`/api/projects/${showTenderOutcomeModal.id}/tender-outcome`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          result: tenderOutcomeForm.result,
          ranking: tenderOutcomeForm.result === 'Fail' ? parseInt(tenderOutcomeForm.ranking) : null,
          remarks: tenderOutcomeForm.remarks || null
        })
      });
      if (!response.ok) {
        const errorData = await response.json();
        alert(errorData.error || 'Failed to record tender outcome');
        return;
      }
      setShowTenderOutcomeModal(null);
      setTenderOutcomeForm({ result: 'Success', ranking: '', remarks: '' });
      fetchProjects();
    } catch (error) {
      console.error('Record tender outcome error:', error);
      alert('Unable to record tender outcome. Please try again.');
    }
  };

  const filteredProjects = projects.filter(p => {
    const lowerQuery = searchQuery.toLowerCase();
    const matchQuery = !searchQuery || [
      p.name,
      p.projectCode,
      p.clientName,
      p.description,
      p.category,
      p.projectState,
      p.country,
      p.seniorLead?.name,
      p.hod?.name
    ].some(value => (value || '').toString().toLowerCase().includes(lowerQuery));
    const matchState = !searchState || (p.projectState || '').toLowerCase().includes(searchState.toLowerCase());
    const matchCategory = !searchCategory || (p.category || '').toLowerCase().includes(searchCategory.toLowerCase());
    const matchSeniorLead = !searchSeniorLead || (p.seniorLead?.name || '').toLowerCase().includes(searchSeniorLead.toLowerCase());
    const matchCountry = !searchCountry || (p.country || '').toLowerCase().includes(searchCountry.toLowerCase());
    const matchStatus = !searchStatus || getDisplayStatus(p) === searchStatus;
    
    const projectDate = getProjectFilterDate(p);
    const projectMonth = getMonthName(projectDate);
    const matchMonth = !searchMonth || projectMonth.toLowerCase() === searchMonth.toLowerCase();
    const projectYear = projectDate ? new Date(projectDate).getFullYear().toString() : '';
    const matchYear = !searchYear || projectYear === searchYear;

    return matchQuery && matchState && matchCategory && matchSeniorLead && matchCountry && matchStatus && matchMonth && matchYear;
  });

  const uniqueStates = Array.from(new Set(projects.map(p => p.projectState).filter(Boolean)));
  const uniqueCategories = Array.from(new Set(projects.map(p => p.category).filter(Boolean)));
  const uniqueSeniorLeads = Array.from(new Set(projects.map(p => p.seniorLead?.name).filter(Boolean)));
  const uniqueCountries = Array.from(new Set(projects.map(p => p.country).filter(Boolean)));
  const uniqueYears = Array.from(new Set(projects.map(p => {
    const projectDate = getProjectFilterDate(p);
    return projectDate ? new Date(projectDate).getFullYear().toString() : '';
  }).filter(Boolean))).sort().reverse();
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const hasActiveFilters = searchQuery || searchState || searchCategory || searchSeniorLead || searchCountry || searchMonth || searchYear || searchStatus;
  const clearFilters = () => {
    setSearchQuery('');
    setSearchState('');
    setSearchCategory('');
    setSearchSeniorLead('');
    setSearchCountry('');
    setSearchMonth('');
    setSearchYear('');
    setSearchStatus('');
  };

  return (
    <div className="space-y-6 text-[#333]">
      <div className="flex items-center justify-between">
         <div>
          <h1 className="text-2xl font-bold text-[var(--color-primary-dark)]">Project Master</h1>
          <p className="text-sm text-[#666] mt-1">Global view of all tenders and projects</p>
         </div>
      </div>

      <div className="panel bg-gray-50/50 p-3">
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search projects..."
              className="w-full rounded border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
            />
          </div>
          <div className="relative">
            <button
              onClick={() => setIsFilterOpen(prev => !prev)}
              className="flex w-full items-center justify-center gap-2 rounded border border-gray-200 bg-white px-4 py-2 text-xs font-bold uppercase text-gray-600 hover:bg-gray-50 md:w-auto"
            >
              <Filter className="h-4 w-4" />
              Filters
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isFilterOpen ? 'rotate-180' : ''}`} />
            </button>
            {isFilterOpen && (
              <div className="absolute right-0 z-40 mt-2 w-[min(92vw,520px)] rounded-lg border border-gray-200 bg-white p-4 shadow-xl">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <select className="text-xs border border-gray-200 rounded p-2 outline-none focus:ring-1 focus:ring-[var(--color-primary)]" value={searchCategory} onChange={e => setSearchCategory(e.target.value)}>
                    <option value="">Project Category</option>
                    {uniqueCategories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <select className="text-xs border border-gray-200 rounded p-2 outline-none focus:ring-1 focus:ring-[var(--color-primary)]" value={searchStatus} onChange={e => setSearchStatus(e.target.value)}>
                    <option value="">Project Status</option>
                    {VALID_PROJECT_STATUSES.map(status => <option key={status} value={status}>{status}</option>)}
                  </select>
                  <select className="text-xs border border-gray-200 rounded p-2 outline-none focus:ring-1 focus:ring-[var(--color-primary)]" value={searchYear} onChange={e => setSearchYear(e.target.value)}>
                    <option value="">Year</option>
                    {uniqueYears.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                  <select className="text-xs border border-gray-200 rounded p-2 outline-none focus:ring-1 focus:ring-[var(--color-primary)]" value={searchMonth} onChange={e => setSearchMonth(e.target.value)}>
                    <option value="">Month</option>
                    {months.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                  <select className="text-xs border border-gray-200 rounded p-2 outline-none focus:ring-1 focus:ring-[var(--color-primary)]" value={searchState} onChange={e => setSearchState(e.target.value)}>
                    <option value="">State</option>
                    {uniqueStates.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <select className="text-xs border border-gray-200 rounded p-2 outline-none focus:ring-1 focus:ring-[var(--color-primary)]" value={searchCountry} onChange={e => setSearchCountry(e.target.value)}>
                    <option value="">Country</option>
                    {uniqueCountries.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <select className="text-xs border border-gray-200 rounded p-2 outline-none focus:ring-1 focus:ring-[var(--color-primary)] sm:col-span-2" value={searchSeniorLead} onChange={e => setSearchSeniorLead(e.target.value)}>
                    <option value="">Senior Lead</option>
                    {uniqueSeniorLeads.map(sl => <option key={sl} value={sl}>{sl}</option>)}
                  </select>
                </div>
              </div>
            )}
          </div>
          {hasActiveFilters && (
            <button onClick={clearFilters} className="rounded px-3 py-2 text-[10px] font-bold uppercase text-red-500 hover:bg-red-50">
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="panel p-0 overflow-hidden">
        <div className="panel-header px-5 pt-5 mb-0 border-b border-[#e1e1e1] pb-4 flex justify-between items-center">
           <div className="panel-title flex items-center gap-2">
             <Briefcase className="w-5 h-5 text-[var(--color-primary)]" />
             Project Directory <span className="text-xs text-gray-400 font-normal ml-2">({filteredProjects.length} results)</span>
           </div>
           { hasActiveFilters && (
              <button 
                onClick={clearFilters}
                className="text-[10px] font-bold text-red-500 hover:text-red-700 uppercase"
              >
                Clear Filters
              </button>
           )}
        </div>
        <div className="overflow-x-auto text-sm">
          <table className="data-table">
            <thead>
              <tr>
                <th className="w-24">Code</th>
                <th>Project Details</th>
                <th>Category</th>
                <th>Stakeholders</th>
                <th>Team</th>
                <th>Status</th>
                {currentUser.role === 'Creator' && <th className="w-32">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filteredProjects.length === 0 ? (
                  <tr><td colSpan={currentUser.role === 'Creator' ? 7 : 6} className="py-8 text-center text-gray-400">No projects found matching the criteria</td></tr>
              ) : filteredProjects.slice().reverse().map(p => (
                  <tr
                    key={p.id}
                    onClick={() => setDetailProject(p)}
                    className="cursor-pointer hover:bg-gray-50/80"
                  >
                      <td className="font-mono text-[10px] font-bold text-blue-600 bg-blue-50/50 align-top">{p.projectCode || `LT-${new Date(p.createdAt || Date.now()).getFullYear()}-${String(p.id).padStart(3, '0')}`}</td>
                      <td className="align-top">
                        <div className="font-bold text-[var(--color-primary-dark)] text-sm">{p.name}</div>
                        <div className="text-[10px] text-gray-500 uppercase font-semibold mb-1">Client: {p.clientName} {p.projectState && `| State: ${p.projectState}`} {p.country && `| Country: ${p.country}`}</div>
                        <div className="text-[10px] text-[var(--color-primary)] font-bold mb-1">
                          Value: {p.currency === 'Dollars' ? '$' : '₹'} {p.estimatedValue} {p.currency === 'Dollars' ? 'Million' : 'Crore'}
                        </div>
                        <p className="text-[11px] text-gray-400 line-clamp-2 max-w-xs">{p.description}</p>
                      </td>
                      <td className="align-top font-bold text-gray-500 text-[10px] uppercase">
                        <span className="inline-block px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: p.categoryColor || '#94a3b8' }}>
                          {p.category}
                        </span>
                      </td>
                      <td className="align-top space-y-1">
                        <div className="text-[10px]">
                          <span className="font-bold text-gray-400 uppercase">HOD:</span> {p.hod?.name || '-'}
                        </div>
                        <div className="text-[10px]">
                          <span className="font-bold text-gray-400 uppercase">Senior Lead:</span> {p.seniorLead?.name || '-'}
                        </div>
                      </td>
                      <td className="align-top">
                        {p.teamDetails ? (
                          <div className="text-[10px] space-y-1">
                            <div><span className="font-bold text-gray-400 uppercase">Lead:</span> {p.teamDetails.leader?.name}</div>
                            <div className="text-gray-500 max-w-[150px]">
                              <span className="font-bold text-gray-400 uppercase text-[9px]">Members:</span> {p.teamDetails.members?.map((m: any) => m.name).join(', ') || '—'}
                            </div>
                          </div>
                        ) : <span className="text-[10px] text-gray-300 italic">Not formed</span>}
                      </td>
                      <td className="align-top"><span className={`status-pill ${getStatusPillClass(getDisplayStatus(p))}`}>{getDisplayStatus(p)}</span></td>
                      {currentUser.role === 'Creator' && (
                        <td className="align-top" onClick={(e) => e.stopPropagation()}>
                          <div className="relative">
                            <button
                              onClick={() => setOpenMenuId(openMenuId === p.id ? null : p.id)}
                              className="inline-flex items-center gap-1 px-3 py-1 rounded text-[11px] font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>
                            {openMenuId === p.id && (
                              <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50 py-1">
                                {!isBidDroppedProject(p) && (
                                  <>
                                    <button
                                      onClick={() => {
                                        openEditModal(p);
                                        setOpenMenuId(null);
                                      }}
                                      className="w-full text-left px-4 py-2 hover:bg-blue-50 text-[11px] font-semibold text-gray-700 flex items-center gap-2 transition-colors"
                                    >
                                      <Edit2 className="w-3.5 h-3.5 text-blue-600" /> Edit Project
                                    </button>
                                    <button
                                      onClick={() => {
                                        bidDropProject(p);
                                        setOpenMenuId(null);
                                      }}
                                      className="w-full text-left px-4 py-2 hover:bg-amber-50 text-[11px] font-semibold text-gray-700 flex items-center gap-2 transition-colors border-y border-gray-100"
                                    >
                                      <div className="w-3.5 h-3.5 text-amber-600">⚡</div> Bid Drop
                                    </button>
                                  </>
                                )}
                                {isBidDroppedProject(p) && (
                                  <button
                                    onClick={() => {
                                      revertBidDropProject(p);
                                      setOpenMenuId(null);
                                    }}
                                    className="w-full text-left px-4 py-2 hover:bg-blue-50 text-[11px] font-semibold text-gray-700 flex items-center gap-2 transition-colors"
                                  >
                                    <RotateCcw className="w-3.5 h-3.5 text-blue-600" /> Revert Bid Drop
                                  </button>
                                )}
                                {p.status === 'Completed' && !p.tenderOutcome && (
                                  <button
                                    onClick={() => {
                                      setShowTenderOutcomeModal(p);
                                      setOpenMenuId(null);
                                    }}
                                    className="w-full text-left px-4 py-2 hover:bg-green-50 text-[11px] font-semibold text-gray-700 flex items-center gap-2 transition-colors"
                                  >
                                    <Trophy className="w-3.5 h-3.5 text-green-600" /> Record Outcome
                                  </button>
                                )}
                                <button
                                  onClick={() => {
                                    deleteProject(p);
                                    setOpenMenuId(null);
                                  }}
                                  className="w-full text-left px-4 py-2 hover:bg-red-50 text-[11px] font-semibold text-gray-700 flex items-center gap-2 transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-red-600" /> Delete Project
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      )}
                  </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editingProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div>
                <h2 className="text-lg font-bold text-[var(--color-primary-dark)]">Edit Project</h2>
                <p className="text-xs text-gray-500">Project code: {editingProject.projectCode}</p>
              </div>
              <button onClick={closeEditModal} className="p-2 text-gray-400 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4 p-6 text-sm text-[#333]">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="text-[10px] font-bold uppercase text-gray-500">Project Name</span>
                  <input 
                    value={editValues.name} 
                    onChange={e => {
                      setEditNameError('');
                      setEditValues(prev => ({ ...prev, name: e.target.value }));
                    }} 
                    className={`mt-1 w-full rounded border px-3 py-2 outline-none focus:ring-1 ${editNameError ? 'border-red-500 focus:ring-red-500' : 'border-gray-200 focus:ring-[var(--color-primary)]'}`} 
                  />
                  {editNameError && <p className="text-red-500 text-xs mt-1">{editNameError}</p>}
                </label>
                <label className="block">
                  <span className="text-[10px] font-bold uppercase text-gray-500">Client Name</span>
                  <input value={editValues.clientName} onChange={e => setEditValues(prev => ({ ...prev, clientName: e.target.value }))} className="mt-1 w-full rounded border border-gray-200 px-3 py-2 outline-none focus:ring-1 focus:ring-[var(--color-primary)]" />
                </label>
              </div>
              <label className="block">
                <span className="text-[10px] font-bold uppercase text-gray-500">Description</span>
                <textarea value={editValues.description} onChange={e => setEditValues(prev => ({ ...prev, description: e.target.value }))} className="mt-1 w-full rounded border border-gray-200 px-3 py-2 min-h-[100px] outline-none focus:ring-1 focus:ring-[var(--color-primary)]" />
              </label>
              <div className="grid gap-4 md:grid-cols-3">
                <label className="block">
                  <span className="text-[10px] font-bold uppercase text-gray-500">Category</span>
                  <input value={editValues.category} onChange={e => setEditValues(prev => ({ ...prev, category: e.target.value }))} className="mt-1 w-full rounded border border-gray-200 px-3 py-2 outline-none focus:ring-1 focus:ring-[var(--color-primary)]" />
                </label>
                <label className="block">
                  <span className="text-[10px] font-bold uppercase text-gray-500">State</span>
                  <input value={editValues.projectState} onChange={e => setEditValues(prev => ({ ...prev, projectState: e.target.value }))} className="mt-1 w-full rounded border border-gray-200 px-3 py-2 outline-none focus:ring-1 focus:ring-[var(--color-primary)]" />
                </label>
                <label className="block">
                  <span className="text-[10px] font-bold uppercase text-gray-500">Country</span>
                  <input value={editValues.country} onChange={e => setEditValues(prev => ({ ...prev, country: e.target.value }))} className="mt-1 w-full rounded border border-gray-200 px-3 py-2 outline-none focus:ring-1 focus:ring-[var(--color-primary)]" />
                </label>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="text-[10px] font-bold uppercase text-gray-500">Value</span>
                  <input type="number" value={editValues.estimatedValue} onChange={e => setEditValues(prev => ({ ...prev, estimatedValue: Number(e.target.value) }))} className="mt-1 w-full rounded border border-gray-200 px-3 py-2 outline-none focus:ring-1 focus:ring-[var(--color-primary)]" />
                </label>
                <label className="block">
                  <span className="text-[10px] font-bold uppercase text-gray-500">Start Date</span>
                  <input type="date" value={editValues.startDate} onChange={e => setEditValues(prev => ({ ...prev, startDate: e.target.value }))} className="mt-1 w-full rounded border border-gray-200 px-3 py-2 outline-none focus:ring-1 focus:ring-[var(--color-primary)]" />
                </label>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="text-[10px] font-bold uppercase text-gray-500">End Date</span>
                  <input type="date" value={editValues.endDate} onChange={e => setEditValues(prev => ({ ...prev, endDate: e.target.value }))} className="mt-1 w-full rounded border border-gray-200 px-3 py-2 outline-none focus:ring-1 focus:ring-[var(--color-primary)]" />
                </label>
                <label className="block">
                  <span className="text-[10px] font-bold uppercase text-gray-500">Status</span>
                  <select value={editValues.status} onChange={e => setEditValues(prev => ({ ...prev, status: e.target.value }))} className="mt-1 w-full rounded border border-gray-200 px-3 py-2 outline-none focus:ring-1 focus:ring-[var(--color-primary)]">
                    <option value="">Select status</option>
                    {VALID_PROJECT_STATUSES.map(status => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-[10px] font-bold uppercase text-gray-500">Currency</span>
                  <select value={editValues.currency} onChange={e => setEditValues(prev => ({ ...prev, currency: e.target.value }))} className="mt-1 w-full rounded border border-gray-200 px-3 py-2 outline-none focus:ring-1 focus:ring-[var(--color-primary)]">
                    <option value="Dollars">Dollars</option>
                    <option value="Rupees">Rupees</option>
                  </select>
                </label>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="text-[10px] font-bold uppercase text-gray-500">Senior Lead</span>
                  <select value={editValues.seniorLeadId} onChange={e => setEditValues(prev => ({ ...prev, seniorLeadId: e.target.value }))} className="mt-1 w-full rounded border border-gray-200 px-3 py-2 outline-none focus:ring-1 focus:ring-[var(--color-primary)]">
                    <option value="">Unassigned</option>
                    {users.filter(u => u.role === 'Senior Lead').map(sl => (
                      <option key={sl.id} value={sl.id}>{sl.name}</option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4 bg-gray-50">
              <button onClick={closeEditModal} className="rounded border border-gray-200 px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-100">
                Cancel
              </button>
              <button onClick={saveProjectChanges} className="rounded bg-[var(--color-primary)] px-4 py-2 text-sm font-bold text-white hover:bg-[var(--color-primary-dark)]">
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {detailProject && (
        <ProjectDetailModal project={detailProject} onClose={() => setDetailProject(null)} />
      )}

      {showTenderOutcomeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div>
                <h2 className="text-lg font-bold text-[var(--color-primary-dark)]">Record Tender Outcome</h2>
                <p className="text-xs text-gray-500 mt-1">{showTenderOutcomeModal.name}</p>
              </div>
              <button onClick={() => setShowTenderOutcomeModal(null)} className="p-2 text-gray-400 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4 p-6 text-sm text-[#333]">
              <label className="block">
                <span className="text-[10px] font-bold uppercase text-gray-500 mb-2 block">Tender Result</span>
                <select 
                  value={tenderOutcomeForm.result} 
                  onChange={(e) => setTenderOutcomeForm(prev => ({ ...prev, result: e.target.value, ranking: '', remarks: '' }))}
                  className="w-full rounded border border-gray-200 px-3 py-2 outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
                >
                  <option value="Success">Success</option>
                  <option value="Fail">Failed</option>
                </select>
              </label>

              {tenderOutcomeForm.result === 'Fail' && (
                <>
                  <label className="block">
                    <span className="text-[10px] font-bold uppercase text-gray-500 mb-2 block">Ranking/Position Achieved</span>
                    <input 
                      type="number" 
                      min="1"
                      value={tenderOutcomeForm.ranking} 
                      onChange={(e) => setTenderOutcomeForm(prev => ({ ...prev, ranking: e.target.value }))}
                      placeholder="e.g., 2, 3, 5"
                      className="w-full rounded border border-gray-200 px-3 py-2 outline-none focus:ring-1 focus:ring-[var(--color-primary)]" 
                    />
                  </label>
                  <label className="block">
                    <span className="text-[10px] font-bold uppercase text-gray-500 mb-2 block">Remarks (Optional)</span>
                    <textarea 
                      value={tenderOutcomeForm.remarks} 
                      onChange={(e) => setTenderOutcomeForm(prev => ({ ...prev, remarks: e.target.value }))}
                      placeholder="Add any remarks about the failure..."
                      className="w-full rounded border border-gray-200 px-3 py-2 min-h-[80px] outline-none focus:ring-1 focus:ring-[var(--color-primary)]" 
                    />
                  </label>
                </>
              )}
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4 bg-gray-50">
              <button onClick={() => setShowTenderOutcomeModal(null)} className="rounded border border-gray-200 px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-100">
                Cancel
              </button>
              <button onClick={recordTenderOutcome} className="rounded bg-green-600 px-4 py-2 text-sm font-bold text-white hover:bg-green-700">
                Record Outcome
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
