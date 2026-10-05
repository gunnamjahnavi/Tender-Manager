import { useEffect, useState } from 'react';
import { Award, BarChart3, CheckCircle2, ChevronDown, ChevronUp, Clock3, Gauge, Star, Target, Trophy, Users, XCircle, Briefcase } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const COLORS = ['#005BAC', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

const Stars = ({ rating }: { rating: number }) => (
  <div className="flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map(star => (
      <Star key={star} className={`h-3.5 w-3.5 ${star <= Math.round(rating) ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`} />
    ))}
  </div>
);

const Metric = ({ label, value, icon: Icon, tone }: { label: string; value: string | number; icon: any; tone: string }) => (
  <div className="panel p-5 min-w-0">
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-[10px] font-black uppercase tracking-wide text-gray-400">{label}</p>
        <p className="mt-1 break-words text-3xl font-bold text-[var(--color-primary-dark)]">{value}</p>
      </div>
      <div className={`shrink-0 rounded-lg p-3 ${tone}`}>
        <Icon className="h-6 w-6" />
      </div>
    </div>
  </div>
);

// Member Performance Card with expandable project details
const MemberCard = ({ member, index }: { member: any; index: number; key?: any }) => {
  const [expanded, setExpanded] = useState(false);
  const badgeColors = ['bg-yellow-100 text-yellow-700 border-yellow-200', 'bg-gray-100 text-gray-600 border-gray-200', 'bg-amber-50 text-amber-600 border-amber-200'];

  return (
    <div className="rounded-xl border border-gray-100 bg-white overflow-hidden shadow-sm transition-shadow hover:shadow-md">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 text-left hover:bg-gray-50/50 transition-colors"
      >
        <div className="flex items-center gap-4">
          {/* Rank badge */}
          <div className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-sm border shrink-0 ${badgeColors[index] || 'bg-blue-50 text-blue-700 border-blue-200'}`}>
            {index + 1}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-bold text-gray-900 text-sm">{member.memberName}</p>
              <span className="text-[10px] font-bold text-[var(--color-primary)] bg-[var(--color-primary-light)] px-2 py-0.5 rounded-full border border-blue-100">
                {member.bestCategory}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-1.5">
              <Stars rating={member.averageRating} />
              <span className="text-sm font-black text-amber-600">{member.averageRating}/5</span>
              <span className="text-[10px] text-gray-400 font-medium">{member.completedTasks} reviews</span>
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-2">
            {member.completedProjects?.length > 0 && (
              <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-100">
                {member.completedProjects.length} project{member.completedProjects.length !== 1 ? 's' : ''}
              </span>
            )}
            {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </div>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-gray-100 p-4 bg-gray-50/30">
          {member.completedProjects?.length > 0 ? (
            <div className="space-y-3">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Completed Projects</p>
              {member.completedProjects.map((proj: any) => (
                <div key={proj.projectId} className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="font-bold text-gray-800 text-sm">{proj.projectName}</p>
                      <p className="text-[10px] text-gray-400 font-medium">{proj.category} · {proj.taskCount} tasks</p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1.5 justify-end">
                        <Stars rating={proj.averageRating} />
                        <span className="font-black text-amber-600 text-sm">{proj.averageRating}/5</span>
                      </div>
                      <p className="text-[10px] text-gray-400">{proj.taskCount} task{proj.taskCount !== 1 ? 's' : ''} rated</p>
                    </div>
                  </div>
                  
                  {proj.tasks && proj.tasks.length > 0 && (
                    <div className="space-y-1.5 pt-2 border-t border-gray-50">
                      {proj.tasks.map((task: any, ti: number) => (
                        <div key={ti} className="flex items-center justify-between text-xs py-1">
                          <span className="text-gray-600 font-medium truncate flex-1">{task.taskTitle}</span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <Stars rating={task.rating} />
                            <span className="font-bold text-amber-600">{task.rating}/5</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-4 italic">No completed projects with ratings yet</p>
          )}
        </div>
      )}
    </div>
  );
};

export function Analytics() {
  const [activeDashboard, setActiveDashboard] = useState<'overview' | 'tender' | 'performance'>('overview');
  const [performance, setPerformance] = useState<any>(null);
  const [tender, setTender] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAnalytics = async () => {
      const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
      try {
        const [performanceRes, tenderRes] = await Promise.all([
          fetch('/api/analytics/performance', { headers }),
          fetch('/api/analytics/tender-outcomes', { headers }),
        ]);
        if (performanceRes.ok) setPerformance(await performanceRes.json());
        if (tenderRes.ok) setTender(await tenderRes.json());
      } catch (error) {
        console.error('Failed to fetch analytics:', error);
      } finally {
        setLoading(false);
      }
    };
    loadAnalytics();
  }, []);

  if (loading) return <div className="p-6 text-center text-gray-400 font-medium">Loading analytics...</div>;
  if (!performance || !tender) return <div className="p-6 text-center text-gray-500">No analytics data available</div>;

  const tenderPieData = [
    { name: 'Successful', value: tender.totalSuccess || 0, fill: '#10b981' },
    { name: 'Failed', value: tender.totalFailed || 0, fill: '#ef4444' },
  ];

  const dashboards = [
    { id: 'overview', name: 'Executive Overview', icon: Gauge },
    { id: 'tender', name: 'Tender Analytics', icon: Trophy },
    { id: 'performance', name: 'User Performance', icon: Users },
  ] as const;

  return (
    <div className="space-y-6 text-[#333]">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-[var(--color-primary-dark)]">Analytics Dashboards</h1>
          <p className="mt-1 text-sm text-gray-500">Separate dashboards for project health, tender outcomes, and member performance</p>
        </div>
        <BarChart3 className="hidden h-8 w-8 text-[var(--color-primary)] opacity-60 xl:block" />
      </div>

      <div className="flex flex-wrap gap-2 rounded-xl border border-gray-200 bg-white p-1 shadow-sm">
        {dashboards.map(item => (
          <button
            key={item.id}
            onClick={() => setActiveDashboard(item.id)}
            className={`flex min-w-[180px] items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition-colors ${
              activeDashboard === item.id ? 'bg-[var(--color-primary)] text-white shadow' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <item.icon className="h-4 w-4" />
            {item.name}
          </button>
        ))}
      </div>

      {/* OVERVIEW DASHBOARD */}
      {activeDashboard === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Metric label="Tender Success Rate" value={`${tender.successRate || 0}%`} icon={Trophy} tone="bg-green-50 text-green-600" />
            <Metric label="Average Performance" value={`${performance.summary.averageRating}/5`} icon={Star} tone="bg-amber-50 text-amber-600" />
            <Metric label="Projects Rated" value={performance.summary.projectsRated} icon={Target} tone="bg-blue-50 text-blue-600" />
            <Metric label="Members Rated" value={performance.summary.membersRated} icon={Users} tone="bg-purple-50 text-purple-600" />
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <div className="panel p-6 xl:col-span-2">
              <div className="mb-4">
                <h2 className="text-base font-bold text-gray-800">Overall Project Performance</h2>
                <p className="text-xs text-gray-500">Rating trend across recently reviewed projects</p>
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={performance.projectRatings.slice(0, 12)}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" interval={0} angle={-18} textAnchor="end" height={70} fontSize={10} />
                    <YAxis domain={[0, 5]} fontSize={11} />
                    <Tooltip />
                    <Line type="monotone" dataKey="rating" stroke="#005BAC" strokeWidth={3} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="panel p-6">
              <h2 className="mb-4 text-base font-bold text-gray-800">Tender Outcome Mix</h2>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={tenderPieData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} label />
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-green-50 p-3 text-green-700">
                  <p className="text-xl font-black">{tender.totalSuccess}</p>
                  <p className="text-[10px] font-bold uppercase">Successful</p>
                </div>
                <div className="rounded-lg bg-red-50 p-3 text-red-700">
                  <p className="text-xl font-black">{tender.totalFailed}</p>
                  <p className="text-[10px] font-bold uppercase">Failed</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TENDER ANALYTICS DASHBOARD */}
      {activeDashboard === 'tender' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Metric label="Total Tenders" value={tender.totalParticipated} icon={Trophy} tone="bg-blue-50 text-blue-600" />
            <Metric label="Successful" value={tender.totalSuccess} icon={CheckCircle2} tone="bg-green-50 text-green-600" />
            <Metric label="Failed" value={tender.totalFailed} icon={XCircle} tone="bg-red-50 text-red-600" />
            <Metric label="Success Rate" value={`${tender.successRate}%`} icon={Gauge} tone="bg-purple-50 text-purple-600" />
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <div className="panel p-6">
              <h2 className="mb-4 text-base font-bold text-gray-800">Failed Tender Ranking Distribution</h2>
              <div className="space-y-3">
                {Object.keys(tender.failedByRanking || {}).length === 0 ? (
                  <p className="py-8 text-center text-sm text-gray-400">No failed tender rankings recorded</p>
                ) : Object.entries(tender.failedByRanking).map(([position, count]: [string, any]) => (
                  <div key={position} className="flex items-center justify-between gap-4 rounded-lg bg-gray-50 p-3">
                    <span className="text-sm font-bold text-gray-700">Position {position}</span>
                    <div className="h-2 flex-1 rounded-full bg-gray-200">
                      <div className="h-full rounded-full bg-red-500" style={{ width: `${Math.min(100, (count / Math.max(1, tender.totalFailed)) * 100)}%` }} />
                    </div>
                    <span className="w-8 text-right text-sm font-black text-gray-800">{count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="panel p-6">
              <h2 className="mb-4 text-base font-bold text-gray-800">Tender Outcome Records</h2>
              <div className="max-h-96 overflow-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-left text-[10px] uppercase text-gray-400">
                      <th className="py-2">Project</th>
                      <th className="py-2">Result</th>
                      <th className="py-2">Position</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(tender.details || []).map((outcome: any, index: number) => (
                      <tr key={`${outcome.projectId}-${index}`} className="border-b border-gray-50">
                        <td className="py-3">
                          <p className="font-bold text-gray-800">{outcome.projectName}</p>
                          <p className="text-[10px] font-mono text-blue-600">{outcome.projectCode}</p>
                        </td>
                        <td className="py-3">
                          <span className={`status-pill ${outcome.result === 'Success' ? 'active' : 'danger'}`}>{outcome.result}</span>
                        </td>
                        <td className="py-3 text-xs text-gray-600">{outcome.ranking ? `Position ${outcome.ranking}` : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* USER PERFORMANCE DASHBOARD */}
      {activeDashboard === 'performance' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Metric label="Average Rating" value={`${performance.summary.averageRating}/5`} icon={Star} tone="bg-amber-50 text-amber-600" />
            <Metric label="Reviews Captured" value={performance.summary.totalReviews} icon={CheckCircle2} tone="bg-green-50 text-green-600" />
            <Metric label="Members Rated" value={performance.summary.membersRated} icon={Users} tone="bg-blue-50 text-blue-600" />
            <Metric label="Projects Rated" value={performance.summary.projectsRated} icon={Trophy} tone="bg-purple-50 text-purple-600" />
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            {/* Member Performance - Expandable */}
            <div className="panel p-6">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-gray-800">Member Performance</h2>
                  <p className="text-xs text-gray-500 mt-0.5">Click a member to see their completed projects & ratings</p>
                </div>
                <Users className="h-5 w-5 text-[var(--color-primary)]" />
              </div>

              {performance.memberPerformance.length === 0 ? (
                <div className="py-10 text-center text-sm text-gray-400 italic">No member performance data yet</div>
              ) : (
                <div className="space-y-3 max-h-[520px] overflow-auto pr-1">
                  {performance.memberPerformance.map((member: any, index: number) => {
                    const cardProps = { member, index };
                    return <MemberCard key={member.memberId} {...cardProps} />;
                  })}
                </div>
              )}
            </div>

            {/* Project Ratings Bar Chart */}
            <div className="panel p-6">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-gray-800">Project Ratings</h2>
                  <p className="text-xs text-gray-500">Average task-review rating by project</p>
                </div>
                <Award className="h-5 w-5 text-[var(--color-primary)]" />
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={performance.projectRatings.slice(0, 10)} margin={{ top: 10, right: 16, left: -12, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" interval={0} angle={-18} textAnchor="end" height={70} fontSize={10} />
                    <YAxis domain={[0, 5]} fontSize={11} />
                    <Tooltip />
                    <Bar dataKey="rating" radius={[6, 6, 0, 0]}>
                      {performance.projectRatings.slice(0, 10).map((_: any, index: number) => (
                        <Cell key={index} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <div className="panel p-6">
              <h2 className="mb-4 text-base font-bold text-gray-800">Task Wise Analytics</h2>
              <div className="space-y-2">
                {performance.taskWiseAnalytics.slice(0, 8).map((task: any) => (
                  <div key={task.taskTitle} className="flex flex-col gap-3 rounded-xl border border-gray-100 p-3 md:flex-row md:items-center md:justify-between bg-gray-50/30">
                    <div className="min-w-0">
                      <p className="break-words text-sm font-bold text-gray-800">{task.taskTitle}</p>
                      <p className="text-xs text-gray-500">Best: <span className="font-bold text-[var(--color-primary)]">{task.topMember}</span> on {task.projectName}</p>
                    </div>
                    <div className="shrink-0 md:text-right">
                      <p className="text-sm font-black text-gray-800">{task.topRating}/5</p>
                      <Stars rating={task.averageRating} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="panel p-6">
              <h2 className="mb-4 text-base font-bold text-gray-800">Category Analytics</h2>
              <div className="space-y-3">
                {performance.categoryAnalytics.map((category: any) => (
                  <div key={category.category} className="rounded-xl border border-gray-100 bg-gray-50/50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="break-words font-bold text-gray-800">{category.category}</p>
                      <span className="shrink-0 text-sm font-black text-[var(--color-primary)]">{category.averageRating}/5</span>
                    </div>
                    <div className="mt-3 space-y-2">
                      {category.topMembers.map((member: any) => (
                        <div key={member.memberId} className="flex items-center justify-between gap-3 text-xs">
                          <span className="break-words font-semibold text-gray-600">{member.memberName}</span>
                          <div className="flex items-center gap-1.5">
                            <Stars rating={member.averageRating} />
                            <span className="shrink-0 font-bold text-gray-500">{member.averageRating}/5</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Project Team Analytics */}
          <div className="panel p-6">
            <div className="mb-4 flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-[var(--color-primary)]" />
              <div>
                <h2 className="text-base font-bold text-gray-800">Project Team Analytics</h2>
                <p className="text-xs text-gray-500">Completed project performance by team</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-[10px] uppercase text-gray-400">
                    <th className="py-2">Project</th>
                    <th className="py-2">Lead</th>
                    <th className="py-2">Duration</th>
                    <th className="py-2 text-right">Avg Rating</th>
                  </tr>
                </thead>
                <tbody>
                  {performance.projectTeamAnalytics.slice(0, 10).map((project: any) => (
                    <tr key={project.projectId} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="py-3">
                        <p className="break-words font-bold text-gray-800">{project.projectName}</p>
                        <p className="text-[10px] text-gray-400">{project.category} · Best: <span className="font-medium text-[var(--color-primary)]">{project.topMember}</span></p>
                      </td>
                      <td className="py-3 text-xs text-gray-600">{project.teamLead}</td>
                      <td className="py-3 text-xs text-gray-600">{project.durationDays ? `${project.durationDays} days` : 'Active'}</td>
                      <td className="py-3 text-right">
                        <span className="font-black text-[var(--color-primary)]">{project.averageRating}/5</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
