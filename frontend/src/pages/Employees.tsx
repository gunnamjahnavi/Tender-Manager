import React, { useState, useEffect } from 'react';
import { Users, Plus, Trash2, X, GraduationCap, Eye, EyeOff, Lock, CheckCircle2 } from 'lucide-react';

const MAX_ACTIVE_PROJECTS_PER_USER = 5;

export function Employees() {
  const [users, setUsers] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [hodPasswordInput, setHodPasswordInput] = useState('');
  const [isPasswordsUnlocked, setIsPasswordsUnlocked] = useState(false);
  const [visiblePasswordId, setVisiblePasswordId] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'Member',
    experienceList: [] as { category: string, count: number }[]
  });
  const [expCategory, setExpCategory] = useState('Roads');
  const [expCount, setExpCount] = useState(1);
  const [categories, setCategories] = useState<any[]>([]);

  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  const fetchData = async () => {
    const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
    const projectsUrl = '/api/projects?excludeBidDropped=true';
    const [uRes, pRes, tRes, cRes] = await Promise.all([
      fetch('/api/users', { headers }),
      fetch(projectsUrl, { headers }),
      fetch('/api/teams', { headers }),
      fetch('/api/categories', { headers })
    ]);

    if (uRes.ok) {
      const data = await uRes.json();
      if (currentUser.role === 'Senior Lead') {
        setUsers(data.filter((u: any) => u.role === 'Member'));
      } else {
        setUsers(data);
      }
    }
    if (pRes.ok) setProjects(await pRes.json());
    if (tRes.ok) setTeams(await tRes.json());
    if (cRes.ok) setCategories(await cRes.json());
  };

  useEffect(() => {
    fetchData();
  }, [currentUser.role]);

  const getActiveProjectCount = (userId: number) => {
    return projects.filter(p => {
      if (p.status === 'Completed') return false;
      const team = teams.find(t => t.id === p.teamId);
      if (!team) return false;
      return team.teamLeadId === userId || (team.members && team.members.includes(userId));
    }).length;
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
      setIsModalOpen(false);
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

  const handleUnlockPasswords = (e: React.FormEvent) => {
    e.preventDefault();
    if (hodPasswordInput === currentUser.password || hodPasswordInput === 'password') { // Accepting 'password' as fallback for dev
      setIsPasswordsUnlocked(true);
      setIsConfirmModalOpen(false);
      setHodPasswordInput('');
    } else {
      alert('Incorrect password! Access denied.');
    }
  };

  const togglePasswordVisibility = (userId: number) => {
    if (!isPasswordsUnlocked) {
      setVisiblePasswordId(userId);
      setIsConfirmModalOpen(true);
      return;
    }
    setVisiblePasswordId(visiblePasswordId === userId ? null : userId);
  };

  const handleDeleteUser = async (userId: number) => {
    if (!confirm('Are you sure you want to remove this member?')) return;
    const res = await fetch(`/api/users/${userId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    if (res.ok) {
      fetchData();
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


  return (
    <div className="space-y-6 text-[#333]">
      <div className="flex items-center justify-between">
         <div>
          <h1 className="text-2xl font-bold text-[var(--color-primary-dark)]">
            {currentUser.role === 'Senior Lead' ? 'Member Directory' : 'Employee Directory'}
          </h1>
          <p className="text-sm text-[#666] mt-1">Workforce overview</p>
         </div>
         {(currentUser.role === 'HOD' || currentUser.role === 'Creator') && (
           <button 
             onClick={() => setIsModalOpen(true)}
             className="flex items-center gap-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white px-4 py-2 rounded-md transition-colors font-bold text-xs uppercase"
           >
             <Plus className="w-4 h-4" />
             Add New Member
           </button>
         )}
      </div>

      <div className="panel p-0 overflow-hidden">
        <div className="panel-header px-5 pt-5 mb-0 border-b border-[#e1e1e1] pb-4">
           <div className="panel-title flex items-center gap-2">
             <Users className="w-5 h-5 text-[var(--color-primary)]" />
             {currentUser.role === 'Senior Lead' ? 'All Members' : 'All Employees'}
           </div>
        </div>
        <div className="overflow-x-auto text-sm">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Workload</th>
                {(currentUser.role === 'HOD' || currentUser.role === 'Creator') && <th>Password</th>}
                <th>Experience</th>
                {(currentUser.role === 'HOD' || currentUser.role === 'Creator') && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                  <tr key={u.id}>
                      <td className="font-bold text-[var(--color-primary-dark)]">{u.name}</td>
                      <td>{u.email}</td>
                      <td><span className="status-pill active">{u.role}</span></td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div 
                              className={`h-full transition-all ${(u.activeProjectsCount || 0) >= MAX_ACTIVE_PROJECTS_PER_USER ? 'bg-red-500' : 'bg-blue-500'}`}
                              style={{ width: `${Math.min(((u.activeProjectsCount || 0) / MAX_ACTIVE_PROJECTS_PER_USER) * 100, 100)}%` }}
                            ></div>
                          </div>
                          <span className={`text-[10px] font-bold ${(u.activeProjectsCount || 0) >= MAX_ACTIVE_PROJECTS_PER_USER ? 'text-red-600' : 'text-gray-500'}`}>
                            {u.activeProjectsCount || 0}/{MAX_ACTIVE_PROJECTS_PER_USER}
                          </span>
                        </div>
                      </td>
                      {(currentUser.role === 'HOD' || currentUser.role === 'Creator') && (
                        <td className="w-32">
                          <div className="flex items-center gap-2">
                             <div className="font-mono bg-gray-50 px-2 py-1 rounded border border-gray-100 min-w-[80px]">
                               {visiblePasswordId === u.id && isPasswordsUnlocked ? u.password : '••••••••'}
                             </div>
                             <button 
                               onClick={() => togglePasswordVisibility(u.id)}
                               className="text-gray-400 hover:text-[var(--color-primary)] transition-colors"
                             >
                               {visiblePasswordId === u.id && isPasswordsUnlocked ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                             </button>
                          </div>
                        </td>
                      )}
                      <td className="w-64">
                        <div className="flex flex-wrap gap-1.5">
                          {u.experience?.length > 0 ? (
                            Object.entries(
                              u.experience.reduce((acc: any, exp: any) => {
                                acc[exp.category] = (acc[exp.category] || 0) + 1;
                                return acc;
                              }, {})
                            ).map(([category, count]: [string, any], i) => (
                              <div key={i} className="flex items-center text-[9px] font-bold bg-white border border-gray-200 rounded overflow-hidden shadow-sm">
                                <span className="px-1.5 py-0.5 bg-gray-50 text-gray-500 border-r border-gray-200">{category}</span>
                                <span className="px-1.5 py-0.5 text-[var(--color-primary)]">{count}</span>
                              </div>
                            ))
                          ) : (
                            <span className="text-gray-400 italic text-xs">No experience record</span>
                          )}
                        </div>
                      </td>
                      {(currentUser.role === 'HOD' || currentUser.role === 'Creator') && (
                        <td>
                          {u.id !== currentUser.id && (
                            <button 
                              onClick={() => handleDeleteUser(u.id)}
                              className="text-red-500 hover:text-red-700 p-1"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      )}
                  </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-2xl w-full overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-semibold text-gray-900">Create New User</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
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
                  <label className="block text-gray-700 font-bold mb-1">Role</label>
                  <select 
                    value={formData.role}
                    onChange={e => setFormData({...formData, role: e.target.value})}
                    className="w-full border border-gray-300 rounded-md p-2 focus:ring-[var(--color-primary)] outline-none bg-white"
                  >
                    <option value="Member">Member</option>
                    <option value="Senior Lead">Senior Lead</option>
                    {currentUser.role === 'Creator' && <option value="HOD">HOD</option>}
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
                      <div key={i} className="flex justify-between items-center bg-white px-3 py-2 rounded-md border border-gray-100 shadow-sm animate-in slide-in-from-top-1">
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

              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md font-bold uppercase text-xs">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-[var(--color-primary)] text-white rounded hover:bg-[var(--color-primary-dark)] font-bold uppercase text-xs">Create User</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isConfirmModalOpen && (
        <div className="fixed inset-0 bg-[var(--color-primary-dark)]/80 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-8 text-center animate-in zoom-in duration-200">
            <div className="mx-auto w-16 h-16 bg-[var(--color-primary-light)] rounded-full flex items-center justify-center mb-6">
              <Lock className="w-8 h-8 text-[var(--color-primary)]" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Security Verification</h3>
            <p className="text-gray-500 mb-6 text-sm">Please confirm your administrator password to view sensitive member information.</p>
            
            <form onSubmit={handleUnlockPasswords} className="space-y-4">
              <input 
                autoFocus
                type="password"
                required
                value={hodPasswordInput}
                onChange={e => setHodPasswordInput(e.target.value)}
                placeholder="Enter your password"
                className="w-full border-2 border-gray-100 rounded-lg p-3 text-center focus:border-[var(--color-primary)] outline-none transition-all"
              />
              <div className="flex gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => setIsConfirmModalOpen(false)}
                  className="flex-1 px-4 py-2 text-gray-400 font-bold text-xs uppercase hover:bg-gray-50 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white px-4 py-2 rounded-lg transition-colors font-bold text-xs uppercase flex items-center justify-center gap-2"
                >
                  Confirm <CheckCircle2 className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
