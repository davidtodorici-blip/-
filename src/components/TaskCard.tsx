import React, { useRef, useState } from 'react';
import { Task, QuadrantId } from '../types';
import { Check, X, GripVertical, Calendar, ExternalLink, Clock } from 'lucide-react';
import { useDragContext } from '../context/DragContext';
import { getTaskAgingStyle } from '../utils/agingColors';
import { createGoogleCalendarUrl } from '../utils/calendar';

interface TaskCardProps {
  task: Task;
  quadrantId: QuadrantId;
  onToggleComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onToggleCalendarSync?: (id: string) => void;
  onSetAgeDays?: (id: string, days: number) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  quadrantId,
  onToggleComplete,
  onDelete,
  onToggleCalendarSync,
  onSetAgeDays,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const { startTouchDrag, startHtmlDrag, endHtmlDrag, dragState } = useDragContext();
  const [showAgeMenu, setShowAgeMenu] = useState(false);

  const isBeingDragged = dragState.taskId === task.id;
  const isDarkMode = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');

  // Dynamic aging style (interpolates color over 7 days)
  const agingStyle = getTaskAgingStyle(quadrantId, task.createdAt, isDarkMode);

  const formatDueDate = (dateStr?: string) => {
    if (!dateStr) return null;
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return null;

      const now = new Date();
      const isToday =
        date.getDate() === now.getDate() &&
        date.getMonth() === now.getMonth() &&
        date.getFullYear() === now.getFullYear();

      const timeStr = date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
      if (isToday) {
        return `Сегодня, ${timeStr}`;
      }
      const dayStr = date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
      return `${dayStr}, ${timeStr}`;
    } catch {
      return null;
    }
  };

  const formattedDate = formatDueDate(task.dueDate);

  const handleOpenGoogleCalendar = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = createGoogleCalendarUrl(task);
    window.open(url, '_blank', 'noopener,noreferrer');
    if (onToggleCalendarSync) {
      onToggleCalendarSync(task.id);
    }
  };

  return (
    <div
      ref={cardRef}
      draggable={!task.completed}
      onDragStart={(e) => startHtmlDrag(task.id, quadrantId, e)}
      onDragEnd={endHtmlDrag}
      style={{
        backgroundColor: task.completed ? undefined : agingStyle.backgroundColor,
        borderColor: task.completed ? undefined : agingStyle.borderColor,
      }}
      className={`group relative flex items-start gap-2.5 rounded-xl border p-3 shadow-xs transition-all duration-300 select-none ${
        isBeingDragged ? 'opacity-30 scale-95 border-dashed border-indigo-400' : 'hover:shadow-md'
      } ${
        task.isFading
          ? 'opacity-0 scale-95 max-h-0 p-0 my-0 overflow-hidden border-transparent'
          : ''
      } ${task.completed ? 'bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800' : ''}`}
    >
      {/* Touch & Mouse Drag Handle */}
      <button
        type="button"
        title="Перетащить задачу"
        aria-label="Перетащить задачу"
        className="mt-0.5 cursor-grab active:cursor-grabbing text-slate-400/80 hover:text-slate-700 dark:hover:text-slate-200 touch-none transition-colors p-0.5 rounded"
        onTouchStart={(e) => {
          if (cardRef.current && !task.completed) {
            startTouchDrag(task.id, task.title, quadrantId, e, cardRef.current);
          }
        }}
        onPointerDown={(e) => {
          if (e.pointerType === 'touch' && cardRef.current && !task.completed) {
            startTouchDrag(task.id, task.title, quadrantId, e, cardRef.current);
          }
        }}
      >
        <GripVertical className="w-4 h-4" />
      </button>

      {/* Completion Checkbox */}
      <button
        type="button"
        onClick={() => onToggleComplete(task.id)}
        title={task.completed ? 'Отменить выполнение' : 'Завершить задачу (исчезнет через 1 сек)'}
        aria-label="Отметить выполненной"
        className={`mt-0.5 relative flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-all duration-200 ${
          task.completed
            ? 'bg-emerald-500 border-emerald-500 text-white scale-105'
            : 'border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-400 bg-white/70 dark:bg-slate-900/70'
        }`}
      >
        {task.completed && <Check className="w-3.5 h-3.5 stroke-[3] animate-in zoom-in-50 duration-200" />}
      </button>

      {/* Title & Metadata */}
      <div className="flex-1 min-w-0 pr-1">
        <p
          className={`text-sm leading-snug break-words transition-all duration-300 ${
            task.completed
              ? 'line-through text-slate-400 dark:text-slate-500'
              : agingStyle.textColor
          }`}
        >
          {task.title}
        </p>

        {/* Badges line: age indicator, tendency, calendar */}
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs">
          {/* Due date if any */}
          {formattedDate && (
            <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 bg-black/5 dark:bg-white/5 px-1.5 py-0.5 rounded">
              <Calendar className="w-3 h-3 text-slate-400" />
              <span>{formattedDate}</span>
            </div>
          )}

          {/* Age pill & simulator toggle */}
          <button
            type="button"
            onClick={() => setShowAgeMenu((prev) => !prev)}
            title="Возраст задачи (нажмите для проверки старения цветов)"
            className="flex items-center gap-1 text-[10px] font-medium text-slate-500 dark:text-slate-400 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 px-1.5 py-0.5 rounded transition cursor-pointer"
          >
            <Clock className="w-2.5 h-2.5 opacity-60" />
            <span>{agingStyle.ageLabel}</span>
            {agingStyle.tendencyLabel && (
              <span className="font-semibold text-rose-600 dark:text-rose-400">
                {agingStyle.tendencyLabel}
              </span>
            )}
          </button>

          {/* 1-Tap Google Calendar Sync button */}
          <button
            type="button"
            onClick={handleOpenGoogleCalendar}
            title="Добавить в Google Календарь на Pixel"
            className="flex items-center gap-1 text-[10px] font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/50 px-1.5 py-0.5 rounded transition cursor-pointer"
          >
            <Calendar className="w-2.5 h-2.5" />
            <span>Календарь</span>
            <ExternalLink className="w-2.5 h-2.5 opacity-60" />
          </button>
        </div>

        {/* Quick Aging Simulator Popover for Testing */}
        {showAgeMenu && onSetAgeDays && (
          <div className="mt-2 p-2 rounded-lg bg-white/95 dark:bg-slate-800/95 border border-slate-200 dark:border-slate-700 shadow-md flex items-center gap-1 animate-in fade-in">
            <span className="text-[10px] text-slate-400 mr-1">Тест градиента:</span>
            {[0, 2, 4, 7].map((days) => (
              <button
                key={days}
                type="button"
                onClick={() => {
                  onSetAgeDays(task.id, days);
                  setShowAgeMenu(false);
                }}
                className="px-1.5 py-0.5 text-[10px] rounded bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 font-medium"
              >
                {days === 0 ? '0 дн (белая)' : `${days} дн`}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Fast Delete Button (X) */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDelete(task.id);
        }}
        title="Удалить задачу"
        aria-label="Удалить задачу"
        className="text-slate-400/80 hover:text-rose-500 dark:hover:text-rose-400 transition-colors p-1 rounded-md opacity-60 group-hover:opacity-100 focus:opacity-100"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
