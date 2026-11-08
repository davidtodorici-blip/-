import React, { useState } from 'react';
import { Task, QuadrantId } from '../types';
import { QUADRANTS } from '../quadrantConfig';
import { Plus, Check, Mic, Calendar, Sparkles, LayoutGrid, X } from 'lucide-react';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { getTaskAgingStyle } from '../utils/agingColors';

interface PixelWidgetProps {
  tasks: Task[];
  onAddTask: (title: string, quadrant: QuadrantId, dueDate?: string) => void;
  onToggleComplete: (id: string) => void;
  onOpenFullApp: () => void;
}

export const PixelWidget: React.FC<PixelWidgetProps> = ({
  tasks,
  onAddTask,
  onToggleComplete,
  onOpenFullApp,
}) => {
  const [activeTab, setActiveTab] = useState<QuadrantId>('q1');
  const [quickTitle, setQuickTitle] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [isGeminiParsing, setIsGeminiParsing] = useState(false);

  const { isListening, isSupported, toggleListening } = useSpeechRecognition((text) => {
    setQuickTitle(text);
  });

  const handleQuickAdd = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!quickTitle.trim()) return;

    let targetQuad = activeTab;
    let cleanTitle = quickTitle.trim();

    // Quick AI check if contains priority keywords
    if (cleanTitle.toLowerCase().includes('сделать') || cleanTitle.toLowerCase().includes('срочно')) {
      targetQuad = 'q1';
    } else if (cleanTitle.toLowerCase().includes('запланировать') || cleanTitle.toLowerCase().includes('план')) {
      targetQuad = 'q2';
    } else if (cleanTitle.toLowerCase().includes('делегировать') || cleanTitle.toLowerCase().includes('поручить')) {
      targetQuad = 'q3';
    } else if (cleanTitle.toLowerCase().includes('отложить') || cleanTitle.toLowerCase().includes('отбросить')) {
      targetQuad = 'q4';
    }

    onAddTask(cleanTitle, targetQuad);
    setQuickTitle('');
    setIsAdding(false);
  };

  const currentQuad = QUADRANTS.find((q) => q.id === activeTab)!;
  const filteredTasks = tasks.filter((t) => t.quadrant === activeTab && !t.completed);

  const todayStr = new Date().toLocaleDateString('ru-RU', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  return (
    <div className="w-full max-w-lg mx-auto p-4 sm:p-6 animate-in zoom-in-95 duration-200">
      {/* Pixel Widget Glass Container */}
      <div className="relative rounded-3xl bg-slate-900/90 dark:bg-slate-900/95 text-white p-5 shadow-2xl border border-white/10 backdrop-blur-2xl">
        {/* Top At-A-Glance Bar */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Виджет Pixel • {todayStr}
            </span>
            <h2 className="text-base font-bold text-white flex items-center gap-1.5 mt-0.5">
              <span>Матрица Эйзенхауэра</span>
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            </h2>
          </div>

          <button
            onClick={onOpenFullApp}
            title="Открыть полную матрицу 2x2"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-white/10 hover:bg-white/20 text-xs font-semibold transition cursor-pointer text-slate-200"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Матрица</span>
          </button>
        </div>

        {/* Quadrant Quick Tabs */}
        <div className="grid grid-cols-4 gap-1.5 my-3.5 p-1 rounded-2xl bg-white/5 border border-white/5">
          {QUADRANTS.map((q) => {
            const isSelected = activeTab === q.id;
            const count = tasks.filter((t) => t.quadrant === q.id && !t.completed).length;
            return (
              <button
                key={q.id}
                onClick={() => setActiveTab(q.id)}
                className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all cursor-pointer ${
                  isSelected
                    ? `${q.color.indicator} text-white shadow-md scale-[1.02]`
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <span className="text-xs font-bold">Q{q.num}</span>
                <span className="text-[10px] opacity-80 truncate max-w-[70px]">
                  {count > 0 ? `${count} зад.` : q.urgency}
                </span>
              </button>
            );
          })}
        </div>

        {/* Quick Add Bar in Widget */}
        {isAdding ? (
          <form onSubmit={handleQuickAdd} className="mb-3 flex items-center gap-1.5 animate-in fade-in">
            <input
              type="text"
              autoFocus
              value={quickTitle}
              onChange={(e) => setQuickTitle(e.target.value)}
              placeholder={`Задача в «${currentQuad.title}»...`}
              className="flex-1 bg-white/10 rounded-2xl px-3.5 py-2 text-xs text-white placeholder:text-slate-400 border border-white/15 focus:outline-hidden"
            />
            {isSupported && (
              <button
                type="button"
                onClick={toggleListening}
                className={`p-2 rounded-xl transition ${
                  isListening ? 'bg-rose-500 text-white animate-bounce' : 'bg-white/10 text-slate-300'
                }`}
              >
                <Mic className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              type="submit"
              disabled={!quickTitle.trim()}
              className="px-3 py-2 rounded-2xl bg-white text-slate-900 text-xs font-bold hover:bg-slate-200 transition disabled:opacity-30 cursor-pointer"
            >
              Добавить
            </button>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="p-2 text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </form>
        ) : (
          <button
            onClick={() => setIsAdding(true)}
            className="w-full mb-3 flex items-center justify-center gap-2 py-2.5 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/10 text-xs font-semibold text-white transition shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Добавить задачу в {currentQuad.title}</span>
          </button>
        )}

        {/* Task list inside widget */}
        <div className="space-y-2 max-h-60 overflow-y-auto scrollbar-thin pr-1">
          {filteredTasks.length === 0 ? (
            <div className="py-6 text-center text-slate-400 text-xs">
              Нет активных задач в этом квадранте
            </div>
          ) : (
            filteredTasks.map((task) => {
              const aging = getTaskAgingStyle(task.quadrant, task.createdAt, true);
              return (
                <div
                  key={task.id}
                  style={{
                    backgroundColor: aging.backgroundColor,
                    borderColor: aging.borderColor,
                  }}
                  className="flex items-center gap-2.5 p-2.5 rounded-xl border border-white/10 shadow-xs transition"
                >
                  <button
                    type="button"
                    onClick={() => onToggleComplete(task.id)}
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-white/30 hover:border-white bg-white/10 transition cursor-pointer"
                  >
                    {task.completed && <Check className="w-3 h-3 stroke-[3]" />}
                  </button>

                  <span className={`flex-1 text-xs font-medium truncate ${aging.textColor}`}>
                    {task.title}
                  </span>

                  <span className="text-[10px] text-slate-400 shrink-0">
                    {aging.ageLabel}
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info for Pixel home screen */}
        <div className="mt-3.5 pt-2.5 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400">
          <span>Google Pixel Home Widget</span>
          <span className="text-slate-300">Нажмите иконку PWA для шорткатов</span>
        </div>
      </div>
    </div>
  );
};
