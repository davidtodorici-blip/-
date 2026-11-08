/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo } from 'react';
import { Header } from './components/Header';
import { TaskInput } from './components/TaskInput';
import { Quadrant } from './components/Quadrant';
import { DragOverlay } from './components/DragOverlay';
import { Toast } from './components/Toast';
import { OfflineIndicator } from './components/OfflineIndicator';
import { PixelWidget } from './components/PixelWidget';
import { CloudSyncModal } from './components/CloudSyncModal';
import { DragProvider } from './context/DragContext';
import { useTasks } from './hooks/useTasks';
import { useCloudSync } from './hooks/useCloudSync';
import { QUADRANTS } from './quadrantConfig';
import { QuadrantId, SortOption, Task } from './types';
import { generateIcsFile } from './utils/calendar';

export default function App() {
  const {
    tasks,
    setTasks,
    addTask,
    toggleTaskCompletion,
    deleteTask,
    moveTask,
    toggleCalendarSync,
    setTaskAgeDays,
    lastRemovedTask,
    undoLastAction,
    clearUndo,
    isFirestoreConnected,
    isSyncing: isFirestoreSyncing,
    lastSyncTime: firestoreLastSync,
  } = useTasks();

  // Cloud Synchronization across devices (Android Pixel, HP Google Book, Online Web)
  const {
    syncEmail,
    setSyncEmail,
    savedProfiles,
    switchProfile,
    isSyncing,
    lastSyncTime,
    syncError,
    pairingCode,
    manualSync,
    generatePairingCode,
    linkDeviceViaCode,
  } = useCloudSync(tasks, setTasks);

  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);

  // Dark Mode state with persistence and system preference
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('eisenhower_theme');
      if (saved) return saved === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
      localStorage.setItem('eisenhower_theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('eisenhower_theme', 'light');
    }
  }, [darkMode]);

  // Widget mode & URL parameters
  const [isWidgetView, setIsWidgetView] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('view') === 'widget';
    }
    return false;
  });

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Sorting state (default: newest / позже созданные первыми)
  const [sortBy, setSortBy] = useState<SortOption>('newest');

  // Mobile active tab view: 'all' or specific quadrant
  const [mobileTab, setMobileTab] = useState<'all' | QuadrantId>('all');

  // Filter tasks based on search
  const filteredTasks = useMemo(() => {
    let result = tasks;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((t) => t.title.toLowerCase().includes(q));
    }

    // Apply sorting
    const sorted = [...result];
    switch (sortBy) {
      case 'newest': // Позже (самые свежие первыми)
        return sorted.sort((a, b) => b.createdAt - a.createdAt);
      case 'oldest': // Раньше (старые первыми)
        return sorted.sort((a, b) => a.createdAt - b.createdAt);
      case 'dueDate': // По дедлайну
        return sorted.sort((a, b) => {
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        });
      case 'aging': // По степени созревания/старения (самые старые первыми)
        return sorted.sort((a, b) => a.createdAt - b.createdAt);
      case 'manual':
      default:
        return sorted;
    }
  }, [tasks, searchQuery, sortBy]);

  // Tasks grouped by quadrant
  const tasksByQuadrant = useMemo(() => {
    return {
      q1: filteredTasks.filter((t) => t.quadrant === 'q1'),
      q2: filteredTasks.filter((t) => t.quadrant === 'q2'),
      q3: filteredTasks.filter((t) => t.quadrant === 'q3'),
      q4: filteredTasks.filter((t) => t.quadrant === 'q4'),
    };
  }, [filteredTasks]);

  const handleExportCalendar = () => {
    generateIcsFile(tasks);
  };

  return (
    <DragProvider onMoveTask={moveTask}>
      <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-100/60 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
        {/* Top Header */}
        <Header
          darkMode={darkMode}
          onToggleDarkMode={() => setDarkMode((prev) => !prev)}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          isSearchOpen={isSearchOpen}
          onToggleSearch={() => setIsSearchOpen((prev) => !prev)}
          totalTasks={tasks.length}
          sortBy={sortBy}
          onSortChange={setSortBy}
          isWidgetView={isWidgetView}
          onToggleWidgetView={() => setIsWidgetView((prev) => !prev)}
          onExportCalendar={handleExportCalendar}
          syncEmail={syncEmail}
          isSyncing={isSyncing || isFirestoreSyncing}
          isFirestoreConnected={isFirestoreConnected}
          onOpenSyncModal={() => setIsSyncModalOpen(true)}
        />

        {/* Content Area */}
        {isWidgetView ? (
          /* Pixel Widget Mode */
          <main className="flex-1 flex flex-col items-center justify-center p-3 overflow-y-auto">
            <PixelWidget
              tasks={tasks}
              onAddTask={addTask}
              onToggleComplete={toggleTaskCompletion}
              onOpenFullApp={() => setIsWidgetView(false)}
            />
          </main>
        ) : (
          /* Standard 2x2 Matrix View */
          <main className="flex-1 flex flex-col min-h-0 max-w-7xl w-full mx-auto p-2 sm:p-4 gap-3">
            {/* Quick Input Bar */}
            <div className="shrink-0">
              <TaskInput onAddTask={addTask} />
            </div>

            {/* Mobile Tab Switcher (visible on small screens) */}
            <div className="flex md:hidden items-center justify-between gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1 rounded-xl shrink-0 text-xs">
              <button
                onClick={() => setMobileTab('all')}
                className={`flex-1 py-1.5 px-2 rounded-lg font-medium text-center transition-all ${
                  mobileTab === 'all'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                Все 4
              </button>
              {QUADRANTS.map((q) => {
                const isSelected = mobileTab === q.id;
                const count = tasksByQuadrant[q.id].length;
                return (
                  <button
                    key={q.id}
                    onClick={() => setMobileTab(q.id)}
                    className={`flex-1 py-1.5 px-1.5 rounded-lg font-medium text-center transition-all flex items-center justify-center gap-1 ${
                      isSelected
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${q.color.indicator}`} />
                    <span>Q{q.num}</span>
                    {count > 0 && <span className="text-[10px] opacity-75">({count})</span>}
                  </button>
                );
              })}
            </div>

            {/* 2x2 Quadrant Grid */}
            <div className="flex-1 min-h-0 overflow-y-auto md:overflow-hidden">
              <div className="h-full grid grid-cols-1 md:grid-cols-2 gap-3 min-h-[500px] md:min-h-0">
                {QUADRANTS.map((quadrant) => {
                  const isHiddenOnMobile = mobileTab !== 'all' && mobileTab !== quadrant.id;

                  return (
                    <div
                      key={quadrant.id}
                      className={`h-full min-h-[220px] md:min-h-0 ${
                        isHiddenOnMobile ? 'hidden md:flex flex-col' : 'flex flex-col'
                      }`}
                    >
                      <Quadrant
                        config={quadrant}
                        tasks={tasksByQuadrant[quadrant.id]}
                        onToggleComplete={toggleTaskCompletion}
                        onDelete={deleteTask}
                        onToggleCalendarSync={toggleCalendarSync}
                        onSetAgeDays={setTaskAgeDays}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </main>
        )}

        {/* Mobile Drag Overlay */}
        <DragOverlay />

        {/* Undo notification toast */}
        <Toast
          item={lastRemovedTask}
          onUndo={undoLastAction}
          onDismiss={clearUndo}
        />

        {/* PWA Offline indicator */}
        <OfflineIndicator />

        {/* Cloud Synchronization and Device Pairing Modal */}
        <CloudSyncModal
          isOpen={isSyncModalOpen}
          onClose={() => setIsSyncModalOpen(false)}
          syncEmail={syncEmail}
          onUpdateEmail={setSyncEmail}
          savedProfiles={savedProfiles}
          onSwitchProfile={switchProfile}
          isSyncing={isSyncing || isFirestoreSyncing}
          lastSyncTime={firestoreLastSync || lastSyncTime}
          syncError={syncError}
          onManualSync={manualSync}
          pairingCode={pairingCode}
          onGeneratePairingCode={generatePairingCode}
          onLinkDeviceViaCode={linkDeviceViaCode}
          tasks={tasks}
          onRestoreTasks={setTasks}
          isFirestoreConnected={isFirestoreConnected}
        />
      </div>
    </DragProvider>
  );
}
