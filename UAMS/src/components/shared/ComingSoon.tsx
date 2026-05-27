import { motion } from 'framer-motion';
import { Wrench } from 'lucide-react';

export default function ComingSoon() {
  return (
    <div className="flex items-center justify-center py-20">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center bg-white rounded-2xl border border-gray-200 shadow-sm p-16 max-w-md w-full"
      >
        <motion.div
          animate={{
            scale: [1, 1.08, 1],
            rotate: [0, -5, 5, 0],
          }}
          transition={{
            duration: 2.5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="inline-flex items-center justify-center w-20 h-20 bg-blue-100 text-blue-600 rounded-2xl mb-6"
        >
          <Wrench size={36} />
        </motion.div>

        <h3 className="text-2xl font-bold text-gray-800 mb-3">Coming Soon</h3>
        <p className="text-sm text-gray-500 mb-8 leading-relaxed">
          This module is currently under development.<br />Check back soon.
        </p>

        <div className="flex justify-center gap-2">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                delay: i * 0.3,
                ease: 'easeInOut',
              }}
              className="w-2 h-2 bg-blue-400 rounded-full"
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
}
