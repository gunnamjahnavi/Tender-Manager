/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { CreatorDashboard } from './pages/CreatorDashboard';
import { HodDashboard } from './pages/HodDashboard';
import { SeniorLeadDashboard } from './pages/SeniorLeadDashboard';
import { TeamLeadDashboard } from './pages/TeamLeadDashboard';
import { MemberDashboard } from './pages/MemberDashboard';
import { Projects } from './pages/Projects';
import { CalendarView } from './pages/CalendarView';
import { Employees } from './pages/Employees';
import { Analytics } from './pages/Analytics';
import Profile from './pages/Profile';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user') || 'null'));

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  if (!token || !user) {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="*" element={<Login setToken={setToken} setUser={setUser} />} />
        </Routes>
      </BrowserRouter>
    );
  }

  const getDashboardPath = () => {
    if (user.isTeamLead) return '/dashboard/team-lead';
    if (user.role === 'Viewer') return '/projects';
    const role = user.role?.toLowerCase().replace(/\s+/g, '-');
    return `/dashboard/${role || 'login'}`;
  };

  return (
    <BrowserRouter>
      <Layout user={user} logout={logout}>
        <Routes>
          <Route path="/" element={<Navigate to={getDashboardPath()} />} />
          {user?.role === 'Creator' && <Route path="/dashboard/creator" element={<CreatorDashboard />} />}
          {user?.role === 'HOD' && <Route path="/dashboard/hod" element={<HodDashboard />} />}
          {user?.role === 'Senior Lead' && <Route path="/dashboard/senior-lead" element={<SeniorLeadDashboard />} />}
          {user?.isTeamLead && (
             <Route path="/dashboard/team-lead" element={<TeamLeadDashboard />} />
          )}
          {user?.role === 'Member' && <Route path="/dashboard/member" element={<MemberDashboard />} />}
          
          <Route path="/projects" element={<Projects />} />
          <Route path="/calendar" element={<CalendarView />} />
          <Route path="/profile" element={<Profile />} />
          {(user?.role === 'HOD' || user?.role === 'Senior Lead' || user?.role === 'Creator' || user?.role === 'Viewer') && (
            <Route path="/employees" element={<Employees />} />
          )}
          <Route path="/analytics" element={<Analytics />} />

          <Route path="*" element={<div>Page Not Found or Unauthorized</div>} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
