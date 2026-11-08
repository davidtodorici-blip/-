import React from 'react';
import { Moon, Sun, Search, LayoutGrid, X, ArrowUpDown, Smartphone, Calendar } from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';
import { SortOption } from '../types';

interface HeaderProps {
  darkMode: boolean;
  onToggleDarkMode: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  isSearchOpen: boolean;
  onToggleSearch: () => void;
  totalTasks: number;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  isWidgetView: boolean;
  onToggleWidgetView: () => void;
  onExportCalendar: () => void;
  syncEmail: string;
  isSyncing: boolean;
  onOpenSyncModal: () => void;
  isFirestoreConnected?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  darkMode,
  onToggleDarkMode,
  searchQuery,
  onSearchChange,
  isSearchOpen,
  onToggleSearch,
  totalTasks,
  sortBy,
  onSortChange,
  isWidgetView,
  onToggleWidgetView,
  onExportCalendar,
  syncEmail,
  isSyncing,
  onOpenSyncModal,
  isFirestoreConnected,
}) => {
  return (
    <header className="w-full border-b border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md sticky top-0 z-30 transition-colors">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 h-14 flex items-center justify-between gap-2 sm:gap-3">
        {/* Logo and Brand */}
        <div className="flex items-center gap-2.5">
          <div className="grid grid-cols-2 gap-0.5 p-1 rounded-lg bg-slate-900 dark:bg-slate-800 shadow-xs">
            <span className="w-2 h-2 rounded-xs bg-rose-500" />
            <span className="w-2 h-2 rounded-xs bg-blue-500" />
            <span className="w-2 h-2 rounded-xs bg-amber-500" />
            <span className="w-2 h-2 rounded-xs bg-emerald-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <h1 className="text-sm sm:text-base font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Матрица Эйзенхауэра
            </h1>
            <span className="hidden md:inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
              {totalTasks} {totalTasks === 1 ? 'задача' : totalTasks >= 2 && totalTasks <= 4 ? 'задачи' : 'задач'}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Sort Selector Dropdown */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-850 px-2 py-1 rounded-xl text-xs text-slate-600 dark:text-slate-300">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value as SortOption)}
              className="bg-transparent font-medium text-slate-700 dark:text-slate-200 focus:outline-hidden text-xs cursor-pointer"
              title="Упорядочить задачи"
            >
              <option value="newest" className="dark:bg-slate-900">Сначала новые (позже)</option>
              <option value="oldest" className="dark:bg-slate-900">Сначала старые (раньше)</option>
              <option value="dueDate" className="dark:bg-slate-900">По сроку выполнения</option>
              <option value="aging" className="dark:bg-slate-900">По возрасту (старению)</option>
              <option value="manual" className="dark:bg-slate-900">Ручной (Drag & Drop)</option>
            </select>
          </div>

          {/* Export to Calendar button */}
          <button
            type="button"
            onClick={onExportCalendar}
            title="Экспорт всех задач в Календарь (.ics)"
            className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-850 hover:text-slate-800 dark:hover:text-slate-200 transition cursor-pointer"
          >
            <Calendar className="w-4 h-4" />
          </button>

          {/* Realtime Firestore Sync Status & Account Button */}
          <button
            type="button"
            onClick={onOpenSyncModal}
            title={
              isFirestoreConnected
                ? `Firebase Firestore: Онлайн (Синхронизация в реальном времени) • ${syncEmail}`
                : `Облачная синхронизация: ${syncEmail}`
            }
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-850 hover:bg-slate-200 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isSyncing
                  ? 'bg-amber-400 animate-ping'
                  : isFirestoreConnected
                  ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]'
                  : 'bg-emerald-500'
              }`}
            />
            <span className="hidden xl:inline text-[11px] font-semibold text-slate-700 dark:text-slate-200">
              {isFirestoreConnected ? 'Firestore: Онлайн' : syncEmail.split('@')[0]}
            </span>
            <span className="hidden sm:inline xl:hidden text-[11px] font-semibold">
              {isFirestoreConnected ? 'Firestore' : 'Облако'}
            </span>
          </button>

          {/* Toggle Pixel Widget Mode */}
          <button
            type="button"
            onClick={onToggleWidgetView}
            title={isWidgetView ? 'Вернуться к сетке матрицы 2x2' : 'Режим виджета Pixel'}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold transition cursor-pointer ${
              isWidgetView
                ? 'bg-rose-500 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-850 hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            {isWidgetView ? (
              <>
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Сетка 2x2</span>
              </>
            ) : (
              <>
                <Smartphone className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Виджет</span>
              </>
            )}
          </button>

          {/* Search bar expandable */}
          {isSearchOpen ? (
            <div className="flex items-center bg-slate-100 dark:bg-slate-850 rounded-xl px-2.5 py-1 text-xs border border-slate-200 dark:border-slate-700 w-32 sm:w-52 animate-in fade-in">
              <Search className="w-3.5 h-3.5 text-slate-400 shrink-0 mr-1.5" />
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Поиск..."
                className="w-full bg-transparent text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-hidden"
              />
              <button
                type="button"
                onClick={() => {
                  onSearchChange('');
                  onToggleSearch();
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 ml-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onToggleSearch}
              title="Поиск"
              aria-label="Поиск"
              className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-850 hover:text-slate-800 dark:hover:text-slate-200 transition cursor-pointer"
            >
              <Search className="w-4 h-4" />
            </button>
          )}

          {/* Theme Toggle */}
          <button
            type="button"
            onClick={onToggleDarkMode}
            title={darkMode ? 'Светлая тема' : 'Темная тема'}
            aria-label="Переключить тему"
            className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-850 hover:text-slate-800 dark:hover:text-slate-200 transition cursor-pointer"
          >
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* PWA Install Button */}
          <PWAInstallButton />
        </div>
      </div>
    </header>
  );
};
