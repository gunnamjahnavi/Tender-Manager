import { ReactNode, useState, useEffect } from 'react';
import { LogOut, Home, Briefcase, Calendar, Users, Bell, Shield, BarChart3, UserCircle } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

export function Layout({ children, user, logout }: { children: ReactNode; user: any; logout: () => void }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchNotifications = async () => {
      const res = await fetch('/api/notifications', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      if (res.ok) {
        setNotifications(await res.json());
      }
    };
    fetchNotifications();
    
    // Poll for demo purpose
    const interval = setInterval(fetchNotifications, 5000);
    return () => clearInterval(interval);
  }, [user]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllRead = async () => {
    await fetch('/api/notifications/read-all', { 
        method: 'PATCH',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } 
    });
    setNotifications(notifications.map(n => ({...n, read: true})));
  };

  const handleLogout = () => {
    setShowUserMenu(false);
    logout();
  };

  let navItems = [
    { name: 'Dashboard', icon: Home, path: '/' },
    { name: 'Projects', icon: Briefcase, path: '/projects' },
    { name: 'Calendar', icon: Calendar, path: '/calendar' },
  ];

  if (user?.role === 'Viewer') {
    navItems = navItems.filter(item => item.name !== 'Dashboard');
  }

  // Dual Dashboard Logic
  if (user?.role === 'Member' && user?.isTeamLead) {
    navItems[0] = { name: 'Member Workspace', icon: Home, path: '/dashboard/member' };
    navItems.splice(1, 0, { name: 'Lead Projects', icon: Shield, path: '/dashboard/team-lead' });
  }

  if (user?.role === 'HOD' || user?.role === 'Senior Lead' || user?.role === 'Creator' || user?.role === 'Viewer') {
    navItems.push({ name: 'Employees', icon: Users, path: '/employees' });
  }

  navItems.push({ name: 'Analytics', icon: BarChart3, path: '/analytics' });

  return (
    <div className="min-h-screen flex bg-[var(--color-background)]">
      {/* Sidebar */}
      <aside className="w-[220px] bg-[var(--color-primary-dark)] text-white flex flex-col py-6">
        <div className="px-6 pb-8 mb-6 border-b border-white/10 flex items-center font-bold text-xl tracking-wider">
          L&T <span className="text-[var(--color-warning)] ml-1">TENDERS</span>
          <span className="text-xs font-normal opacity-50 ml-2 block w-full truncate">{user?.role}</span>
        </div>
        
        <nav className="flex-1 flex flex-col">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || (item.path === '/' && location.pathname.startsWith('/dashboard'));
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center gap-3 px-6 py-3 text-sm transition-all duration-200 ${
                  isActive
                    ? 'bg-[var(--color-primary)] text-white border-l-4 border-[var(--color-warning)]'
                    : 'text-white/70 hover:bg-white/5 hover:text-white border-l-4 border-transparent'
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar user + logout */}
        <div className="mt-auto px-4 pt-4 border-t border-white/10">
          <Link to="/profile" className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/10 transition-colors group mb-2">
            <div className="w-8 h-8 rounded-full bg-[var(--color-warning)] text-[var(--color-primary-dark)] flex items-center justify-center text-sm font-black shrink-0">
              {user?.name?.[0] || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-white truncate">{user?.name}</div>
              <div className="text-[10px] text-white/50 truncate">{user?.role}</div>
            </div>
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg bg-red-500/20 hover:bg-red-500/40 text-red-300 hover:text-white transition-all font-bold text-xs uppercase tracking-wider border border-red-500/30 hover:border-red-400/50"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-[#e1e1e1] h-16 flex justify-between items-center px-8 shrink-0 relative z-20">
          <div className="text-[18px] font-medium text-[var(--color-primary-dark)]">
            {user?.role} <span className="opacity-50 font-light">/ Dashboard</span>
          </div>
          <div className="flex items-center gap-4">
            
            {/* Notifications */}
            <div className="relative">
              <button 
                onClick={() => { setShowNotifications(!showNotifications); setShowUserMenu(false); }}
                className="p-1.5 text-gray-400 hover:text-[var(--color-primary)] transition-colors relative"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-red-500 rounded-full"></span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-100 overflow-hidden text-sm">
                  <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <span className="font-bold text-[var(--color-primary-dark)]">Notifications</span>
                    {unreadCount > 0 && (
                        <button onClick={markAllRead} className="text-xs text-[var(--color-primary)] hover:underline">Mark all read</button>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-4 text-center text-gray-500 text-xs">No notifications</div>
                    ) : (
                      notifications.map(n => (
                        <div key={n.id} className={`px-4 py-3 border-b border-gray-100 last:border-0 ${n.read ? 'bg-white' : 'bg-blue-50/30'}`}>
                          <p className={`text-xs ${n.read ? 'text-gray-600' : 'text-gray-900 font-medium'}`}>{n.message}</p>
                          <p className="text-[10px] text-gray-400 mt-1 uppercase">{new Date(n.timestamp).toLocaleString()}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User menu with logout */}
            <div className="relative">
              <button
                onClick={() => { setShowUserMenu(!showUserMenu); setShowNotifications(false); }}
                className="flex items-center gap-3 hover:bg-gray-50 px-3 py-1.5 rounded-lg transition-colors group"
              >
                <div className="text-right">
                  <div className="text-[14px] font-bold text-gray-900 group-hover:text-[var(--color-primary)] transition-colors">{user?.name}</div>
                  <div className="text-[11px] text-[#666]">{user?.role}</div>
                </div>
                <div className="w-9 h-9 rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center text-[13px] font-bold shrink-0 ring-2 ring-[var(--color-primary-light)]">
                  {user?.name?.[0] || 'U'}
                </div>
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50">
                  <div className="px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-[var(--color-primary-light)] to-white">
                    <p className="font-bold text-gray-900 text-sm">{user?.name}</p>
                    <p className="text-xs text-gray-500">{user?.email || user?.role}</p>
                  </div>
                  <div className="p-2">
                    <Link
                      to="/profile"
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors font-medium"
                    >
                      <UserCircle className="w-4 h-4 text-gray-400" />
                      My Profile
                    </Link>
                    <div className="my-1 border-t border-gray-100" />
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50 transition-colors font-bold"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-6" onClick={() => { setShowNotifications(false); setShowUserMenu(false); }}>
          {children}
        </div>
      </main>
    </div>
  );
}
