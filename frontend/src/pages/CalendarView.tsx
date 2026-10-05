import React from 'react';
import { UnifiedCalendarView } from '../components/views/UnifiedCalendar';

export function CalendarView() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
         <div>
          <h1 className="text-2xl font-bold text-[var(--color-primary-dark)]">Calendar Dashboard</h1>
          <p className="text-sm text-[#666] mt-1">Dense view of all project deadlines and milestones</p>
         </div>
      </div>
      
      <UnifiedCalendarView />
    </div>
  );
}
