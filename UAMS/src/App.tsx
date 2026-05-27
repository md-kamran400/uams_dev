import { useState } from 'react';
import { motion } from 'framer-motion';
import { User, UserRole } from './types';
import LoginPage from './components/auth/LoginPage';
import AdminLayout from './components/admin/AdminLayout';
import ComingSoon from './components/shared/ComingSoon';
import Badge from './components/ui/Badge';
import Button from './components/ui/Button';
import { Wrench, LogOut } from 'lucide-react';

const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrator',
  engineer: 'Engineer',
  approver: 'Approver',
  reviewer: 'Reviewer',
  leadership: 'Leadership',
};

function RolePlaceholder({ user, onLogout }: { user: User; onLogout: () => void }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-lg flex items-center justify-center">
            <Wrench size={16} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-800 leading-tight">Adani</p>
            <p className="text-xs text-gray-500 leading-tight">U&M Portal</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
              {user.avatar}
            </div>
            <div className="hidden md:block">
              <p className="text-sm font-medium text-gray-800">{user.name}</p>
              <Badge variant="info" size="sm">{ROLE_LABELS[user.role]}</Badge>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={onLogout}>
            <LogOut size={14} />
            Sign Out
          </Button>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-full px-4 py-2 mb-4">
            <Badge variant="info">{ROLE_LABELS[user.role]}</Badge>
            <span className="text-sm text-blue-700">Dashboard</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Welcome, {user.name}
          </h1>
          <p className="text-gray-500 text-sm">
            Your role-specific dashboard is being prepared.
          </p>
        </motion.div>
        <ComingSoon />
      </main>
    </div>
  );
}

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activePage, setActivePage] = useState('dashboard');

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setActivePage('dashboard');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setActivePage('dashboard');
  };

  if (!currentUser) {
    return <LoginPage onLogin={handleLogin} />;
  }

  if (currentUser.role === 'admin') {
    return (
      <AdminLayout
        user={currentUser}
        activePage={activePage}
        onNavigate={setActivePage}
        onLogout={handleLogout}
      />
    );
  }

  return <RolePlaceholder user={currentUser} onLogout={handleLogout} />;
}
