import React, { useEffect } from 'react';
import { Undo2, X } from 'lucide-react';
import { Task } from '../types';

interface ToastProps {
  item: {
    task: Task;
    action: 'completed' | 'deleted';
  } | null;
  onUndo: () => void;
  onDismiss: () => void;
}

export const Toast: React.FC<ToastProps> = ({ item, onUndo, onDismiss }) => {
  useEffect(() => {
    if (!item) return;
    const timer = setTimeout(() => {
      onDismiss();
    }, 4500);
    return () => clearTimeout(timer);
  }, [item, onDismiss]);

  if (!item) return null;

  const isCompleted = item.action === 'completed';

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 p-3 pr-4 shadow-xl backdrop-blur-md animate-in slide-in-from-bottom-3 max-w-sm">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">
          {isCompleted ? 'Задача выполнена' : 'Задача удалена'}
        </p>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
          {item.task.title}
        </p>
      </div>

      <button
        type="button"
        onClick={onUndo}
        className="flex items-center gap-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-2.5 py-1 text-xs font-semibold text-slate-800 dark:text-slate-200 transition cursor-pointer"
      >
        <Undo2 className="w-3.5 h-3.5" />
        <span>Отменить</span>
      </button>

      <button
        type="button"
        onClick={onDismiss}
        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
