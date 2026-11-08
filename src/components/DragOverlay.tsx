import React from 'react';
import { useDragContext } from '../context/DragContext';
import { QUADRANTS } from '../quadrantConfig';

export const DragOverlay: React.FC = () => {
  const { dragState } = useDragContext();

  if (!dragState.isDragging || !dragState.taskTitle || dragState.dragX === 0) {
    return null;
  }

  const quadConfig = QUADRANTS.find((q) => q.id === dragState.sourceQuadrant);

  return (
    <div
      className="fixed pointer-events-none z-[9999] transition-transform duration-75 ease-out select-none"
      style={{
        left: `${dragState.dragX - 60}px`,
        top: `${dragState.dragY - 30}px`,
        width: `${Math.min(dragState.cardWidth || 280, 320)}px`,
      }}
    >
      <div
        className={`rounded-xl border p-3 shadow-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md transform rotate-2 scale-105 border-indigo-400 dark:border-indigo-500`}
      >
        <div className="flex items-center gap-2">
          <span
            className={`w-2.5 h-2.5 rounded-full ${quadConfig?.color.indicator || 'bg-indigo-500'}`}
          />
          <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">
            {dragState.taskTitle}
          </p>
        </div>
      </div>
    </div>
  );
};
