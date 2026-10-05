import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export function TaskCalendar({ tasks }: { tasks: any[] }) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const getWeekNumber = (year: number, month: number, day: number) => {
    const date = new Date(year, month, day);
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
    const week1 = new Date(date.getFullYear(), 0, 4);
    return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  
  const calendarCells = [
    ...Array(firstDay).fill(null),
    ...days
  ];

  const remainder = calendarCells.length % 7;
  if (remainder > 0) {
    calendarCells.push(...Array(7 - remainder).fill(null));
  }

  const weeks = [];
  for (let i = 0; i < calendarCells.length; i += 7) {
    weeks.push(calendarCells.slice(i, i + 7));
  }

  return (
    <div className="bg-white border border-[#e1e1e1] rounded-lg overflow-hidden shadow-sm">
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#e1e1e1] bg-gray-50/50">
        <h2 className="font-bold text-[var(--color-primary-dark)] text-xl flex items-center gap-2">
          {currentDate.toLocaleString('default', { month: 'long' })} 
          <span className="text-gray-400 font-medium">{year}</span>
        </h2>
        <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-md p-1 shadow-sm">
          <button onClick={prevMonth} className="p-1 hover:bg-gray-100 rounded text-gray-600 transition-colors"><ChevronLeft className="w-5 h-5" /></button>
          <button onClick={() => setCurrentDate(new Date())} className="px-3 text-sm font-medium text-gray-600 hover:text-gray-900">Today</button>
          <button onClick={nextMonth} className="p-1 hover:bg-gray-100 rounded text-gray-600 transition-colors"><ChevronRight className="w-5 h-5" /></button>
        </div>
      </div>
      <div className="grid grid-cols-[40px_repeat(7,1fr)] gap-px bg-gray-200">
        <div className="bg-gray-50 py-3 text-center text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">
          Wk
        </div>
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="bg-gray-50 py-3 text-center text-xs font-bold text-gray-600 uppercase tracking-wide">
            {day}
          </div>
        ))}
        
        {weeks.map((week, wIdx) => {
          const validDay = week.find(d => d !== null) || 1;
          const weekNum = getWeekNumber(year, month, validDay);

          return (
            <React.Fragment key={wIdx}>
              <div className="bg-gray-50 flex items-center justify-center text-xs font-bold text-gray-400 border-r border-gray-100">
                {weekNum}
              </div>
              
              {week.map((day, dIdx) => {
                if (day === null) {
                  return <div key={`blank-${wIdx}-${dIdx}`} className="bg-white/40 min-h-[120px]"></div>;
                }
                
                const currentDayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                
                const dayTasks = tasks.filter(t => {
                  if (!t.endDate) return false;
                  return currentDayStr === t.endDate.split('T')[0];
                });

                const isToday = day === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear();

                return (
                  <div key={day} className="bg-white min-h-[120px] p-2 hover:bg-gray-50 transition-colors group relative border-t border-transparent">
                    <span className={`text-sm font-semibold inline-flex items-center justify-center
                      ${isToday 
                        ? 'bg-[var(--color-primary)] text-white w-7 h-7 rounded-full shadow-md' 
                        : 'text-gray-700 w-7 h-7'}`}
                    >
                      {day}
                    </span>
                    <div className="mt-2 space-y-1.5 flex flex-col items-start w-full">
                      {dayTasks.map(t => (
                        <div key={t.id} className="text-[10px] font-medium bg-orange-50 text-orange-700 px-2 py-1 rounded border border-orange-200 hover:bg-orange-100 transition-all w-full text-left shadow-sm flex flex-col" title={`${t.title} (Assigned to: ${t.assignedToName || 'Unassigned'})`}>
                          <div className="flex items-center gap-1 truncate mb-0.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0"></div>
                            <span className="truncate font-bold">{t.title}</span>
                          </div>
                          <div className="text-[9px] text-orange-600/80 italic pl-2.5 truncate">
                            👤 {t.assignedToName || 'Unassigned'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
