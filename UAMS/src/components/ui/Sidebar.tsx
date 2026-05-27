import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  LogOut,
  Settings,
  User as UserIcon,
  LayoutDashboard,
  Wrench,
  Zap,
  Factory,
  Gauge,
  Power,
  BatteryCharging,
  Wind,
  AirVent,
  Box,
  Ticket,
  ClipboardList,
  Bell,
  type LucideIcon,
  FileBarChart,
} from 'lucide-react';
import { User } from '../../types';
import AdaniLogo from './AdaniLogo';
import { api, type ApiUtilityType } from '../../lib/api';

interface SubNavItem {
  id: string;
  label: string;
  icon: LucideIcon;
}

interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  children?: SubNavItem[];
}

interface SidebarProps {
  user: User;
  activePage: string;
  onNavigate: (page: string) => void;
  onLogout: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

const ICON_MAP: Record<string, LucideIcon> = {
  power: Power,
  factory: Factory,
  gauge: Gauge,
  zap: Zap,
  battery: BatteryCharging,
  wind: Wind,
  'air-vent': AirVent,
  wrench: Wrench,
};

function UserFooter({
  user,
  onLogout,
  collapsed,
}: {
  user: User;
  onLogout: () => void;
  collapsed: boolean;
}) {
  return (
    <div className="border-t border-gray-100 p-3">
      <div className={`flex items-center gap-2 ${collapsed ? 'justify-center' : ''}`}>
        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
          {user.avatar}
        </div>

        <AnimatePresence mode="wait">
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex-1 min-w-0"
            >
              <p className="text-xs font-medium text-gray-800 truncate">{user.name}</p>
              <p className="text-xs text-gray-500 capitalize">{user.role}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {!collapsed && (
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
                  className="flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 rounded-lg hover:bg-gray-50 cursor-pointer outline-none"
                >
                  <UserIcon size={14} className="text-gray-400" />
                  Profile Settings
                </DropdownMenu.Item>

                <DropdownMenu.Separator className="my-1 h-px bg-gray-100" />

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
        )}

        {collapsed && (
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
              >
                <Settings size={14} />
              </motion.button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                side="right"
                align="end"
                sideOffset={6}
                className="z-50 bg-white rounded-xl border border-gray-200 shadow-lg p-1 min-w-[160px]"
              >
                <DropdownMenu.Item className="flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 rounded-lg hover:bg-gray-50 cursor-pointer outline-none">
                  <UserIcon size={14} className="text-gray-400" />
                  Profile Settings
                </DropdownMenu.Item>
                <DropdownMenu.Separator className="my-1 h-px bg-gray-100" />
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
        )}
      </div>
    </div>
  );
}

function SidebarContent({
  user,
  activePage,
  onNavigate,
  onLogout,
  collapsed,
  onToggleCollapse,
}: Omit<SidebarProps, 'mobileOpen' | 'onMobileClose'>) {
  const [utilities, setUtilities] = useState<ApiUtilityType[]>([]);
  const [utilitiesOpen, setUtilitiesOpen] = useState(true); // default open so utilities are visible

  useEffect(() => {
    api.utilityTypes.list().then(list => {
      setUtilities(list);
      // Auto-open if current page is one of the utility IDs
      if (list.some(u => u.id === activePage)) {
        setUtilitiesOpen(true);
      }
    }).catch(console.error);
  }, []);

  const adminNav: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    {
      id: 'utilities',
      label: 'Utilities',
      icon: Wrench,
      children: utilities.map(u => ({
        id: u.id,
        label: u.name,
        icon: u.icon ? (ICON_MAP[u.icon] || Box) : Box,
      })),
    },
    { id: 'tickets', label: 'Tickets', icon: Ticket },
    { id: 'plan', label: 'Plan', icon: ClipboardList },
    { id: 'alerts', label: 'Alerts', icon: Bell },
    { id: 'workflow', label: 'Work Flow', icon: FileBarChart },
  ];

  const handleNavClick = (item: NavItem) => {
    if (item.children) {
      if (collapsed) {
        onToggleCollapse();
        setUtilitiesOpen(true);
      } else {
        setUtilitiesOpen((v) => !v);
      }
      onNavigate(item.id);
    } else {
      onNavigate(item.id);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Logo header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
        <AnimatePresence mode="wait">
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-3 min-w-0"
            >
              <AdaniLogo variant="color" className="h-6 w-auto flex-shrink-0" />
              <div className="w-px h-5 bg-gray-200 flex-shrink-0" />
              <p className="text-xs text-gray-500 leading-tight">Utility Management<br/>System</p>
            </motion.div>
          )}
        </AnimatePresence>

        {collapsed && (
          <AdaniLogo variant="color" className="h-4 w-auto mx-auto" />
        )}

        {!collapsed && (
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onToggleCollapse}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors flex-shrink-0 ml-2"
          >
            <ChevronLeft size={16} />
          </motion.button>
        )}
      </div>

      {/* Expand button when collapsed */}
      {collapsed && (
        <div className="flex justify-center px-2 py-3 border-b border-gray-100">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onToggleCollapse}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
          >
            <ChevronRight size={18} />
          </motion.button>
        </div>
      )}

      {/* Nav items */}
      <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
        {adminNav.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id || item.children?.some((c) => activePage === c.id);
          const hasChildren = !!item.children;
          const isOpen = hasChildren && utilitiesOpen && !collapsed;

          return (
            <div key={item.id}>
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => handleNavClick(item)}
                className={`
                  w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left
                  transition-all duration-150 font-medium text-sm
                  ${isActive
                    ? 'bg-blue-50 text-blue-600 border-l-4 border-blue-600'
                    : 'text-gray-600 hover:bg-gray-50 border-l-4 border-transparent'
                  }
                `}
              >
                <Icon size={20} className="flex-shrink-0" />
                {!collapsed && (
                  <>
                    <span className="flex-1 whitespace-nowrap overflow-hidden">{item.label}</span>
                    {hasChildren && (
                      <motion.span
                        animate={{ rotate: isOpen ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <ChevronDown size={15} className="text-gray-400" />
                      </motion.span>
                    )}
                  </>
                )}
              </motion.button>

              <AnimatePresence initial={false}>
                {isOpen && item.children && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    <div className="ml-4 pl-3 border-l border-gray-200 mt-0.5 mb-1 space-y-0.5">
                      {item.children.map((child) => {
                        const ChildIcon = child.icon;
                        return (
                          <motion.button
                            key={child.id}
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.99 }}
                            onClick={() => onNavigate(child.id)}
                            className={`
                              w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-xs font-medium transition-all
                              ${activePage === child.id
                                ? 'bg-blue-50 text-blue-600'
                                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                              }
                            `}
                          >
                            <ChildIcon size={14} className="flex-shrink-0" />
                            <span className="whitespace-nowrap overflow-hidden">{child.label}</span>
                          </motion.button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </nav>

      <UserFooter user={user} onLogout={onLogout} collapsed={collapsed} />
    </div>
  );
}

export default function Sidebar(props: SidebarProps) {
  const { collapsed, onToggleCollapse, mobileOpen, onMobileClose, user, activePage, onNavigate, onLogout } = props;

  return (
    <>
      {/* Desktop sidebar */}
      <motion.aside
        animate={{ width: collapsed ? 80 : 256 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="hidden md:flex flex-col h-screen border-r border-gray-200 shadow-sm flex-shrink-0 overflow-hidden"
      >
        <SidebarContent
          user={user}
          activePage={activePage}
          onNavigate={onNavigate}
          onLogout={onLogout}
          collapsed={collapsed}
          onToggleCollapse={onToggleCollapse}
        />
      </motion.aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={onMobileClose}
              className="fixed inset-0 bg-black/40 z-40 md:hidden"
            />
            <motion.aside
              initial={{ x: -256 }}
              animate={{ x: 0 }}
              exit={{ x: -256 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="fixed left-0 top-0 bottom-0 w-64 z-50 shadow-xl md:hidden"
            >
              <SidebarContent
                user={user}
                activePage={activePage}
                onNavigate={(page) => { onNavigate(page); onMobileClose(); }}
                onLogout={onLogout}
                collapsed={false}
                onToggleCollapse={onMobileClose}
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
