import { motion } from 'framer-motion';
import { Database, ClipboardList, Clock, Wrench } from 'lucide-react';
import Card from '../ui/Card';
import ComingSoon from '../shared/ComingSoon';
import { User } from '../../types';

interface DashboardProps {
  user: User;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.5 } },
};

const STATS = [
  {
    label: 'Total Assets',
    value: '1,247',
    icon: Database,
    color: 'blue',
    bg: 'bg-blue-100',
    text: 'text-blue-600',
  },
  {
    label: 'Active Work Orders',
    value: '38',
    icon: ClipboardList,
    color: 'green',
    bg: 'bg-green-100',
    text: 'text-green-600',
  },
  {
    label: 'Pending Approvals',
    value: '12',
    icon: Clock,
    color: 'amber',
    bg: 'bg-amber-100',
    text: 'text-amber-600',
  },
  {
    label: 'Maintenance Due',
    value: '7',
    icon: Wrench,
    color: 'red',
    bg: 'bg-red-100',
    text: 'text-red-600',
  },
];

export default function Dashboard({ user }: DashboardProps) {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="p-6 space-y-6"
    >
      {/* Module header */}
      <motion.div
        variants={itemVariants}
        className="bg-gradient-to-r from-blue-600 to-cyan-700 rounded-2xl p-8 text-white shadow-xl"
      >
        <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
        <p className="text-blue-100">
          Welcome back, {user.name}. Here's your overview.
        </p>
      </motion.div>

      {/* Stats cards */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {STATS.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} hover className="p-5">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-lg ${stat.bg} ${stat.text}`}>
                  <Icon size={20} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-800">{stat.value}</p>
                  <p className="text-xs text-gray-600">{stat.label}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </motion.div>

      {/* Bottom two cards */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-1 md:grid-cols-2 gap-6"
      >
        <Card className="p-6">
          <div className="mb-4">
            <h3 className="text-lg font-bold text-gray-800">Recent Activity</h3>
            <p className="text-sm text-gray-500">Latest updates and events</p>
          </div>
          <ComingSoon />
        </Card>

        <Card className="p-6">
          <div className="mb-4">
            <h3 className="text-lg font-bold text-gray-800">Quick Actions</h3>
            <p className="text-sm text-gray-500">Frequent tasks and shortcuts</p>
          </div>
          <ComingSoon />
        </Card>
      </motion.div>
    </motion.div>
  );
}
