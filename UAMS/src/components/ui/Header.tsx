import { motion } from 'framer-motion';
import { Bell, Menu } from 'lucide-react';

interface HeaderProps {
  title: string;
  onMenuToggle: () => void;
}

export default function Header({ title, onMenuToggle }: HeaderProps) {
  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="bg-white border-b border-gray-200 px-4 md:px-6 py-4 flex items-center justify-between flex-shrink-0"
    >
      <div className="flex items-center gap-3">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={onMenuToggle}
          className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors md:hidden"
        >
          <Menu size={20} />
        </motion.button>
        <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
      </div>

      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        className="relative p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <Bell size={20} />
        <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
      </motion.button>
    </motion.header>
  );
}
