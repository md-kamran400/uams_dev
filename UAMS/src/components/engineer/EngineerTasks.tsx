import { useState, useEffect } from 'react';
import { Clock, ChevronRight, CheckCircle2 } from 'lucide-react';
import { User } from '../../types';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { api } from '../../lib/api';
import EngineerFormWizard from './EngineerFormWizard';

interface EngineerTasksProps {
  user: User;
}

export default function EngineerTasks({ user }: EngineerTasksProps) {
  const [assets, setAssets] = useState<any[]>([]);
  const [utilityTypes, setUtilityTypes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  
  const [activeTask, setActiveTask] = useState<{asset: any, utilityType: any} | null>(null);

  useEffect(() => {
    async function loadTasks() {
      try {
        const [allAssets, allUtilityTypes] = await Promise.all([
          api.assets.list(),
          api.utilityTypes.list(),
        ]);
        
        const assignedIds = user.assignedUtilityIds || [];
        const myAssets = allAssets.filter(a => assignedIds.includes(a.utilityTypeId));
        
        setAssets(myAssets);
        setUtilityTypes(allUtilityTypes);
      } catch (e) {
        console.error('Failed to load assigned tasks', e);
      } finally {
        setIsLoading(false);
      }
    }
    loadTasks();
  }, [user.assignedUtilityIds]);

  if (activeTask) {
    return (
      <EngineerFormWizard 
        user={user} 
        asset={activeTask.asset} 
        utilityType={activeTask.utilityType} 
        onClose={() => setActiveTask(null)}
        onComplete={() => {
          setActiveTask(null);
          setSuccessMsg('Form submitted successfully!');
          setTimeout(() => setSuccessMsg(null), 3000);
        }}
      />
    );
  }

  if (isLoading) {
    return <div className="text-center py-20 text-gray-500">Loading your tasks...</div>;
  }

  return (
    <div className="space-y-6">
      {successMsg && (
        <div className="p-4 bg-green-50 border border-green-200 text-green-700 rounded-xl text-sm font-medium flex items-center">
          <CheckCircle2 size={18} className="mr-2" />
          {successMsg}
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {assets.length === 0 && (
          <div className="col-span-1 md:col-span-2 text-center py-20 text-gray-500 bg-white rounded-2xl border border-gray-200">
            You do not have any assigned assets.
          </div>
        )}
        {assets.map(asset => {
          const ut = utilityTypes.find(t => t.id === asset.utilityTypeId);
          if (!ut) return null;
          
          return (
            <div key={asset.id} className="bg-white rounded-2xl border border-blue-100 p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex justify-between items-start mb-4">
                <Badge variant="warning">
                  Pending Reading
                </Badge>
                <span className="text-xs font-medium text-gray-400 flex items-center">
                  <Clock size={12} className="mr-1" /> Today
                </span>
              </div>
              
              <h3 className="text-lg font-bold text-gray-800">{asset.name || asset.serial || `AST-${asset.id.substring(0,6)}`}</h3>
              <p className="text-sm text-gray-500 mt-1 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span> {ut.name}
              </p>
              
              <div className="mt-6 flex justify-end">
                <Button 
                  variant="primary" 
                  size="sm" 
                  className="w-full justify-center md:w-auto"
                  onClick={() => setActiveTask({ asset, utilityType: ut })}
                >
                  Start Form <ChevronRight size={16} className="ml-1" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
