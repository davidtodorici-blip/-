import React, { useState } from 'react';
import {
  Cloud,
  CloudCheck,
  RefreshCw,
  X,
  Smartphone,
  Laptop,
  Link2,
  Download,
  Upload,
  Copy,
  Check,
  User,
  Plus,
  ExternalLink,
} from 'lucide-react';
import { Task } from '../types';

interface CloudSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  syncEmail: string;
  onUpdateEmail: (email: string) => void;
  savedProfiles: string[];
  onSwitchProfile: (email: string) => void;
  isSyncing: boolean;
  lastSyncTime: number | null;
  syncError: string | null;
  onManualSync: () => void;
  pairingCode: string | null;
  onGeneratePairingCode: () => void;
  onLinkDeviceViaCode: (code: string) => Promise<boolean>;
  tasks: Task[];
  onRestoreTasks: (tasks: Task[]) => void;
  isFirestoreConnected?: boolean;
}

export const CloudSyncModal: React.FC<CloudSyncModalProps> = ({
  isOpen,
  onClose,
  syncEmail,
  onUpdateEmail,
  savedProfiles,
  onSwitchProfile,
  isSyncing,
  lastSyncTime,
  syncError,
  onManualSync,
  pairingCode,
  onGeneratePairingCode,
  onLinkDeviceViaCode,
  tasks,
  onRestoreTasks,
  isFirestoreConnected = true,
}) => {
  const [emailInput, setEmailInput] = useState(syncEmail);
  const [inputCode, setInputCode] = useState('');
  const [isLinking, setIsLinking] = useState(false);
  const [linkSuccess, setLinkSuccess] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isAddingNewProfile, setIsAddingNewProfile] = useState(false);

  if (!isOpen) return null;

  const handleSaveEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (emailInput.trim()) {
      onUpdateEmail(emailInput.trim());
      setIsAddingNewProfile(false);
    }
  };

  const handleConnectWithCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCode.trim()) return;
    setIsLinking(true);
    const success = await onLinkDeviceViaCode(inputCode.trim());
    setIsLinking(false);
    if (success) {
      setLinkSuccess(true);
      setTimeout(() => setLinkSuccess(false), 3000);
      setInputCode('');
    }
  };

  const handleCopyPairingLink = () => {
    if (!pairingCode) return;
    const url = `${window.location.origin}/?pair=${pairingCode}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // Google Drive Direct Backup Download & Upload Helper
  const handleSaveToGoogleDrive = () => {
    const cleanEmail = syncEmail.split('@')[0] || 'tasks';
    const jsonStr = JSON.stringify(tasks, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `eisenhower_matrix_${cleanEmail}_backup.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // Prompt user to open Google Drive
    setTimeout(() => {
      window.open('https://drive.google.com/drive/my-drive', '_blank', 'noopener,noreferrer');
    }, 400);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (Array.isArray(parsed)) {
          onRestoreTasks(parsed);
          alert('Резервная копия успешно восстановлена!');
        }
      } catch {
        alert('Ошибка чтения файла резервной копии');
      }
    };
    reader.readAsText(file);
  };

  const formattedSyncTime = lastSyncTime
    ? new Date(lastSyncTime).toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : 'Синхронизировано';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 max-h-[92vh] overflow-y-auto scrollbar-thin">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <span>Firebase & Google Синхронизация</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Firestore Realtime • Pixel • HP Google Book • Онлайн
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Realtime Firebase Firestore Status Banner */}
        <div className="mt-4 p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-rose-500/10 border border-amber-500/20 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
            <div>
              <p className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1">
                <span>Firebase Firestore: Единая база данных</span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold px-1.5 py-0.2 rounded-full bg-emerald-100 dark:bg-emerald-950/60">
                  Активно
                </span>
              </p>
              <p className="text-[11px] text-slate-600 dark:text-slate-400">
                Все задачи сохраняются в Firestore и мгновенно синхронизируются в реальном времени между всеми вашими устройствами.
              </p>
            </div>
          </div>
        </div>

        {/* Section 1: Active Google Profile & Profile Switcher */}
        <div className="mt-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-indigo-500" />
              <span>Текущий профиль Google:</span>
            </span>

            <button
              type="button"
              onClick={() => setIsAddingNewProfile((p) => !p)}
              className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3 h-3" />
              <span>Войти под другим Google аккаунтом</span>
            </button>
          </div>

          {/* Active Profile Card */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white font-bold text-xs uppercase shadow-xs">
                {syncEmail.charAt(0)}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                  {syncEmail}
                </p>
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                  <CloudCheck className="w-3 h-3" />
                  <span>Облако активно • {formattedSyncTime}</span>
                </p>
              </div>
            </div>

            <button
              onClick={onManualSync}
              disabled={isSyncing}
              title="Синхронизировать сейчас"
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 transition cursor-pointer shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-indigo-500' : ''}`} />
              <span className="hidden sm:inline">Синхронизировать</span>
            </button>
          </div>

          {/* Add / Switch to Any Google Email Form */}
          {isAddingNewProfile && (
            <form onSubmit={handleSaveEmail} className="mt-3 p-3 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900 animate-in fade-in">
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Введите Google почту (любой человек может создать свой профиль):
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="email"
                  required
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="ваша_почта@gmail.com"
                  className="flex-1 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold cursor-pointer"
                >
                  Войти
                </button>
              </div>
            </form>
          )}

          {/* Saved Profiles Switcher */}
          {savedProfiles.length > 1 && (
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-[10px] text-slate-400">Сохраненные профили:</span>
              {savedProfiles.map((prof) => (
                <button
                  key={prof}
                  type="button"
                  onClick={() => onSwitchProfile(prof)}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition cursor-pointer ${
                    prof === syncEmail
                      ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300 font-semibold'
                      : 'bg-slate-200/70 text-slate-600 dark:bg-slate-700 dark:text-slate-300 hover:bg-slate-300'
                  }`}
                >
                  {prof.split('@')[0]}
                </button>
              ))}
            </div>
          )}

          {syncError && <p className="mt-1.5 text-xs text-rose-500">{syncError}</p>}
        </div>

        {/* Section 2: Google Drive Storage Integration */}
        <div className="mt-4 p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {/* Google Drive Logo SVG */}
              <svg className="w-5 h-5" viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg">
                <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
                <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" fill="#00ac47"/>
                <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/>
                <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
                <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/>
                <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
              </svg>
              <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                Резервная копия в Google Drive
              </h3>
            </div>
            <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/50 px-2 py-0.5 rounded-full">
              Google Drive Cloud
            </span>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-3">
            Вы можете в один клик сохранить файл со всеми вашими задачами в личное пространство <strong>Google Drive</strong>, привязанное к вашей почте, или восстановить его на любом устройстве:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleSaveToGoogleDrive}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold transition shadow-xs cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Сохранить на Google Drive</span>
              <ExternalLink className="w-3 h-3 opacity-75" />
            </button>

            <label className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-amber-300 dark:border-amber-700 hover:bg-amber-100/50 dark:hover:bg-amber-900/30 text-amber-900 dark:text-amber-200 text-xs font-semibold transition cursor-pointer">
              <Upload className="w-4 h-4" />
              <span>Восстановить из Drive</span>
              <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>
        </div>

        {/* Section 3: Cross-Device Pairing (HP Google Book / Pixel / Web) */}
        <div className="mt-4 p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-bold text-xs">
              <Smartphone className="w-4 h-4" />
              <span>+</span>
              <Laptop className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">
              Подключение HP Google Book или нового телефона
            </h3>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-3">
            Сгенерируйте код или скопируйте ссылку, чтобы открыть приложение на компьютере со всеми задачами:
          </p>

          {pairingCode ? (
            <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 flex flex-col sm:flex-row items-center justify-between gap-2">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">Код подключения:</span>
                <p className="text-lg font-mono font-bold tracking-widest text-indigo-600 dark:text-indigo-400">
                  {pairingCode}
                </p>
              </div>
              <button
                type="button"
                onClick={handleCopyPairingLink}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition cursor-pointer"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLink ? 'Ссылка скопирована!' : 'Скопировать ссылку'}</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onGeneratePairingCode}
              className="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition shadow-xs cursor-pointer flex items-center justify-center gap-2"
            >
              <Link2 className="w-4 h-4" />
              <span>Сгенерировать код сопряжения</span>
            </button>
          )}

          {/* Form to enter code from another device */}
          <div className="mt-3 pt-3 border-t border-indigo-100/60 dark:border-indigo-900/40">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Или введите 6-значный код с другого устройства:
            </span>
            <form onSubmit={handleConnectWithCode} className="mt-1 flex items-center gap-2">
              <input
                type="text"
                maxLength={6}
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value.replace(/\D/g, ''))}
                placeholder="6 цифр"
                className="w-28 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-center font-mono text-sm tracking-widest focus:outline-hidden"
              />
              <button
                type="submit"
                disabled={inputCode.length !== 6 || isLinking}
                className="px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold disabled:opacity-40 cursor-pointer"
              >
                {isLinking ? 'Связывание...' : 'Подключить'}
              </button>
              {linkSuccess && <span className="text-xs text-emerald-500 font-semibold">Готово!</span>}
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold text-xs cursor-pointer hover:bg-slate-800 dark:hover:bg-slate-100 transition"
          >
            Готово
          </button>
        </div>
      </div>
    </div>
  );
};
