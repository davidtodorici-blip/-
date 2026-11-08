import { useState, useEffect, useCallback, useRef } from 'react';
import { Task } from '../types';

const SYNC_EMAIL_STORAGE = 'eisenhower_sync_email';
const SAVED_PROFILES_STORAGE = 'eisenhower_saved_profiles';
const DEFAULT_EMAIL = 'david.dudovich@gmail.com';

export function useCloudSync(
  tasks: Task[],
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>
) {
  const [syncEmail, setSyncEmail] = useState<string>(() => {
    try {
      return localStorage.getItem(SYNC_EMAIL_STORAGE) || DEFAULT_EMAIL;
    } catch {
      return DEFAULT_EMAIL;
    }
  });

  const [savedProfiles, setSavedProfiles] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(SAVED_PROFILES_STORAGE);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return [DEFAULT_EMAIL];
  });

  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [pairingCode, setPairingCode] = useState<string | null>(null);

  const isInitialLoadDone = useRef(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Save email and profiles to localStorage
  useEffect(() => {
    if (syncEmail) {
      localStorage.setItem(SYNC_EMAIL_STORAGE, syncEmail);
      setSavedProfiles((prev) => {
        if (!prev.includes(syncEmail)) {
          const next = [...prev, syncEmail];
          localStorage.setItem(SAVED_PROFILES_STORAGE, JSON.stringify(next));
          return next;
        }
        return prev;
      });
    }
  }, [syncEmail]);

  // Initial load from cloud on mount (or when email changes)
  const fetchCloudTasks = useCallback(
    async (emailToFetch: string) => {
      if (!emailToFetch.trim()) return;
      setIsSyncing(true);
      setSyncError(null);
      try {
        const res = await fetch(`/api/sync/tasks?email=${encodeURIComponent(emailToFetch.trim())}`);
        const data = await res.json();
        if (data.success && data.tasks && Array.isArray(data.tasks) && data.tasks.length > 0) {
          setTasks(data.tasks);
          setLastSyncTime(data.lastSyncedAt || Date.now());
        }
      } catch (err: any) {
        console.warn('Cloud sync load failed:', err);
        setSyncError('Не удалось загрузить данные из облака');
      } finally {
        setIsSyncing(false);
        isInitialLoadDone.current = true;
      }
    },
    [setTasks]
  );

  // Auto-fetch on boot
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const codeFromUrl = urlParams.get('pair');
      if (codeFromUrl) {
        fetch('/api/sync/resolve-code', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: codeFromUrl }),
        })
          .then((r) => r.json())
          .then((d) => {
            if (d.success && d.email) {
              setSyncEmail(d.email);
              fetchCloudTasks(d.email);
            }
          })
          .catch(console.warn);
        return;
      }
    }

    if (syncEmail) {
      fetchCloudTasks(syncEmail);
    }
  }, [fetchCloudTasks, syncEmail]);

  // Debounced auto-save to cloud on tasks change
  useEffect(() => {
    if (!isInitialLoadDone.current || !syncEmail.trim()) return;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      setIsSyncing(true);
      try {
        const res = await fetch('/api/sync/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: syncEmail.trim(),
            tasks,
          }),
        });
        const data = await res.json();
        if (data.success) {
          setLastSyncTime(data.lastSyncedAt);
          setSyncError(null);
        }
      } catch (err) {
        console.warn('Cloud sync auto-save failed:', err);
        setSyncError('Ошибка сохранения в облако');
      } finally {
        setIsSyncing(false);
      }
    }, 1200);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [tasks, syncEmail]);

  // Switch to another profile
  const switchProfile = useCallback(
    async (newEmail: string) => {
      const clean = newEmail.trim().toLowerCase();
      if (!clean) return;
      setSyncEmail(clean);
      await fetchCloudTasks(clean);
    },
    [fetchCloudTasks]
  );

  // Force manual sync
  const manualSync = useCallback(async () => {
    if (!syncEmail.trim()) return;
    setIsSyncing(true);
    setSyncError(null);
    try {
      const res = await fetch('/api/sync/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: syncEmail.trim(),
          tasks,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setLastSyncTime(data.lastSyncedAt);
      }
    } catch {
      setSyncError('Ошибка синхронизации');
    } finally {
      setIsSyncing(false);
    }
  }, [syncEmail, tasks]);

  // Generate 6-digit device pairing code
  const generatePairingCode = useCallback(async () => {
    if (!syncEmail.trim()) return;
    try {
      const res = await fetch('/api/sync/pairing-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: syncEmail.trim() }),
      });
      const data = await res.json();
      if (data.success && data.code) {
        setPairingCode(data.code);
      }
    } catch (err) {
      console.warn('Pairing code generation failed', err);
    }
  }, [syncEmail]);

  // Link device via 6-digit pairing code
  const linkDeviceViaCode = useCallback(
    async (code: string) => {
      if (!code.trim()) return false;
      try {
        const res = await fetch('/api/sync/resolve-code', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: code.trim() }),
        });
        const data = await res.json();
        if (data.success && data.email) {
          setSyncEmail(data.email);
          await fetchCloudTasks(data.email);
          return true;
        }
      } catch (err) {
        console.warn('Link code failed', err);
      }
      return false;
    },
    [fetchCloudTasks]
  );

  return {
    syncEmail,
    setSyncEmail,
    savedProfiles,
    switchProfile,
    isSyncing,
    lastSyncTime,
    syncError,
    pairingCode,
    manualSync,
    fetchCloudTasks,
    generatePairingCode,
    linkDeviceViaCode,
  };
}
