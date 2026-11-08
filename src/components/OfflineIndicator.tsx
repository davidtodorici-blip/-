import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-xl bg-slate-900/90 text-white dark:bg-white/95 dark:text-slate-950 px-3.5 py-2 text-xs font-medium shadow-xl backdrop-blur-md animate-in slide-in-from-bottom-2">
      <WifiOff className="w-3.5 h-3.5 text-amber-400 dark:text-amber-600 animate-pulse" />
      <span>Оффлайн режим — данные сохранены локально</span>
    </div>
  );
};
