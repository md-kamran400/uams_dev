import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ClipboardList, LayoutDashboard, User as UserIcon, LogOut, Ticket, Settings, Wrench, Calendar } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { User } from '../../types';
import AdaniLogo from '../ui/AdaniLogo';
import EngineerTasks from './EngineerTasks';
import EngineerTickets from './EngineerTickets';
import EngineerPmPlans from './EngineerPmPlans';
import EngineerCalendar from './EngineerCalendar';

interface EngineerLayoutProps {
  user: User;
  onLogout: () => void;
}

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'tasks', label: 'Tasks & Forms', icon: ClipboardList },
  { id: 'calendar', label: 'Calendar', icon: Calendar },
  { id: 'pmplans', label: 'PM Plans', icon: Wrench },
  { id: 'tickets', label: 'Tickets', icon: Ticket },
  { id: 'profile', label: 'Profile', icon: UserIcon },
];

const PAGE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  tasks: 'Tasks & Forms',
  calendar: 'Calendar',
  pmplans: 'PM Plans',
  tickets: 'Tickets',
  profile: 'Profile',
};

export default function EngineerLayout({ user, onLogout }: EngineerLayoutProps) {
  const [activeTab, setActiveTab] = useState('tasks');

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar — desktop only */}
      <aside className="hidden md:flex flex-col w-64 h-screen border-r border-gray-200 bg-white shadow-sm flex-shrink-0">
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-100">
          <AdaniLogo variant="color" className="h-6 w-auto flex-shrink-0" />
          <div className="w-px h-5 bg-gray-200 flex-shrink-0" />
          <p className="text-xs text-gray-500 leading-tight">Utility Management<br/>System</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <motion.button
                key={item.id}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-all duration-150 font-medium text-sm border-l-4 ${
                  isActive
                    ? 'bg-blue-50 text-blue-600 border-blue-600'
                    : 'text-gray-600 hover:bg-gray-50 border-transparent'
                }`}
              >
                <Icon size={20} className="flex-shrink-0" />
                <span className="flex-1 whitespace-nowrap overflow-hidden">{item.label}</span>
              </motion.button>
            );
          })}
        </nav>

        {/* User footer */}
        <div className="border-t border-gray-100 p-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {user.avatar}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-800 truncate">{user.name}</p>
              <p className="text-xs text-gray-500 capitalize">{user.role}</p>
            </div>
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
                >
                  <Settings size={15} />
                </motion.button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  side="top"
                  align="end"
                  sideOffset={6}
                  className="z-50 bg-white rounded-xl border border-gray-200 shadow-lg p-1 min-w-[160px] animate-in fade-in slide-in-from-bottom-2"
                >
                  <DropdownMenu.Item
                    onSelect={onLogout}
                    className="flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 rounded-lg hover:bg-red-50 cursor-pointer outline-none"
                  >
                    <LogOut size={14} />
                    Sign Out
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10 flex-shrink-0">
          {/* Mobile: show logo; desktop: show page title */}
          <div className="flex items-center gap-3 md:hidden">
            <AdaniLogo variant="color" className="h-5 w-auto" />
          </div>
          <div className="hidden md:block">
            <h1 className="text-lg font-bold text-gray-800">{PAGE_LABELS[activeTab] ?? ''}</h1>
            <p className="text-xs text-gray-500">Welcome back, {user.name}</p>
          </div>
          {/* Mobile: greeting */}
          <div className="md:hidden flex-1 text-center">
            <p className="text-sm font-semibold text-gray-700">{PAGE_LABELS[activeTab]}</p>
          </div>
          {/* Desktop: sign out */}
          <div className="hidden md:flex items-center gap-3">
            <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
              {user.avatar}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
          <div className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto">
            <AnimatePresence mode="wait">
              {activeTab === 'dashboard' && (
                <motion.div key="dashboard" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <div className="text-center py-20 text-gray-500">Dashboard coming soon.</div>
                </motion.div>
              )}
              {activeTab === 'tasks' && (
                <motion.div key="tasks" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <EngineerTasks user={user} />
                </motion.div>
              )}
              {activeTab === 'calendar' && (
                <motion.div key="calendar" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <EngineerCalendar user={user} />
                </motion.div>
              )}
              {activeTab === 'pmplans' && (
                <motion.div key="pmplans" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <EngineerPmPlans user={user} />
                </motion.div>
              )}
              {activeTab === 'tickets' && (
                <motion.div key="tickets" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <EngineerTickets user={user} />
                </motion.div>
              )}
              {activeTab === 'profile' && (
                <motion.div key="profile" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <div className="text-center py-20 text-gray-400">
                    <UserIcon size={40} className="mx-auto mb-3 opacity-30" />
                    <p className="text-sm">Profile settings coming soon.</p>
                    <button onClick={onLogout} className="mt-6 flex items-center gap-2 mx-auto text-sm text-red-500 hover:text-red-700">
                      <LogOut size={14} /> Sign Out
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around p-2 md:hidden z-50">
        {NAV_ITEMS.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all flex-1 ${
                isActive ? 'text-blue-600 bg-blue-50' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'
              }`}
            >
              <Icon size={22} strokeWidth={isActive ? 2.5 : 2} className="mb-0.5" />
              <span className={`text-[10px] font-medium ${isActive ? 'font-bold' : ''}`}>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
