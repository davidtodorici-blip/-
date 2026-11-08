import { useState, useEffect, useCallback, useRef } from 'react';
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  deleteDoc,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, validateFirestoreConnection } from '../firebase/config';
import { Task, QuadrantId } from '../types';

const DAY_MS = 24 * 60 * 60 * 1000;

const INITIAL_DEMO_TASKS: Task[] = [
  {
    id: 'task-q1-demo',
    title: 'Сдать срочный отчет руководителю (стоит 7 дней)',
    quadrant: 'q1',
    completed: false,
    createdAt: Date.now() - 7.2 * DAY_MS,
  },
  {
    id: 'task-q1b-demo',
    title: 'Подтвердить контракт с клиентом (стоит 2 дня)',
    quadrant: 'q1',
    completed: false,
    createdAt: Date.now() - 2.5 * DAY_MS,
  },
  {
    id: 'task-q2-demo',
    title: 'Стратегический план развития (стоит 5 дней, стремится покраснеть)',
    quadrant: 'q2',
    completed: false,
    createdAt: Date.now() - 5.0 * DAY_MS,
  },
  {
    id: 'task-q3-demo',
    title: 'Ответить на рутинные звонки (стоит 4 дня, синеет)',
    quadrant: 'q3',
    completed: false,
    createdAt: Date.now() - 4.0 * DAY_MS,
  },
  {
    id: 'task-q4-demo',
    title: 'Разобрать спам и старые вкладки (стоит 5 дней, желтеет)',
    quadrant: 'q4',
    completed: false,
    createdAt: Date.now() - 5.2 * DAY_MS,
  },
  {
    id: 'task-new-demo',
    title: 'Свежая задача (добавлена только что — белая)',
    quadrant: 'q4',
    completed: false,
    createdAt: Date.now() - 10000,
  },
];

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isFirestoreConnected, setIsFirestoreConnected] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(true);
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);

  const [lastRemovedTask, setLastRemovedTask] = useState<{
    task: Task;
    action: 'completed' | 'deleted';
  } | null>(null);

  const fadeTimersRef = useRef<Record<string, NodeJS.Timeout>>({});
  const isInitializedRef = useRef(false);

  // 1. Test connection to Firestore on boot
  useEffect(() => {
    validateFirestoreConnection()
      .then((connected) => setIsFirestoreConnected(connected))
      .catch(() => setIsFirestoreConnected(false));
  }, []);

  // 2. Real-time Synchronization across all devices via Firestore onSnapshot
  useEffect(() => {
    const tasksCollection = collection(db, 'tasks');
    setIsSyncing(true);

    const unsubscribe = onSnapshot(
      tasksCollection,
      async (snapshot) => {
        setIsSyncing(false);
        setIsFirestoreConnected(true);
        setLastSyncTime(Date.now());

        // If collection is completely empty on first launch, seed with demo tasks
        if (snapshot.empty && !isInitializedRef.current) {
          isInitializedRef.current = true;
          // Seed demo tasks
          for (const item of INITIAL_DEMO_TASKS) {
            try {
              await setDoc(doc(db, 'tasks', item.id), item);
            } catch (err) {
              handleFirestoreError(err, OperationType.CREATE, `tasks/${item.id}`);
            }
          }
          return;
        }

        isInitializedRef.current = true;
        const loadedTasks: Task[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          loadedTasks.push({
            id: docSnap.id,
            title: data.title || '',
            quadrant: data.quadrant || 'q1',
            completed: Boolean(data.completed),
            dueDate: data.dueDate || undefined,
            createdAt: typeof data.createdAt === 'number' ? data.createdAt : Date.now(),
            syncedToCalendar: Boolean(data.syncedToCalendar),
          });
        });

        // Retain local fading state for tasks currently completing
        setTasks((prev) => {
          const fadingIds = new Set(prev.filter((t) => t.isFading).map((t) => t.id));
          return loadedTasks.map((t) => ({
            ...t,
            isFading: fadingIds.has(t.id),
          }));
        });
      },
      (error) => {
        setIsSyncing(false);
        handleFirestoreError(error, OperationType.GET, 'tasks');
        // Graceful fallback to local tasks if network/rules blocked
        try {
          const localBackup = localStorage.getItem('eisenhower_firestore_backup');
          if (localBackup) {
            setTasks(JSON.parse(localBackup));
          } else {
            setTasks(INITIAL_DEMO_TASKS);
          }
        } catch {
          setTasks(INITIAL_DEMO_TASKS);
        }
      }
    );

    return () => {
      unsubscribe();
      Object.values(fadeTimersRef.current).forEach((t) => clearTimeout(t));
    };
  }, []);

  // Backup to localStorage for instant offline access
  useEffect(() => {
    if (tasks.length > 0) {
      try {
        localStorage.setItem(
          'eisenhower_firestore_backup',
          JSON.stringify(tasks.filter((t) => !t.isFading))
        );
      } catch {
        // ignore
      }
    }
  }, [tasks]);

  // Add task to Firebase Firestore
  const addTask = useCallback(
    async (title: string, quadrant: QuadrantId, dueDate?: string) => {
      if (!title.trim()) return;
      const taskId = 't-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
      const newTask: Task = {
        id: taskId,
        title: title.trim(),
        quadrant,
        completed: false,
        dueDate: dueDate || undefined,
        createdAt: Date.now(),
      };

      // Optimistic local update
      setTasks((prev) => [newTask, ...prev]);

      try {
        await setDoc(doc(db, 'tasks', taskId), {
          title: newTask.title,
          quadrant: newTask.quadrant,
          completed: false,
          dueDate: newTask.dueDate || null,
          createdAt: newTask.createdAt,
          updatedAt: Date.now(),
        });
        setLastSyncTime(Date.now());
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `tasks/${taskId}`);
      }
    },
    []
  );

  // Toggle completion with 1-second smooth fade, then delete/update in Firestore
  const toggleTaskCompletion = useCallback((taskId: string) => {
    setTasks((prev) => {
      const taskIndex = prev.findIndex((t) => t.id === taskId);
      if (taskIndex === -1) return prev;

      const current = prev[taskIndex];
      // If already completing and user toggles back
      if (current.completed && current.isFading) {
        if (fadeTimersRef.current[taskId]) {
          clearTimeout(fadeTimersRef.current[taskId]);
          delete fadeTimersRef.current[taskId];
        }
        const updated = [...prev];
        updated[taskIndex] = {
          ...current,
          completed: false,
          isFading: false,
        };
        setDoc(
          doc(db, 'tasks', taskId),
          {
            completed: false,
            updatedAt: Date.now(),
          },
          { merge: true }
        ).catch((err) => handleFirestoreError(err, OperationType.UPDATE, `tasks/${taskId}`));
        return updated;
      }

      // Start fade animation
      const updated = [...prev];
      updated[taskIndex] = {
        ...current,
        completed: true,
        isFading: true,
      };

      if (fadeTimersRef.current[taskId]) {
        clearTimeout(fadeTimersRef.current[taskId]);
      }

      fadeTimersRef.current[taskId] = setTimeout(async () => {
        setTasks((latest) => {
          const finishedTask = latest.find((t) => t.id === taskId);
          if (finishedTask) {
            setLastRemovedTask({ task: finishedTask, action: 'completed' });
          }
          return latest.filter((t) => t.id !== taskId);
        });

        // Delete from Firestore
        try {
          await deleteDoc(doc(db, 'tasks', taskId));
          setLastSyncTime(Date.now());
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, `tasks/${taskId}`);
        }
        delete fadeTimersRef.current[taskId];
      }, 1000);

      return updated;
    });
  }, []);

  // Delete task from Firestore
  const deleteTask = useCallback(async (taskId: string) => {
    if (fadeTimersRef.current[taskId]) {
      clearTimeout(fadeTimersRef.current[taskId]);
      delete fadeTimersRef.current[taskId];
    }
    setTasks((prev) => {
      const taskToDelete = prev.find((t) => t.id === taskId);
      if (taskToDelete) {
        setLastRemovedTask({ task: taskToDelete, action: 'deleted' });
      }
      return prev.filter((t) => t.id !== taskId);
    });

    try {
      await deleteDoc(doc(db, 'tasks', taskId));
      setLastSyncTime(Date.now());
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `tasks/${taskId}`);
    }
  }, []);

  // Move task to another quadrant in Firestore (Drag & Drop)
  const moveTask = useCallback(async (taskId: string, targetQuadrant: QuadrantId) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, quadrant: targetQuadrant } : t))
    );

    try {
      await setDoc(
        doc(db, 'tasks', taskId),
        {
          quadrant: targetQuadrant,
          updatedAt: Date.now(),
        },
        { merge: true }
      );
      setLastSyncTime(Date.now());
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `tasks/${taskId}`);
    }
  }, []);

  // Restore task (Undo) in Firestore
  const undoLastAction = useCallback(async () => {
    if (!lastRemovedTask) return;
    const restored: Task = {
      ...lastRemovedTask.task,
      completed: false,
      isFading: false,
    };
    setTasks((prev) => [restored, ...prev]);
    setLastRemovedTask(null);

    try {
      await setDoc(doc(db, 'tasks', restored.id), {
        title: restored.title,
        quadrant: restored.quadrant,
        completed: false,
        dueDate: restored.dueDate || null,
        createdAt: restored.createdAt,
        updatedAt: Date.now(),
      });
      setLastSyncTime(Date.now());
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `tasks/${restored.id}`);
    }
  }, [lastRemovedTask]);

  const clearUndo = useCallback(() => {
    setLastRemovedTask(null);
  }, []);

  const toggleCalendarSync = useCallback(async (taskId: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, syncedToCalendar: !t.syncedToCalendar } : t))
    );
    try {
      const task = tasks.find((t) => t.id === taskId);
      await setDoc(
        doc(db, 'tasks', taskId),
        {
          syncedToCalendar: !task?.syncedToCalendar,
          updatedAt: Date.now(),
        },
        { merge: true }
      );
    } catch {
      // ignore
    }
  }, [tasks]);

  const setTaskAgeDays = useCallback(async (taskId: string, days: number) => {
    const newCreatedAt = Date.now() - days * DAY_MS;
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, createdAt: newCreatedAt } : t))
    );
    try {
      await setDoc(
        doc(db, 'tasks', taskId),
        {
          createdAt: newCreatedAt,
          updatedAt: Date.now(),
        },
        { merge: true }
      );
    } catch {
      // ignore
    }
  }, []);

  return {
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
    isSyncing,
    lastSyncTime,
  };
}
