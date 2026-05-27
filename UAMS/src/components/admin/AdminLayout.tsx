import { useState } from 'react';
import { User } from '../../types';
import Sidebar from '../ui/Sidebar';
import Header from '../ui/Header';
import Dashboard from './Dashboard';
import Utilities from './Utilities';
import DieselGenerator from './utilities/diesel-generator/DieselGenerator';
import FuelPage from './utilities/fuel/Fuel';
import Compressor from "./utilities/compressor/Compressor";
// import Plan from './Plan/Plan';
import PlanIndex from './Plan_backup_ab/PlanIndex';
import MapComp from './Map/MapComp';
import Tickets from './tickets/Tickets';
import Alerts from './alerts/Alerts';
import WorkFlow from './workflow/WorkFlow';
import Plan from './plan/Plan';

interface AdminLayoutProps {
  user: User;
  activePage: string;
  onNavigate: (page: string) => void;
  onLogout: () => void;
}

const PAGE_TITLES: Record<string, string> = {
  dashboard: 'Dashboard',
  utilities: 'Utilities Management',
  'diesel-generator': 'Diesel Generator',
  tickets: 'Ticket Management',
  plan: 'Plan',
  alerts: 'Alerts',
  workflow: 'Work Flow',
};

const STATIC_PAGES = new Set([
  'dashboard',
  'utilities',
  'fuel',
  'plan',
  'map',
  'tickets',
  'alerts',
  'workflow',
]);

export default function AdminLayout({ user, activePage, onNavigate, onLogout }: AdminLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const isUtilityPage = activePage !== 'dashboard' && activePage !== 'utilities' && !STATIC_PAGES.has(activePage);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar
        user={user}
        activePage={activePage}
        onNavigate={onNavigate}
        onLogout={onLogout}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(!collapsed)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header
          title={PAGE_TITLES[activePage] ?? (isUtilityPage ? 'Utility' : 'Dashboard')}
          onMenuToggle={() => setMobileOpen(true)}
        />

        <main className="flex-1 overflow-y-auto">
          {activePage === 'dashboard' && <Dashboard user={user} />}
          {activePage === 'utilities' && <Utilities onNavigate={onNavigate} />}
          {activePage === 'fuel' && <FuelPage />}
          {activePage === 'plan' && <Plan/>}
          {activePage === 'map' && <MapComp/>}
          {activePage === 'tickets' && <Tickets/>}
          {activePage === 'alerts' && <Alerts/>}
          {activePage === 'workflow' && <WorkFlow/>}
          {isUtilityPage && <DieselGenerator utilityTypeId={activePage} />}
        </main>
      </div>
    </div>
  );
}
