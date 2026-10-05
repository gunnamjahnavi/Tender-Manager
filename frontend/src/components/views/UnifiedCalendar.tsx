import React, { useState, useEffect } from 'react';
import { isBidDroppedProject } from '../../constants/project';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Flag, 
  CheckCircle2, 
  AlertCircle, 
  Bell,
  Search,
  Filter
} from 'lucide-react';

interface Event {
  id: string;
  title: string;
  date: Date;
  type: 'Milestone' | 'TaskDue';
  assignedTo?: string;
  projectName?: string;
  projectCode?: string;
  projectId?: number;
  projectColor?: string;
  priority?: string;
}

const TYPE_CONFIG = {
  Milestone: { color: 'bg-cyan-500', text: 'text-cyan-700', bg: 'bg-cyan-50', icon: Bell, label: 'Milestone' },
  TaskDue: { color: 'bg-purple-500', text: 'text-purple-700', bg: 'bg-purple-50', icon: CheckCircle2, label: 'Task Due' },
};

const PRIORITY_COLORS: Record<string, string> = {
  High: 'bg-red-500',
  Medium: 'bg-amber-500',
  Low: 'bg-emerald-500',
  default: 'bg-purple-500'
};

export function UnifiedCalendarView({ projectIds }: { projectIds?: number[] }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<Event[]>([]);
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  // Privileged roles (Creator, HOD, Senior Lead, Viewer) cannot see tasks, only project deadlines
  const canSeeTasksRole = !['Creator', 'HOD', 'Senior Lead', 'Viewer'].includes(user.role);
  const [filter, setFilter] = useState<string[]>(canSeeTasksRole ? ['Milestone', 'TaskDue'] : ['Milestone']);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
      const [pRes, tRes] = await Promise.all([
        fetch('/api/projects?calendar=true', { headers }),
        fetch('/api/tasks', { headers })
      ]);

      let allEvents: Event[] = [];
      let projectColorMap: Record<number, string> = {};

      if (pRes.ok) {
        const projects = (await pRes.json()).filter((p: any) => !isBidDroppedProject(p));
        const activeProjectIds = new Set(projects.map((p: any) => p.id));

        projects.forEach((p: any) => {
          if (projectIds && projectIds.length > 0 && !projectIds.includes(p.id)) return;

          projectColorMap[p.id] = p.categoryColor;

          const finalDate = p.endDate || p.EndDate || p.BidDeadline || p.createdAt;
          if (finalDate) {
            allEvents.push({
              id: `p-${p.id}`,
              title: `${p.name} - Deadline`,
              date: new Date(finalDate),
              type: 'Milestone',
              projectName: p.name,
              projectCode: p.projectCode,
              projectId: p.id,
              projectColor: p.categoryColor
            });
          }
        });

        if (tRes.ok) {
          let tasks = await tRes.json();
          tasks = tasks.filter((t: any) => activeProjectIds.has(t.projectId));

          if (projectIds && projectIds.length > 0) {
            tasks = tasks.filter((t: any) => projectIds.includes(t.projectId));
          }

          tasks.forEach((t: any) => {
            const end = t.endDate || t.EndDate || null;
            if (end) {
              allEvents.push({
                id: `t-${t.id}`,
                title: t.title,
                date: new Date(end),
                type: 'TaskDue',
                assignedTo: t.assignedToName || t.AssignedToName || t.assignedTo || null,
                projectName: t.projectName,
                projectCode: t.projectCode,
                projectId: t.projectId,
                projectColor: projectColorMap[t.projectId],
                priority: t.priority
              });
            }
          });
        }
      }

      setEvents(allEvents);
    };
    fetchData();
  }, [projectIds]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanks = Array.from({ length: firstDayOfMonth }, (_, i) => null);
  const calendarDays = [...blanks, ...days];

  const filteredEvents = events.filter(e => 
    filter.includes(e.type) && 
    (e.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
     e.projectName?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const sortedEvents = [...filteredEvents].sort((a, b) => a.date.getTime() - b.date.getTime());
  const upcomingEvents = sortedEvents.filter(e => e.date >= new Date(new Date().setHours(0,0,0,0)));

  return (
    <div className="flex h-[calc(100vh-120px)] bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm font-sans">
      {/* Left: Calendar Grid */}
      <div className="flex-1 flex flex-col border-r border-gray-100 min-w-0">
        <header className="px-6 py-4 border-b border-gray-50 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-gray-800">
              {currentDate.toLocaleString('default', { month: 'long' })} <span className="text-gray-400 font-medium">{year}</span>
            </h2>
            <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-lg">
              <button onClick={prevMonth} className="p-1.5 hover:bg-white hover:shadow-sm rounded-md transition-all text-gray-500"><ChevronLeft size={18}/></button>
              <button onClick={() => setCurrentDate(new Date())} className="px-3 text-xs font-bold text-gray-600 uppercase tracking-tighter">Today</button>
              <button onClick={nextMonth} className="p-1.5 hover:bg-white hover:shadow-sm rounded-md transition-all text-gray-500"><ChevronRight size={18}/></button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
              <input 
                type="text" 
                placeholder="Search events..." 
                className="pl-8 pr-4 py-1.5 bg-gray-50 border-none rounded-lg text-xs focus:ring-1 focus:ring-[var(--color-primary)] w-48"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto bg-gray-50/30">
          <div className="grid grid-cols-7 border-b border-gray-100 bg-white">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d} className="py-2 text-center text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                {d}
              </div>
            ))}
          </div>
          
          <div className="grid grid-cols-7 grid-rows-5 h-[calc(100%-35px)] min-h-[500px]">
            {calendarDays.map((day, idx) => {
              const isToday = day === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear();
              const dateStr = day ? `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` : '';
              const dayEvents = day ? filteredEvents.filter(e => e.date.toISOString().split('T')[0] === dateStr) : [];
              
              return (
                <div key={idx} className={`min-h-[100px] border-b border-r border-gray-100 p-2 transition-colors ${day ? 'bg-white hover:bg-gray-50/50' : 'bg-gray-50/20'}`}>
                  {day && (
                    <>
                      <div className="flex justify-between items-start mb-1">
                        <span className={`font-mono text-[10px] font-bold ${isToday ? 'bg-[var(--color-primary)] text-white w-5 h-5 flex items-center justify-center rounded-sm' : 'text-gray-400'}`}>
                          {String(day).padStart(2, '0')}
                        </span>
                      </div>
                      <div className="space-y-1">
                        {dayEvents.slice(0, 3).map(e => {
                          const Config = TYPE_CONFIG[e.type];
                          // REQUIREMENT: Color differentiation by Team (Project Color)
                          // Milestones keep Cyan, but Tasks use their Project's Category Color
                          const eventColor = e.type === 'TaskDue' && e.projectColor ? e.projectColor : null;

                          return (
                            <div 
                              key={e.id} 
                              className={`${Config.bg} ${Config.text} border-l-2 px-1.5 py-0.5 rounded-sm flex items-center gap-1 group cursor-pointer hover:brightness-95`} 
                              style={eventColor ? { borderLeftColor: eventColor, backgroundColor: `${eventColor}15` } : { borderLeftColor: Config.color.replace('bg-', '') }}
                              title={`${e.title}${e.assignedTo ? ` (Assigned to: ${e.assignedTo})` : ''} - Project: ${e.projectName}`}
                            >
                              <Config.icon size={10} className="shrink-0" style={eventColor ? { color: eventColor } : {}} />
                              <span className="text-[9px] font-bold leading-tight line-clamp-2">
                                {e.type === 'TaskDue' && e.projectName ? `${e.projectName} - ${e.title}` : e.title}
                              </span>
                            </div>
                          );
                        })}
                        {dayEvents.length > 3 && (
                          <div className="text-[9px] font-bold text-gray-400 pl-1">+{dayEvents.length - 3} more</div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right: Event Directory */}
      <div className="w-[320px] flex flex-col bg-white">
        <div className="p-6 border-b border-gray-100 bg-gray-50/30">
          <h3 className="text-sm font-black text-gray-800 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Filter size={14} className="text-[var(--color-primary)]" />
            Directory
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(TYPE_CONFIG).map(([type, config]) => {
              // Privileged roles cannot see TaskDue events
              if (type === 'TaskDue' && !canSeeTasksRole) {
                return null;
              }
              return (
                <button 
                  key={type}
                  onClick={() => setFilter(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type])}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded-lg border text-[10px] font-bold transition-all ${filter.includes(type) ? 'bg-white border-gray-200 shadow-sm' : 'bg-gray-50 border-transparent opacity-50'}`}
                >
                  <div className={`w-2 h-2 rounded-full ${config.color}`}></div>
                  {config.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4 space-y-4 custom-scrollbar">
          <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-2">Upcoming Schedule</h4>
          {upcomingEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-300">
               <CalendarIcon size={32} className="mb-2 opacity-20" />
               <span className="text-xs">No upcoming events</span>
            </div>
          ) : (
            upcomingEvents.map(e => {
              const Config = TYPE_CONFIG[e.type];
              const teamColor = e.type === 'TaskDue' ? e.projectColor : null;

              return (
                <div 
                  key={e.id} 
                  className="group relative pl-4 border-l-2 transition-all py-1"
                  style={{ borderLeftColor: teamColor || '#E5E7EB' }}
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="font-mono text-[9px] font-bold text-gray-400">
                      {e.date.toLocaleDateString('en-US', { day: '2-digit', month: 'short' })}
                    </span>
                    <span 
                      className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded"
                      style={teamColor ? { backgroundColor: `${teamColor}15`, color: teamColor } : { backgroundColor: '#F3F4F6', color: '#6B7280' }}
                    >
                      {e.type === 'TaskDue' ? 'Team Task' : Config.label}
                    </span>
                  </div>
                  <div className="text-xs font-bold text-gray-800 group-hover:text-[var(--color-primary)] transition-colors line-clamp-2">
                    {e.type === 'TaskDue' && e.projectName ? `${e.projectName} - ${e.title}` : e.title}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    {e.projectCode && <span className="text-[9px] font-mono font-bold text-blue-600 bg-blue-50 px-1 rounded">{e.projectCode}</span>}
                    {e.projectName && <span className="text-[9px] font-medium text-gray-500 truncate">{e.projectName}</span>}
                    {e.assignedTo && <span className="text-[9px] font-medium text-gray-500">👤 {e.assignedTo}</span>}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
