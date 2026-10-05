import React, { useState } from 'react';

export function KanbanBoard({ tasks, onStatusChange }: { tasks: any[], onStatusChange: (taskId: number, status: string) => void }) {
  const columns = ['To Do', 'In Progress', 'Completed'];

  const handleDragStart = (e: React.DragEvent, id: number) => {
    e.dataTransfer.setData('taskId', id.toString());
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, status: string) => {
    e.preventDefault();
    const taskId = parseInt(e.dataTransfer.getData('taskId'), 10);
    if (!isNaN(taskId)) {
      onStatusChange(taskId, status);
    }
  };

  const formatLocal = (iso: string) => {
    if (!iso) return '';
    const [y, m, d] = iso.split('T')[0].split('-');
    return `${m}/${d}/${y}`;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {columns.map(col => (
        <div 
          key={col} 
          className="bg-gray-50 p-4 rounded-lg flex flex-col"
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, col)}
        >
          <div className="font-bold text-gray-700 mb-4 px-2">{col} <span className="bg-gray-200 text-xs px-2 py-0.5 rounded-full ml-2">{tasks.filter(t => t.status === col).length}</span></div>
          <div className="flex-1 space-y-3 min-h-[200px]">
             {tasks.filter(t => t.status === col).map(t => (
               <div 
                  key={t.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, t.id)}
                  className="bg-white p-3 rounded shadow-sm border border-gray-200 cursor-grab active:cursor-grabbing hover:border-[var(--color-primary)] transition-colors"
               >
                 <div className="flex items-center gap-1.5 mb-1.5 overflow-hidden">
                    <span className="text-[8px] font-black text-blue-500 bg-blue-50/50 px-1 py-0 rounded border border-blue-100 shrink-0">{t.projectCode}</span>
                    <div className="font-bold text-xs text-gray-900 truncate">{t.title}</div>
                 </div>
                 {t.projectName && (
                   <div className="mb-2 rounded bg-[var(--color-primary-light)] px-2 py-1 text-[10px] font-bold text-[var(--color-primary-dark)] line-clamp-2">
                     {t.projectName}
                   </div>
                 )}
                 <div className="flex flex-wrap items-center gap-1 mb-2">
                    {t.priority && (
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${
                            t.priority === 'High' ? 'bg-red-50 text-red-600 border border-red-100' :
                            t.priority === 'Medium' ? 'bg-yellow-50 text-yellow-600 border border-yellow-100' :
                            'bg-green-50 text-green-600 border border-green-100'
                        }`}>
                            {t.priority}
                        </span>
                    )}
                 </div>
                 {t.startDate && t.endDate && (
                     <div className="text-[9px] text-gray-400 font-medium uppercase tracking-tighter">{formatLocal(t.startDate)} › {formatLocal(t.endDate)}</div>
                 )}
                 <div className="mt-2 pt-2 border-t border-gray-50 flex items-center justify-between">
                    <div className="flex items-center gap-1">
                       <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center text-[8px] font-bold text-blue-600 border border-blue-200 uppercase">
                          {t.assignedToName ? t.assignedToName.charAt(0) : '?'}
                       </div>
                       <span className="text-[10px] text-gray-600 font-bold">{t.assignedToName || 'Unassigned'}</span>
                    </div>
                 </div>
               </div>
             ))}
          </div>
        </div>
      ))}
    </div>
  );
}
