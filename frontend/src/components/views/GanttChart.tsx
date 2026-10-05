import React from 'react';

export function GanttChart({ tasks }: { tasks: any[] }) {
  if (tasks.length === 0) {
    return <div className="p-8 text-center text-gray-500 border-2 border-dashed border-gray-200 rounded">No tasks with timeline data.</div>;
  }

  // Find min start date and max end date
  let minDate = new Date('2099-01-01').getTime();
  let maxDate = new Date('2000-01-01').getTime();

  const validTasks = tasks.filter(t => t.startDate && t.endDate);

  if (validTasks.length === 0) {
    return <div className="p-8 text-center text-gray-500 border-2 border-dashed border-gray-200 rounded">No timeline data available for tasks.</div>;
  }

  validTasks.forEach(t => {
    const start = new Date(t.startDate).getTime();
    const end = new Date(t.endDate).getTime();
    if (start < minDate) minDate = start;
    if (end > maxDate) maxDate = end;
  });

  const durationStr = maxDate - minDate;

  const formatLocal = (iso: string) => {
    if (!iso) return '';
    const [y, m, d] = iso.split('T')[0].split('-');
    return `${m}/${d}/${y}`;
  };

  return (
    <div className="bg-white border border-[#e1e1e1] rounded-lg p-6 overflow-x-auto">
      <div className="min-w-[600px]">
        {validTasks.map((t, idx) => {
          const start = new Date(t.startDate).getTime();
          const end = new Date(t.endDate).getTime();
          
          let leftPercent = durationStr === 0 ? 0 : ((start - minDate) / durationStr) * 100;
          let widthPercent = durationStr === 0 ? 100 : ((end - start) / durationStr) * 100;

          // Ensure minimum visibility
          if (widthPercent < 2) widthPercent = 2;

          return (
            <div key={t.id} className="mb-4 relative h-12 flex items-center border-b border-gray-100 pb-2">
              <div className="w-56 shrink-0 pr-4">
                <div className="font-bold text-sm text-[var(--color-primary-dark)] truncate">{t.title}</div>
                <div className="text-[10px] text-gray-400 font-medium">Assigned to: <span className="text-[var(--color-primary)] font-bold">{t.assignedToName || 'Unassigned'}</span></div>
              </div>
              <div className="flex-1 relative h-6 bg-gray-50 rounded">
                 <div 
                   className="absolute top-0 bottom-0 bg-[var(--color-primary)] rounded-md cursor-pointer hover:opacity-80 transition-opacity border border-blue-600 shadow-sm flex items-center justify-center px-2 overflow-hidden"
                   style={{ left: `${leftPercent}%`, width: `${widthPercent}%` }}
                   title={`${t.title} (${formatLocal(t.startDate)} - ${formatLocal(t.endDate)})`}
                 >
                    {widthPercent > 10 && <span className="text-[10px] text-white font-bold truncate">
                      {formatLocal(t.startDate)}
                    </span>}
                 </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
