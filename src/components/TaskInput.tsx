import React, { useState } from 'react';
import { QuadrantId } from '../types';
import { Mic, MicOff, Calendar, Plus, X, Sparkles, Loader2, Info } from 'lucide-react';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';

interface TaskInputProps {
  onAddTask: (title: string, quadrant: QuadrantId, dueDate?: string) => void;
  defaultQuadrant?: QuadrantId;
}

const QUADRANT_BUTTONS: { id: QuadrantId; num: string; label: string; activeClass: string }[] = [
  { id: 'q1', num: '1', label: 'Сделать (Срочно)', activeClass: 'bg-rose-500 text-white shadow-xs' },
  { id: 'q2', num: '2', label: 'Запланировать', activeClass: 'bg-blue-500 text-white shadow-xs' },
  { id: 'q3', num: '3', label: 'Делегировать', activeClass: 'bg-amber-500 text-white shadow-xs' },
  { id: 'q4', num: '4', label: 'Отложить', activeClass: 'bg-emerald-500 text-white shadow-xs' },
];

export const TaskInput: React.FC<TaskInputProps> = ({
  onAddTask,
  defaultQuadrant = 'q1',
}) => {
  const [title, setTitle] = useState('');
  const [selectedQuadrant, setSelectedQuadrant] = useState<QuadrantId>(defaultQuadrant);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dueDate, setDueDate] = useState('');
  const [isGeminiProcessing, setIsGeminiProcessing] = useState(false);
  const [geminiReasoning, setGeminiReasoning] = useState<string | null>(null);
  const [showPixelGuide, setShowPixelGuide] = useState(false);

  // Send text to Gemini to parse title, priority, and date
  const parseWithGemini = async (rawText: string) => {
    if (!rawText.trim()) return;
    setIsGeminiProcessing(true);
    setGeminiReasoning(null);
    try {
      const response = await fetch('/api/gemini/parse-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: rawText }),
      });
      const data = await response.json();
      if (data.title) {
        setTitle(data.title);
      }
      if (data.quadrant && ['q1', 'q2', 'q3', 'q4'].includes(data.quadrant)) {
        setSelectedQuadrant(data.quadrant as QuadrantId);
      }
      if (data.dueDate) {
        setDueDate(data.dueDate);
        setShowDatePicker(true);
      }
      if (data.reasoning) {
        setGeminiReasoning(data.reasoning);
        setTimeout(() => setGeminiReasoning(null), 5000);
      }
    } catch (err) {
      console.warn('Gemini parse failed, using raw text:', err);
    } finally {
      setIsGeminiProcessing(false);
    }
  };

  const { isListening, isSupported, toggleListening, error: speechError } =
    useSpeechRecognition((transcriptText) => {
      setTitle(transcriptText);
      // If voice contains priority keywords, automatically send to Gemini upon pause
    });

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!title.trim()) return;

    onAddTask(title, selectedQuadrant, dueDate || undefined);
    setTitle('');
    setDueDate('');
    setShowDatePicker(false);
    setGeminiReasoning(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  const setQuickDate = (type: 'today' | 'tomorrow') => {
    const d = new Date();
    if (type === 'tomorrow') {
      d.setDate(d.getDate() + 1);
    }
    d.setHours(18, 0, 0, 0);
    const tzOffset = d.getTimezoneOffset() * 60000;
    const localISOTime = new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
    setDueDate(localISOTime);
  };

  return (
    <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs p-2.5 transition-all">
      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        {/* Main input row */}
        <div className="flex items-center gap-2">
          {/* Text Input */}
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isGeminiProcessing
                ? 'Gemini анализирует задачу и приоритет...'
                : isListening
                ? 'Слушаю русскую речь...'
                : 'Новая задача... (Enter для добавления)'
            }
            className={`flex-1 bg-transparent px-3 py-2 text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-hidden ${
              isListening ? 'animate-pulse text-rose-600 font-medium' : ''
            }`}
          />

          {/* Gemini AI magic button (parses natural language priority & date) */}
          {title.trim().length > 3 && (
            <button
              type="button"
              onClick={() => parseWithGemini(title)}
              disabled={isGeminiProcessing}
              title="Разобрать приоритет и дату с помощью Gemini AI"
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 text-xs font-semibold hover:bg-indigo-100 dark:hover:bg-indigo-900/80 transition cursor-pointer shrink-0"
            >
              {isGeminiProcessing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline">Gemini</span>
            </button>
          )}

          {/* Speech recognition button */}
          <button
            type="button"
            onClick={toggleListening}
            disabled={!isSupported}
            title={
              !isSupported
                ? 'Голосовой ввод не поддерживается вашим браузером (рекомендуется Chrome на Pixel)'
                : isListening
                ? 'Остановить запись и обработать'
                : 'Голосовой ввод на русском языке'
            }
            aria-label="Голосовой ввод"
            className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all ${
              isListening
                ? 'bg-rose-500 text-white animate-bounce shadow-md'
                : isSupported
                ? 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                : 'text-slate-300 dark:text-slate-700 cursor-not-allowed'
            }`}
          >
            {isListening ? (
              <MicOff className="w-4 h-4" />
            ) : (
              <Mic className="w-4 h-4" />
            )}
          </button>

          {/* Date Picker Toggle Button */}
          <button
            type="button"
            onClick={() => setShowDatePicker((prev) => !prev)}
            title={showDatePicker ? 'Скрыть срок' : 'Указать дату и время'}
            aria-label="Срок задачи"
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors ${
              showDatePicker || dueDate
                ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Calendar className="w-4 h-4" />
          </button>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!title.trim() || isGeminiProcessing}
            title="Добавить задачу"
            aria-label="Добавить задачу"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition-all shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        {/* Gemini reasoning notification */}
        {geminiReasoning && (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-indigo-50 dark:bg-indigo-950/40 rounded-lg text-xs text-indigo-700 dark:text-indigo-300">
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            <span>{geminiReasoning}</span>
          </div>
        )}

        {/* Speech Error Banner if any */}
        {speechError && (
          <p className="text-xs text-rose-500 px-3 py-0.5">{speechError}</p>
        )}

        {/* Sub-row: Quadrant 1-4 selection & optional date/time popup */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-1 pt-1 border-t border-slate-100 dark:border-slate-800/60">
          {/* Quadrant Selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 mr-1 hidden sm:inline">
              Квадрант:
            </span>
            <div className="flex items-center gap-1 bg-slate-100/80 dark:bg-slate-800/80 p-0.5 rounded-lg">
              {QUADRANT_BUTTONS.map((q) => {
                const isSelected = selectedQuadrant === q.id;
                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => setSelectedQuadrant(q.id)}
                    title={`Квадрант ${q.num}: ${q.label}`}
                    className={`flex items-center justify-center h-6 px-2.5 rounded-md text-xs font-semibold transition-all ${
                      isSelected
                        ? q.activeClass
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    <span>Q{q.num}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Pixel Gemini helper button */}
            <button
              type="button"
              onClick={() => setShowPixelGuide(true)}
              className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
              title="Как использовать с кнопкой питания на Google Pixel"
            >
              <Info className="w-3 h-3" />
              <span>Pixel & Gemini</span>
            </button>

            {/* Active Due Date Pill if specified */}
            {dueDate && !showDatePicker && (
              <div className="flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-md">
                <Calendar className="w-3 h-3" />
                <span>{dueDate.replace('T', ' ')}</span>
                <button
                  type="button"
                  onClick={() => setDueDate('')}
                  className="hover:text-indigo-800 dark:hover:text-indigo-200 ml-1"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Optional Collapsible Date/Time Picker */}
        {showDatePicker && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <input
              type="datetime-local"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 focus:outline-hidden"
            />
            <button
              type="button"
              onClick={() => setQuickDate('today')}
              className="px-2 py-1 text-xs rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
            >
              Сегодня 18:00
            </button>
            <button
              type="button"
              onClick={() => setQuickDate('tomorrow')}
              className="px-2 py-1 text-xs rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
            >
              Завтра 18:00
            </button>
            {dueDate && (
              <button
                type="button"
                onClick={() => setDueDate('')}
                className="text-xs text-rose-500 hover:underline ml-auto"
              >
                Сбросить
              </button>
            )}
          </div>
        )}
      </form>

      {/* Google Pixel & Gemini Voice Assistant Guide Modal */}
      {showPixelGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-500" />
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Голосовой ввод на Google Pixel с Gemini
                </h3>
              </div>
              <button
                onClick={() => setShowPixelGuide(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-3 space-y-3 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              <p>
                Вы можете диктовать задачи с указанием приоритета:
              </p>
              <div className="space-y-1.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700">
                <p className="font-medium text-slate-800 dark:text-slate-200">Примеры голосовых команд:</p>
                <p>• <em>«<strong>Сделать</strong>: отправить отчет до 15:00»</em> → попадет в Q1</p>
                <p>• <em>«<strong>Запланировать</strong>: купить билеты в театр на пятницу»</em> → попадет в Q2</p>
                <p>• <em>«<strong>Делегировать</strong>: проверить правки бухгалтера»</em> → попадет в Q3</p>
                <p>• <em>«<strong>Отложить</strong>: посмотреть фильм на выходных»</em> → попадет в Q4</p>
              </div>
              <p>
                На Pixel для быстрого добавления прямо с главного экрана: долго удерживайте иконку приложения на рабочем столе и выберите <strong>«Добавить задачу»</strong> или <strong>«Виджет матрицы»</strong>!
              </p>
            </div>

            <button
              onClick={() => setShowPixelGuide(false)}
              className="mt-4 w-full rounded-xl bg-slate-900 py-2 text-xs font-semibold text-white dark:bg-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100"
            >
              Отлично
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
