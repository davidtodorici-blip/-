import React from 'react';
import { QuadrantConfig, Task } from '../types';
import { TaskCard } from './TaskCard';
import { useDragContext } from '../context/DragContext';

interface QuadrantProps {
  config: QuadrantConfig;
  tasks: Task[];
  onToggleComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onQuickAdd?: (quadrantId: QuadrantConfig['id']) => void;
  onToggleCalendarSync?: (id: string) => void;
  onSetAgeDays?: (id: string, days: number) => void;
}

export const Quadrant: React.FC<QuadrantProps> = ({
  config,
  tasks,
  onToggleComplete,
  onDelete,
  onToggleCalendarSync,
  onSetAgeDays,
}) => {
  const { dragState, setHoveredQuadrant, onDropTaskToQuadrant } = useDragContext();

  const isDropTarget =
    dragState.isDragging && dragState.hoveredQuadrant === config.id;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setHoveredQuadrant(config.id);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only clear if leaving the quadrant container
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      if (dragState.hoveredQuadrant === config.id) {
        setHoveredQuadrant(null);
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    onDropTaskToQuadrant(config.id);
  };

  return (
    <div
      data-quadrant-id={config.id}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative flex flex-col h-full rounded-2xl border transition-all duration-200 overflow-hidden ${
        config.color.bgLight
      } ${config.color.bgDark} ${
        isDropTarget
          ? 'ring-2 ring-indigo-500 border-indigo-500 scale-[0.99] shadow-lg'
          : `${config.color.borderLight} ${config.color.borderDark}`
      }`}
    >
      {/* Top Header of Quadrant */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-inherit bg-white/60 dark:bg-slate-900/60 backdrop-blur-xs select-none">
        <div className="flex items-center gap-2.5 min-w-0">
          <span
            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white shadow-xs ${config.color.indicator}`}
          >
            {config.num}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                {config.title}
              </h2>
            </div>
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              {config.subtitle}
            </p>
          </div>
        </div>

        {/* Task Counter Badge */}
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${config.color.badgeBgLight} ${config.color.badgeBgDark} ${config.color.badgeText}`}
        >
          {tasks.length}
        </span>
      </div>

      {/* Independent Scrollable Task List */}
      <div className="flex-1 p-3 overflow-y-auto space-y-2 min-h-[140px] max-h-[calc(100vh-280px)] md:max-h-none scrollbar-thin">
        {tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[120px] text-center p-4 border border-dashed rounded-xl border-slate-200/80 dark:border-slate-800/80">
            <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">
              Нет задач
            </p>
            <p className="text-[11px] text-slate-400/80 dark:text-slate-600 mt-0.5">
              Перетащите сюда или добавьте сверху
            </p>
          </div>
        ) : (
          tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              quadrantId={config.id}
              onToggleComplete={onToggleComplete}
              onDelete={onDelete}
              onToggleCalendarSync={onToggleCalendarSync}
              onSetAgeDays={onSetAgeDays}
            />
          ))
        )}
      </div>
    </div>
  );
};
