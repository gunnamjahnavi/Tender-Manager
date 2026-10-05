import React, { useState, useEffect } from 'react';
import { User, Mail, Shield, Briefcase, Calendar, CheckCircle2, Clock, Award, LogOut, Star, TrendingUp, ChevronRight, X, Folder } from 'lucide-react';
import { getDisplayStatus } from '../constants/project';
import { DetailedExperienceModal } from '../components/DetailedExperienceModal';
import { useNavigate } from 'react-router-dom';

const StarRating = ({ rating }: { rating: number }) => (
  <div className="flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map(s => (
      <Star key={s} className={`w-3.5 h-3.5 ${s <= Math.round(rating) ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`} />
    ))}
  </div>
);

// Calculate experience duration from start/end dates
const calcDuration = (start?: any, end?: any): string => {
  if (!start) return '—';
  const s = new Date(start);
  const e = end ? new Date(end) : new Date();
  const diffMs = Math.abs(e.getTime() - s.getTime());
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < 30) return `${diffDays} day${diffDays !== 1 ? 's' : ''}`;
  const months = Math.round(diffDays / 30.4);
  if (months < 12) return `${months} month${months !== 1 ? 's' : ''}`;
  const years = Math.floor(months / 12);
  const remMonths = months % 12;
  return remMonths > 0 ? `${years}y ${remMonths}m` : `${years} year${years !== 1 ? 's' : ''}`;
};

// Compute total experience time per category
const calcTotalCategoryDuration = (experiences: any[]): string => {
  let totalDays = 0;
  experiences.forEach(exp => {
    if (exp.start_date) {
      const s = new Date(exp.start_date);
      const e = exp.end_date ? new Date(exp.end_date) : new Date();
      totalDays += Math.ceil(Math.abs(e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24));
    }
  });
  if (totalDays === 0) return '—';
  const months = Math.round(totalDays / 30.4);
  if (months < 12) return `${months} month${months !== 1 ? 's' : ''}`;
  const years = Math.floor(months / 12);
  const remMonths = months % 12;
  return remMonths > 0 ? `${years}y ${remMonths}m` : `${years} year${years !== 1 ? 's' : ''}`;
};

export default function Profile() {
  const navigate = useNavigate();
  const [profileData, setProfileData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [experienceModal, setExperienceModal] = useState<{
    isOpen: boolean;
    mode: 'category' | 'leadership';
    category?: string;
  }>({ isOpen: false, mode: 'category' });

  // For detailed experience from API
  const [detailedExp, setDetailedExp] = useState<any[]>([]);

  useEffect(() => {
    setLoading(true);
    const token = localStorage.getItem('token');
    Promise.all([
      fetch('/api/profile', { headers: { Authorization: `Bearer ${token}` } }),
    ]).then(async ([profileRes]) => {
      if (!profileRes.ok) throw new Error('Failed to fetch profile');
      const data = await profileRes.json();
      setProfileData(data);

      // Fetch detailed experience
      const userId = data.user?.id;
      if (userId) {
        const expRes = await fetch(`/api/users/${userId}/experiences`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (expRes.ok) setDetailedExp(await expRes.json());
      }
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setProfileData({ error: err.message });
      setLoading(false);
    });
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
    window.location.reload();
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
      <div className="text-gray-500 font-medium animate-pulse">Loading your profile...</div>
    </div>
  );
  
  if (!profileData || profileData.error) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
      <div className="bg-red-50 p-4 rounded-full mb-4">
        <Shield className="w-12 h-12 text-red-500" />
      </div>
      <h2 className="text-xl font-bold text-gray-900 mb-2">Profile Access Error</h2>
      <p className="text-gray-500 max-w-md">{profileData?.error || "We couldn't retrieve your profile information."}</p>
      <button 
        onClick={() => window.location.reload()}
        className="mt-6 px-6 py-2 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition-colors"
      >
        Retry
      </button>
    </div>
  );

  const { user, experience, projects, leadershipHistory = [] } = profileData;

  const projectsLed = leadershipHistory.length;
  const projectsParticipated = experience.filter((e: any) => e.role === 'Team Member').length;
  const totalProjects = experience.length;

  // Group experience by category  
  const expByCategory: Record<string, any[]> = {};
  experience.forEach((e: any) => {
    const cat = e.category || e.project_category || 'General';
    if (!expByCategory[cat]) expByCategory[cat] = [];
    expByCategory[cat].push(e);
  });

  // Group detailed experience by category for duration calculations
  const detailedByCategory: Record<string, any[]> = {};
  detailedExp.forEach((e: any) => {
    const cat = e.project_category || 'General';
    if (!detailedByCategory[cat]) detailedByCategory[cat] = [];
    detailedByCategory[cat].push(e);
  });

  const countLedByCategory = (cat: string) =>
    leadershipHistory.filter((lh: any) => lh.project_category?.toLowerCase() === cat.toLowerCase()).length;

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 text-[#333]">
      {/* Profile Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="h-48 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-dark)] relative">
          <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
          {/* Logout button top-right of banner */}
          <button
            onClick={handleLogout}
            className="absolute top-4 right-4 flex items-center gap-2 px-4 py-2 bg-white/15 backdrop-blur-sm hover:bg-red-500 border border-white/30 hover:border-red-400 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-200 shadow-lg"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
          <div className="absolute -bottom-16 left-12 group">
            <div className="w-32 h-32 rounded-3xl bg-white p-1.5 shadow-2xl transition-transform group-hover:scale-105 duration-300">
              <div className="w-full h-full rounded-[1.2rem] bg-gradient-to-br from-[var(--color-primary-light)] to-blue-100 flex items-center justify-center text-4xl font-black text-[var(--color-primary)] border border-gray-100">
                {user.name[0]}
              </div>
            </div>
          </div>
        </div>
        
        <div className="pt-20 pb-10 px-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-4">
              <div>
                <h1 className="text-3xl font-black text-gray-900 tracking-tight">{user.name}</h1>
                <p className="text-gray-500 font-medium flex items-center gap-2 mt-1">
                  <Mail className="w-4 h-4 text-gray-400" />
                  {user.email}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-blue-50 text-[var(--color-primary)] text-xs font-bold border border-blue-100 uppercase tracking-wider">
                  <Shield className="w-3.5 h-3.5" /> {user.role}
                </span>
                {user.isTeamLead && (
                  <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-amber-50 text-amber-600 text-xs font-bold border border-amber-100 uppercase tracking-wider">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Project Lead
                  </span>
                )}
                {user.averageRating > 0 && (
                  <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-amber-50 text-amber-700 text-xs font-bold border border-amber-100 uppercase tracking-wider">
                    <Star className="w-3.5 h-3.5 fill-amber-400" /> {user.averageRating}/5 Avg
                  </span>
                )}
              </div>
            </div>

            <div className="flex gap-4 md:gap-6">
              <div className="text-center px-5 py-3 bg-gray-50 rounded-2xl border border-gray-100">
                <div className="text-2xl font-black text-gray-900">{totalProjects}</div>
                <div className="text-[10px] uppercase font-bold text-gray-400 tracking-widest mt-1">Projects</div>
              </div>
              <div 
                className="text-center px-5 py-3 bg-blue-50 rounded-2xl border border-blue-100 cursor-pointer hover:bg-blue-100/50 transition-colors"
                onClick={() => setExperienceModal({ isOpen: true, mode: 'leadership' })}
              >
                <div className="text-2xl font-black text-[var(--color-primary)]">{projectsLed}</div>
                <div className="text-[10px] uppercase font-bold text-[var(--color-primary)] tracking-widest mt-1">Led</div>
              </div>
              <div className="text-center px-5 py-3 bg-green-50 rounded-2xl border border-green-100">
                <div className="text-2xl font-black text-green-600">{projectsParticipated}</div>
                <div className="text-[10px] uppercase font-bold text-green-500 tracking-widest mt-1">Member Of</div>
              </div>
              {user.taskReviewCount > 0 && (
                <div className="text-center px-5 py-3 bg-amber-50 rounded-2xl border border-amber-100">
                  <div className="text-2xl font-black text-amber-600">{user.taskReviewCount}</div>
                  <div className="text-[10px] uppercase font-bold text-amber-500 tracking-widest mt-1">Reviews</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Sidebar Details */}
        <div className="lg:col-span-4 space-y-6">
          {/* Work Experience Card - Functional */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
            <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2 border-b border-gray-50 pb-4">
              <Briefcase className="w-4 h-4 text-[var(--color-primary)]" />
              Work Experience
            </h3>
            
            {Object.keys(expByCategory).length > 0 ? (
              <div className="space-y-3">
                {Object.entries(expByCategory).map(([category, exps]) => {
                  const duration = calcTotalCategoryDuration(detailedByCategory[category] || exps);
                  return (
                    <div 
                      key={category}
                      onClick={() => setExperienceModal({ isOpen: true, mode: 'category', category })}
                      className="group flex justify-between items-center p-4 rounded-xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50/20 transition-all cursor-pointer"
                    >
                      <div>
                        <div className="font-bold text-gray-800 group-hover:text-[var(--color-primary)] transition-colors text-sm">{category}</div>
                        <div className="text-[10px] text-gray-400 uppercase font-bold tracking-tight mt-0.5">
                          {exps.length} project{exps.length !== 1 ? 's' : ''} • {duration}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <span className="text-lg font-black text-[var(--color-primary)] leading-none block">{exps.length}</span>
                          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest italic">{exps.length === 1 ? 'Job' : 'Jobs'}</span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[var(--color-primary)] transition-colors" />
                      </div>
                    </div>
                  );
                })}

                {/* Total Experience Summary */}
                <div className="mt-3 p-4 rounded-xl bg-gradient-to-r from-[var(--color-primary-light)] to-blue-50 border border-blue-100">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-3.5 h-3.5 text-[var(--color-primary)]" />
                    <span className="text-[10px] font-black text-[var(--color-primary)] uppercase tracking-widest">Total Experience</span>
                  </div>
                  <div className="text-lg font-black text-[var(--color-primary-dark)]">
                    {calcTotalCategoryDuration(detailedExp.length > 0 ? detailedExp : experience)}
                  </div>
                  <div className="text-[10px] text-gray-500 mt-0.5">across {totalProjects} project{totalProjects !== 1 ? 's' : ''}</div>
                </div>
              </div>
            ) : (
              <div className="text-center py-10">
                <Briefcase className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                <div className="text-gray-400 italic text-sm">No recorded domain experience</div>
                <div className="text-gray-300 text-xs mt-1">Experience is added when projects are completed</div>
              </div>
            )}
          </div>

          {/* Leadership Profile Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
            <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2 border-b border-gray-50 pb-4">
              <Shield className="w-4 h-4 text-[var(--color-primary)]" />
              Leadership Profile
            </h3>
            
            <div className="space-y-2">
              {['Bridges', 'Roads', 'Railways', 'Buildings', 'Runways', 'Elevated Corridors'].map((cat) => {
                const cnt = countLedByCategory(cat);
                if (cnt === 0) return null;
                return (
                  <div key={cat} className="flex justify-between items-center p-3 rounded-lg border border-gray-50 hover:border-blue-100 transition-colors">
                    <span className="font-bold text-gray-700 text-xs">{cat}</span>
                    <span className="text-xs font-extrabold text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full">
                      {cnt} {cnt === 1 ? 'Project' : 'Projects'}
                    </span>
                  </div>
                );
              })}
              {leadershipHistory.length === 0 && (
                <div className="text-center py-8 text-gray-400 text-sm italic">No leadership roles yet</div>
              )}
            </div>

            {projectsLed > 0 && (
              <button 
                onClick={() => setExperienceModal({ isOpen: true, mode: 'leadership' })}
                className="w-full mt-2 py-2.5 px-4 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-1"
              >
                <Award className="w-3.5 h-3.5" />
                View Leadership History
              </button>
            )}
          </div>

          {/* Logout Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-red-100 p-6">
            <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2 border-b border-gray-50 pb-4">
              <LogOut className="w-4 h-4 text-red-500" />
              Account
            </h3>
            <p className="text-xs text-gray-500 mb-4">Sign out of your L&T Tenders account securely.</p>
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-red-50 hover:bg-red-500 border border-red-200 hover:border-red-400 text-red-600 hover:text-white rounded-xl font-bold text-sm transition-all duration-200"
            >
              <LogOut className="w-4 h-4" />
              Sign Out of Account
            </button>
          </div>
        </div>

        {/* Right Columns: Main Content */}
        <div className="lg:col-span-8 space-y-8">
          {/* Project Portfolio */}
          <div className="space-y-6">
            <h2 className="text-sm font-black text-gray-900 uppercase tracking-[0.2em] flex items-center gap-3">
              <div className="h-1 w-8 bg-[var(--color-primary)] rounded-full"></div>
              Project Portfolio
            </h2>

            {/* Current Projects */}
            <section className="space-y-4">
              <div className="flex items-center gap-3">
                <h3 className="text-xs font-bold text-blue-500 uppercase tracking-widest flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5" />
                  Currently Handling
                </h3>
                <span className="h-[1px] flex-1 bg-blue-100/50"></span>
                <span className="text-[10px] font-bold text-blue-400 bg-blue-50 px-2 py-0.5 rounded-full">{projects.current.length}</span>
              </div>
              <div className="grid gap-4">
                {projects.current.length > 0 ? projects.current.map((p: any) => (
                  <div key={p.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-blue-200 transition-all group flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-gray-900 text-lg">{p.name}</h4>
                        <span className="bg-blue-50 text-blue-600 text-[10px] font-black px-2 py-0.5 rounded border border-blue-100 uppercase">Active</span>
                      </div>
                      <p className="text-sm font-medium text-gray-500">{p.clientName} • <span className="text-gray-400 font-normal">{p.category}</span></p>
                    </div>
                    <span className="text-xs font-bold text-gray-400 bg-gray-50 px-3 py-1 rounded-full">{getDisplayStatus(p)}</span>
                  </div>
                )) : (
                  <div className="p-8 rounded-2xl border border-dashed border-gray-200 text-center text-gray-400 text-sm font-medium">Currently available for new assignments</div>
                )}
              </div>
            </section>

            {/* Previous Projects */}
            <section className="space-y-4">
              <div className="flex items-center gap-3">
                <h3 className="text-xs font-bold text-green-500 uppercase tracking-widest flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Completed Projects
                </h3>
                <span className="h-[1px] flex-1 bg-green-100/50"></span>
                <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">{projects.previous.length}</span>
              </div>
              <div className="grid gap-4">
                {projects.previous.length > 0 ? projects.previous.map((p: any) => (
                  <div key={p.id} className="bg-gray-50/50 p-6 rounded-2xl border border-gray-100 flex flex-col sm:flex-row justify-between sm:items-center gap-4 group hover:bg-white hover:border-green-200 transition-all">
                    <div>
                      <h4 className="font-bold text-gray-700 group-hover:text-gray-900 transition-colors uppercase tracking-tight text-sm">{p.name}</h4>
                      <p className="text-xs font-medium text-gray-500 mt-1">{p.clientName} • {p.category}</p>
                      {p.tenderOutcome && (
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 ${p.tenderOutcome.result === 'Success' ? 'bg-green-50 text-green-600 border border-green-100' : 'bg-red-50 text-red-500 border border-red-100'}`}>
                          {p.tenderOutcome.result === 'Success' ? '✓ Successful Tender' : '✗ Failed Tender'}
                        </span>
                      )}
                    </div>
                    <span className="inline-flex items-center gap-1 text-[10px] font-black text-green-600 bg-green-50 px-3 py-1 rounded-full uppercase tracking-widest border border-green-100">
                      Completed
                    </span>
                  </div>
                )) : (
                  <div className="p-8 rounded-2xl border border-dashed border-gray-100 text-center text-gray-400 text-sm italic">No completed projects yet</div>
                )}
              </div>
            </section>

            {/* Upcoming/Pipeline */}
            {projects.upcoming.length > 0 && (
              <section className="space-y-4">
                <div className="flex items-center gap-3">
                  <h3 className="text-xs font-bold text-amber-500 uppercase tracking-widest flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5" />
                    Pipeline
                  </h3>
                  <span className="h-[1px] flex-1 bg-amber-100/30"></span>
                </div>
                <div className="grid gap-4">
                  {projects.upcoming.map((p: any) => (
                    <div key={p.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-gray-800 text-sm">{p.name}</h4>
                        <p className="text-[10px] font-bold text-gray-400 mt-0.5 uppercase tracking-tighter">{p.clientName}</p>
                      </div>
                      <span className="px-3 py-1 bg-amber-50 text-amber-600 text-[10px] font-bold rounded-full uppercase border border-amber-100 tracking-widest">Bid Dropped</span>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
      </div>

      {experienceModal.isOpen && (
        <DetailedExperienceModal
          userId={user.id}
          employeeName={user.name}
          mode={experienceModal.mode}
          category={experienceModal.category}
          onClose={() => setExperienceModal({ isOpen: false, mode: 'category' })}
        />
      )}
    </div>
  );
}
