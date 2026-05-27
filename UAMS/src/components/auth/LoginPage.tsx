// import { useState } from 'react';
// import { motion, AnimatePresence } from 'framer-motion';
// import { Mail, Lock, Eye, EyeOff, ChevronDown, ChevronUp, Zap, Shield, Activity, Users, BarChart3, Wrench, type LucideIcon } from 'lucide-react';
// import AdaniLogo from '../ui/AdaniLogo';
// import { User, UserRole } from '../../types';
// import { DUMMY_USERS } from '../../data/mockUsers';
// import Button from '../ui/Button';
// import Input from '../ui/Input';

// interface LoginPageProps {
//   onLogin: (user: User) => void;
// }

// const ROLE_ICONS: Record<UserRole, LucideIcon> = {
//   admin: Shield,
//   engineer: Wrench,
//   approver: Zap,
//   reviewer: Activity,
//   leadership: BarChart3,
// };

// const ROLE_COLORS: Record<UserRole, string> = {
//   admin: 'text-blue-600',
//   engineer: 'text-green-600',
//   approver: 'text-amber-600',
//   reviewer: 'text-purple-600',
//   leadership: 'text-cyan-600',
// };

// const DEMO_CREDENTIALS = [
//   { role: 'Admin', email: 'admin@adani.com', password: 'admin123' },
//   { role: 'Engineer', email: 'engineer@adani.com', password: 'eng123' },
//   { role: 'Approver', email: 'approver@adani.com', password: 'app123' },
//   { role: 'Reviewer', email: 'reviewer@adani.com', password: 'rev123' },
//   { role: 'Leadership', email: 'leadership@adani.com', password: 'lead123' },
// ];

// export default function LoginPage({ onLogin }: LoginPageProps) {
//   const [email, setEmail] = useState('');
//   const [password, setPassword] = useState('');
//   const [showPassword, setShowPassword] = useState(false);
//   const [error, setError] = useState('');
//   const [showDemo, setShowDemo] = useState(false);
//   const [shakeKey, setShakeKey] = useState(0);

//   const handleSubmit = (e: React.FormEvent) => {
//     e.preventDefault();
//     const user = DUMMY_USERS.find(
//       (u) => u.email === email.trim().toLowerCase() && u.password === password
//     );
//     if (user) {
//       onLogin(user);
//     } else {
//       setError('Invalid email or password. Try the demo credentials below.');
//       setShakeKey((k) => k + 1);
//     }
//   };

//   const fillCredentials = (cred: { email: string; password: string }) => {
//     setEmail(cred.email);
//     setPassword(cred.password);
//     setError('');
//   };

//   return (
//     <div className="min-h-screen flex">
//       {/* Left branded panel */}
//       <motion.div
//         initial={{ opacity: 0, x: -40 }}
//         animate={{ opacity: 1, x: 0 }}
//         transition={{ duration: 0.6, ease: 'easeOut' }}
//         className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-900 via-blue-800 to-cyan-800 relative overflow-hidden flex-col justify-between p-12"
//       >
//         {/* Background pattern */}
//         <div className="absolute inset-0 overflow-hidden">
//           {[...Array(6)].map((_, i) => (
//             <motion.div
//               key={i}
//               animate={{
//                 scale: [1, 1.1, 1],
//                 opacity: [0.03, 0.06, 0.03],
//               }}
//               transition={{
//                 duration: 4 + i,
//                 repeat: Infinity,
//                 delay: i * 0.8,
//                 ease: 'easeInOut',
//               }}
//               style={{
//                 position: 'absolute',
//                 width: `${200 + i * 80}px`,
//                 height: `${200 + i * 80}px`,
//                 borderRadius: '50%',
//                 border: '1px solid rgba(255,255,255,0.15)',
//                 top: `${10 + i * 8}%`,
//                 left: `${-10 + i * 5}%`,
//               }}
//             />
//           ))}
//           {/* Grid lines */}
//           <div
//             className="absolute inset-0"
//             style={{
//               backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
//               backgroundSize: '60px 60px',
//             }}
//           />
//         </div>

//         {/* Logo */}
//         <div className="relative z-10">
//           <AdaniLogo variant="white" className="h-8 w-auto mb-3" />
//           <div className="h-0.5 w-16 bg-cyan-400 rounded-full" />
//         </div>

//         {/* Center content */}
//         <div className="relative z-10">
//           <motion.h1
//             initial={{ opacity: 0, y: 20 }}
//             animate={{ opacity: 1, y: 0 }}
//             transition={{ delay: 0.3, duration: 0.6 }}
//             className="text-4xl font-bold text-white leading-tight mb-4"
//           >
//             Utilities &<br />Maintenance<br />Portal
//           </motion.h1>
//           <motion.p
//             initial={{ opacity: 0, y: 20 }}
//             animate={{ opacity: 1, y: 0 }}
//             transition={{ delay: 0.45, duration: 0.6 }}
//             className="text-blue-200 text-base leading-relaxed max-w-xs"
//           >
//             Streamlined management of utility systems and maintenance operations across all Adani facilities.
//           </motion.p>

//           <motion.div
//             initial={{ opacity: 0, y: 20 }}
//             animate={{ opacity: 1, y: 0 }}
//             transition={{ delay: 0.6, duration: 0.6 }}
//             className="mt-10 grid grid-cols-2 gap-4"
//           >
//             {[
//               { icon: Activity, label: 'Real-time Monitoring' },
//               { icon: Shield, label: 'Role-based Access' },
//               { icon: Zap, label: 'Smart Workflows' },
//               { icon: Users, label: 'Team Collaboration' },
//             ].map(({ icon: Icon, label }) => (
//               <div key={label} className="flex items-center gap-2.5">
//                 <div className="w-7 h-7 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0">
//                   <Icon size={14} className="text-cyan-300" />
//                 </div>
//                 <span className="text-blue-100 text-xs font-medium">{label}</span>
//               </div>
//             ))}
//           </motion.div>
//         </div>

//         {/* Bottom info */}
//         <div className="relative z-10">
//           <p className="text-blue-300 text-xs">© 2026 Adani Group. All rights reserved.</p>
//         </div>
//       </motion.div>

//       {/* Right login panel */}
//       <div className="flex-1 flex items-center justify-center p-6 bg-gray-50">
//         <motion.div
//           key={shakeKey}
//           initial={{ opacity: 0, y: 30 }}
//           animate={
//             shakeKey > 0
//               ? { opacity: 1, y: 0, x: [0, -10, 10, -8, 8, -4, 4, 0] }
//               : { opacity: 1, y: 0 }
//           }
//           transition={{ duration: shakeKey > 0 ? 0.5 : 0.5, ease: 'easeOut' }}
//           className="w-full max-w-md"
//         >
//           {/* Mobile logo */}
//           <div className="lg:hidden flex items-center gap-3 mb-8">
//             <AdaniLogo variant="color" className="h-7 w-auto" />
//             <div className="w-px h-5 bg-gray-200" />
//             <p className="text-xs text-gray-500">U&M Portal</p>
//           </div>

//           <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
//             <div className="mb-8">
//               <h2 className="text-2xl font-bold text-gray-800 mb-1">Welcome back</h2>
//               <p className="text-sm text-gray-500">Sign in to your account to continue</p>
//             </div>

//             <form onSubmit={handleSubmit} className="space-y-5">
//               <Input
//                 label="Email Address"
//                 type="email"
//                 value={email}
//                 onChange={(e) => { setEmail(e.target.value); setError(''); }}
//                 placeholder="name@adani.com"
//                 icon={<Mail size={16} />}
//                 error={error ? ' ' : undefined}
//                 required
//               />

//               <Input
//                 label="Password"
//                 type={showPassword ? 'text' : 'password'}
//                 value={password}
//                 onChange={(e) => { setPassword(e.target.value); setError(''); }}
//                 placeholder="Enter your password"
//                 icon={<Lock size={16} />}
//                 rightElement={
//                   <button type="button" onClick={() => setShowPassword(!showPassword)} className="cursor-pointer">
//                     {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
//                   </button>
//                 }
//                 required
//               />

//               <AnimatePresence>
//                 {error && (
//                   <motion.p
//                     initial={{ opacity: 0, height: 0 }}
//                     animate={{ opacity: 1, height: 'auto' }}
//                     exit={{ opacity: 0, height: 0 }}
//                     className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2"
//                   >
//                     {error}
//                   </motion.p>
//                 )}
//               </AnimatePresence>

//               <Button type="submit" variant="primary" size="lg" className="w-full mt-2">
//                 Sign In
//               </Button>
//             </form>

//             {/* Demo credentials */}
//             <div className="mt-6">
//               <button
//                 type="button"
//                 onClick={() => setShowDemo(!showDemo)}
//                 className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg text-sm text-gray-600 font-medium transition-colors"
//               >
//                 <span>Demo Credentials</span>
//                 {showDemo ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
//               </button>

//               <AnimatePresence>
//                 {showDemo && (
//                   <motion.div
//                     initial={{ opacity: 0, height: 0 }}
//                     animate={{ opacity: 1, height: 'auto' }}
//                     exit={{ opacity: 0, height: 0 }}
//                     transition={{ duration: 0.25 }}
//                     className="overflow-hidden"
//                   >
//                     <div className="mt-2 border border-gray-200 rounded-lg overflow-hidden">
//                       <table className="w-full text-xs">
//                         <thead>
//                           <tr className="bg-gray-50 border-b border-gray-200">
//                             <th className="text-left px-3 py-2 font-semibold text-gray-600">Role</th>
//                             <th className="text-left px-3 py-2 font-semibold text-gray-600">Email</th>
//                             <th className="text-left px-3 py-2 font-semibold text-gray-600">Password</th>
//                           </tr>
//                         </thead>
//                         <tbody>
//                           {DEMO_CREDENTIALS.map((cred, i) => {
//                             const role = cred.role.toLowerCase() as UserRole;
//                             const Icon = ROLE_ICONS[role];
//                             return (
//                               <motion.tr
//                                 key={cred.role}
//                                 initial={{ opacity: 0, x: -10 }}
//                                 animate={{ opacity: 1, x: 0 }}
//                                 transition={{ delay: i * 0.05 }}
//                                 onClick={() => fillCredentials(cred)}
//                                 className="border-b border-gray-100 last:border-0 hover:bg-blue-50 cursor-pointer transition-colors"
//                               >
//                                 <td className="px-3 py-2">
//                                   <div className="flex items-center gap-1.5">
//                                     <Icon size={12} className={ROLE_COLORS[role]} />
//                                     <span className="font-medium text-gray-700">{cred.role}</span>
//                                   </div>
//                                 </td>
//                                 <td className="px-3 py-2 text-gray-600 font-mono">{cred.email}</td>
//                                 <td className="px-3 py-2 text-gray-600 font-mono">{cred.password}</td>
//                               </motion.tr>
//                             );
//                           })}
//                         </tbody>
//                       </table>
//                       <p className="text-center text-xs text-gray-400 py-1.5 bg-gray-50 border-t border-gray-100">
//                         Click a row to auto-fill
//                       </p>
//                     </div>
//                   </motion.div>
//                 )}
//               </AnimatePresence>
//             </div>
//           </div>
//         </motion.div>
//       </div>
//     </div>
//   );
// }




import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, ChevronDown, ChevronUp, Zap, Shield, Activity, Users, BarChart3, Wrench, type LucideIcon } from 'lucide-react';
import AdaniLogo from '../ui/AdaniLogo';
import { User, UserRole } from '../../types';
import { api, setToken, setStoredUser } from '../../lib/api';
import Button from '../ui/Button';
import Input from '../ui/Input';

interface LoginPageProps {
  onLogin: (user: User) => void;
}

const ROLE_ICONS: Record<string, LucideIcon> = {
  admin: Shield,
  engineer: Wrench,
  approver: Zap,
  reviewer: Activity,
  leadership: BarChart3,
  operator: Users,
};

const ROLE_COLORS: Record<string, string> = {
  admin: 'text-blue-600',
  engineer: 'text-green-600',
  approver: 'text-amber-600',
  reviewer: 'text-purple-600',
  leadership: 'text-cyan-600',
  operator: 'text-gray-600',
};

const DEMO_CREDENTIALS = [
  { role: 'Admin', email: 'priya@adani.com', password: 'admin123' },
  { role: 'Engineer', email: 'vikram@adani.com', password: 'operator123' },
  { role: 'Approver', email: 'mahendra@adani.com', password: 'admin123' },
  { role: 'Reviewer', email: 'ankit@adani.com', password: 'operator123' },
  { role: 'Operator', email: 'rajesh@adani.com', password: 'operator123' },
];

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDemo, setShowDemo] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { token, user: apiUser } = await api.auth.login(email.trim().toLowerCase(), password);
      setToken(token);
      // Map ApiUser → local User type
      const user: User = {
        id: apiUser.id,
        email: apiUser.email,
        password: '',
        role: apiUser.role as UserRole,
        name: apiUser.name,
        avatar: apiUser.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2),
      };
      setStoredUser(user);
      onLogin(user);
    } catch {
      setError('Invalid email or password. Try the demo credentials below.');
      setShakeKey((k) => k + 1);
    } finally {
      setLoading(false);
    }
  };

  const fillCredentials = (cred: { email: string; password: string }) => {
    setEmail(cred.email);
    setPassword(cred.password);
    setError('');
  };

  return (
    <div className="min-h-screen flex">
      {/* Left branded panel */}
      <motion.div
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-900 via-blue-800 to-cyan-800 relative overflow-hidden flex-col justify-between p-12"
      >
        {/* Background pattern */}
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              animate={{
                scale: [1, 1.1, 1],
                opacity: [0.03, 0.06, 0.03],
              }}
              transition={{
                duration: 4 + i,
                repeat: Infinity,
                delay: i * 0.8,
                ease: 'easeInOut',
              }}
              style={{
                position: 'absolute',
                width: `${200 + i * 80}px`,
                height: `${200 + i * 80}px`,
                borderRadius: '50%',
                border: '1px solid rgba(255,255,255,0.15)',
                top: `${10 + i * 8}%`,
                left: `${-10 + i * 5}%`,
              }}
            />
          ))}
          {/* Grid lines */}
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
              backgroundSize: '60px 60px',
            }}
          />
        </div>

        {/* Logo */}
        <div className="relative z-10">
          <AdaniLogo variant="white" className="h-8 w-auto mb-3" />
          <div className="h-0.5 w-16 bg-cyan-400 rounded-full" />
        </div>

        {/* Center content */}
        <div className="relative z-10">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="text-4xl font-bold text-white leading-tight mb-4"
          >
            Utility<br />Management<br />System
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.6 }}
            className="text-blue-200 text-base leading-relaxed max-w-xs"
          >
            Streamlined management of utility systems and maintenance operations across all Adani facilities.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="mt-10 grid grid-cols-2 gap-4"
          >
            {[
              { icon: Activity, label: 'Real-time Monitoring' },
              { icon: Shield, label: 'Role-based Access' },
              { icon: Zap, label: 'Smart Workflows' },
              { icon: Users, label: 'Team Collaboration' },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2.5">
                <div className="w-7 h-7 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Icon size={14} className="text-cyan-300" />
                </div>
                <span className="text-blue-100 text-xs font-medium">{label}</span>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Bottom info */}
        <div className="relative z-10">
          <p className="text-blue-300 text-xs">© 2026 Adani Group. All rights reserved.</p>
        </div>
      </motion.div>

      {/* Right login panel */}
      <div className="flex-1 flex items-center justify-center p-6 bg-gray-50">
        <motion.div
          key={shakeKey}
          initial={{ opacity: 0, y: 30 }}
          animate={
            shakeKey > 0
              ? { opacity: 1, y: 0, x: [0, -10, 10, -8, 8, -4, 4, 0] }
              : { opacity: 1, y: 0 }
          }
          transition={{ duration: shakeKey > 0 ? 0.5 : 0.5, ease: 'easeOut' }}
          className="w-full max-w-md"
        >
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <AdaniLogo variant="color" className="h-7 w-auto" />
            <div className="w-px h-5 bg-gray-200" />
            <p className="text-xs text-gray-500">Utility Management System</p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-1">Welcome back</h2>
              <p className="text-sm text-gray-500">Sign in to your account to continue</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <Input
                label="Email Address"
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(''); }}
                placeholder="name@adani.com"
                icon={<Mail size={16} />}
                error={error ? ' ' : undefined}
                required
              />

              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                placeholder="Enter your password"
                icon={<Lock size={16} />}
                rightElement={
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="cursor-pointer">
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                }
                required
              />

              <AnimatePresence>
                {error && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2"
                  >
                    {error}
                  </motion.p>
                )}
              </AnimatePresence>

              <Button type="submit" variant="primary" size="lg" className="w-full mt-2" disabled={loading}>
                {loading ? 'Signing in…' : 'Sign In'}
              </Button>
            </form>

            {/* Demo credentials */}
            <div className="mt-6">
              <button
                type="button"
                onClick={() => setShowDemo(!showDemo)}
                className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg text-sm text-gray-600 font-medium transition-colors"
              >
                <span>Demo Credentials</span>
                {showDemo ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>

              <AnimatePresence>
                {showDemo && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-2 border border-gray-200 rounded-lg overflow-hidden">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-200">
                            <th className="text-left px-3 py-2 font-semibold text-gray-600">Role</th>
                            <th className="text-left px-3 py-2 font-semibold text-gray-600">Email</th>
                            <th className="text-left px-3 py-2 font-semibold text-gray-600">Password</th>
                          </tr>
                        </thead>
                        <tbody>
                          {DEMO_CREDENTIALS.map((cred, i) => {
                            const role = cred.role.toLowerCase() as UserRole;
                            const Icon = ROLE_ICONS[role];
                            return (
                              <motion.tr
                                key={cred.role}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.05 }}
                                onClick={() => fillCredentials(cred)}
                                className="border-b border-gray-100 last:border-0 hover:bg-blue-50 cursor-pointer transition-colors"
                              >
                                <td className="px-3 py-2">
                                  <div className="flex items-center gap-1.5">
                                    <Icon size={12} className={ROLE_COLORS[role]} />
                                    <span className="font-medium text-gray-700">{cred.role}</span>
                                  </div>
                                </td>
                                <td className="px-3 py-2 text-gray-600 font-mono">{cred.email}</td>
                                <td className="px-3 py-2 text-gray-600 font-mono">{cred.password}</td>
                              </motion.tr>
                            );
                          })}
                        </tbody>
                      </table>
                      <p className="text-center text-xs text-gray-400 py-1.5 bg-gray-50 border-t border-gray-100">
                        Click a row to auto-fill
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
