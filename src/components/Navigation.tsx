import { LayoutDashboard, Car, History, Bell, LogOut, Users, User as UserIcon } from 'lucide-react';
import { cn } from '../lib/utils';
import { User } from '../types';

interface NavigationProps {
  currentPage: string;
  onPageChange: (page: string) => void;
  userRole?: string;
}

interface TopAppBarProps {
  user: User;
  onLogout: () => void;
  onProfileClick: () => void;
}

export function TopAppBar({ user, onLogout, onProfileClick }: TopAppBarProps) {
  return (
    <header className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200 shadow-sm flex items-center justify-between px-6 h-16">
      <div className="flex items-center gap-2">
        <Car className="w-6 h-6 text-primary" fill="currentColor" />
        <h1 className="text-xl font-extrabold tracking-tight text-primary italic">Vehicle Management</h1>
      </div>
      <div className="flex items-center gap-4">
        <div className="hidden md:flex flex-col items-end mr-2">
          <span className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest opacity-60">Logged in as</span>
          <span className="text-xs font-bold text-on-surface">{user.email}</span>
        </div>
        <button 
          onClick={onLogout}
          className="p-2 text-secondary hover:text-error hover:bg-error/10 transition-colors rounded-full active:scale-95"
          title="Logout"
        >
          <LogOut className="w-5 h-5" />
        </button>
        <button 
          onClick={onProfileClick}
          className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden border border-primary/20 hover:border-primary/50 transition-all active:scale-95"
        >
          <img 
            alt="Profile" 
            src={user.profileImageUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
        </button>
      </div>
    </header>
  );
}

export function BottomNavBar({ currentPage, onPageChange, userRole }: NavigationProps) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'vehicles', label: 'Vehicles', icon: Car },
    { id: 'history', label: 'History', icon: History },
  ];

  if (userRole === 'admin') {
    navItems.push({ id: 'users', label: 'Users', icon: Users });
  }

  return (
    <nav className="fixed bottom-0 left-0 w-full h-20 bg-white/90 backdrop-blur-lg border-t border-slate-200 shadow-[0_-10px_40px_rgba(0,55,176,0.08)] flex justify-around items-center px-6 pb-2 z-50 rounded-t-3xl">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = currentPage === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onPageChange(item.id)}
            className={cn(
              "flex flex-col items-center justify-center px-5 py-2 rounded-2xl transition-all duration-200 active:scale-90",
              isActive 
                ? "bg-primary/10 text-primary" 
                : "text-secondary hover:text-primary"
            )}
          >
            <Icon className={cn("w-6 h-6 mb-1", isActive && "fill-current")} />
            <span className="text-[11px] font-bold uppercase tracking-wider">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
