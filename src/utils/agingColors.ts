import { QuadrantId } from '../types';

export interface AgingStyle {
  backgroundColor: string;
  borderColor: string;
  textColor: string;
  badgeBg: string;
  badgeText: string;
  daysOld: number;
  progress: number; // 0.0 to 1.0
  ageLabel: string;
  tendencyLabel: string;
}

// Helper to interpolate between two RGB colors
function interpolateRgb(
  r1: number, g1: number, b1: number,
  r2: number, g2: number, b2: number,
  factor: number
): string {
  const f = Math.min(Math.max(factor, 0), 1);
  const r = Math.round(r1 + (r2 - r1) * f);
  const g = Math.round(g1 + (g2 - g1) * f);
  const b = Math.round(b1 + (b2 - b1) * f);
  return `rgb(${r}, ${g}, ${b})`;
}

export function getTaskAgingStyle(
  quadrant: QuadrantId,
  createdAt: number,
  isDarkMode: boolean
): AgingStyle {
  const now = Date.now();
  const elapsedMs = Math.max(0, now - createdAt);
  const daysOld = Math.floor(elapsedMs / (1000 * 60 * 60 * 24));
  // Progress from 0.0 (day 0) to 1.0 (day 7+)
  const progress = Math.min(elapsedMs / (7 * 24 * 60 * 60 * 1000), 1.0);

  let ageLabel = 'Сегодня';
  if (daysOld === 1) ageLabel = '1 день';
  else if (daysOld >= 2 && daysOld <= 4) ageLabel = `${daysOld} дня`;
  else if (daysOld >= 5) ageLabel = `${daysOld} дней`;

  // Base colors
  // White/Light slate on Day 0
  const baseBgLight = [255, 255, 255];
  const baseBgDark = [15, 23, 42]; // slate-900

  let bg = '';
  let border = '';
  let text = isDarkMode ? 'text-slate-100' : 'text-slate-800';
  let badgeBg = '';
  let badgeText = '';
  let tendencyLabel = '';

  switch (quadrant) {
    case 'q4': {
      // Q4: Отбросить (Starts neutral/greenish-white, in 7 days smoothly tints yellow/amber towards Q3)
      tendencyLabel = progress > 0.15 ? '→ Делегировать' : '';
      if (!isDarkMode) {
        // Blends white towards soft amber/yellow: rgb(254, 243, 199)
        bg = interpolateRgb(255, 255, 255, 254, 243, 199, progress);
        border = interpolateRgb(167, 243, 208, 251, 191, 36, progress); // emerald-200 to amber-400
        badgeBg = 'bg-emerald-100 dark:bg-emerald-950/40';
        badgeText = 'text-emerald-700 dark:text-emerald-300';
      } else {
        // Dark slate towards amber-tinted dark: rgb(45, 34, 15)
        bg = interpolateRgb(15, 23, 42, 45, 34, 15, progress);
        border = interpolateRgb(6, 78, 59, 180, 83, 9, progress);
        badgeBg = 'bg-emerald-950/60';
        badgeText = 'text-emerald-400';
      }
      break;
    }

    case 'q3': {
      // Q3: Делегировать (Starts neutral/amber-white, in 7 days smoothly tints blue towards Q2)
      tendencyLabel = progress > 0.15 ? '→ Запланировать' : '';
      if (!isDarkMode) {
        // Blends white towards soft sky/blue: rgb(224, 242, 254)
        bg = interpolateRgb(255, 255, 255, 219, 234, 254, progress);
        border = interpolateRgb(253, 230, 138, 96, 165, 250, progress); // amber-200 to blue-400
        badgeBg = 'bg-amber-100 dark:bg-amber-950/40';
        badgeText = 'text-amber-700 dark:text-amber-300';
      } else {
        // Dark slate towards blue-tinted dark: rgb(15, 35, 60)
        bg = interpolateRgb(15, 23, 42, 15, 35, 60, progress);
        border = interpolateRgb(120, 53, 15, 29, 78, 216, progress);
        badgeBg = 'bg-amber-950/60';
        badgeText = 'text-amber-400';
      }
      break;
    }

    case 'q2': {
      // Q2: Запланировать (Starts neutral/blue-white, gradually reddens towards Q1, but caps at ~75% red tint, never becoming fully red)
      tendencyLabel = progress > 0.15 ? '→ Сделать' : '';
      const cappedProgress = progress * 0.75; // Doesn't become fully red!
      if (!isDarkMode) {
        // Blends white towards soft rose/red
        bg = interpolateRgb(255, 255, 255, 254, 205, 211, cappedProgress);
        border = interpolateRgb(191, 219, 254, 251, 113, 133, cappedProgress);
        badgeBg = 'bg-blue-100 dark:bg-blue-950/40';
        badgeText = 'text-blue-700 dark:text-blue-300';
      } else {
        // Dark slate towards dark reddish tint
        bg = interpolateRgb(15, 23, 42, 55, 20, 30, cappedProgress);
        border = interpolateRgb(30, 58, 138, 225, 29, 72, cappedProgress);
        badgeBg = 'bg-blue-950/60';
        badgeText = 'text-blue-400';
      }
      break;
    }

    case 'q1': {
      // Q1: Сделать (Over 7 days, progressively reddens, and at 7+ days becomes full vibrant solid red forever)
      tendencyLabel = progress >= 0.99 ? 'Срочно!' : (progress > 0.3 ? 'Критично' : '');
      if (progress >= 0.99) {
        // Solid vivid red forever!
        bg = isDarkMode ? 'rgb(190, 18, 60)' : 'rgb(239, 68, 68)';
        border = isDarkMode ? 'rgb(244, 63, 94)' : 'rgb(220, 38, 38)';
        text = 'text-white font-semibold';
        badgeBg = 'bg-white/20';
        badgeText = 'text-white';
      } else {
        if (!isDarkMode) {
          bg = interpolateRgb(255, 255, 255, 254, 205, 211, progress);
          border = interpolateRgb(254, 205, 211, 239, 68, 68, progress);
        } else {
          bg = interpolateRgb(15, 23, 42, 136, 19, 55, progress);
          border = interpolateRgb(76, 5, 25, 244, 63, 94, progress);
        }
        badgeBg = 'bg-rose-100 dark:bg-rose-950/40';
        badgeText = 'text-rose-700 dark:text-rose-300';
      }
      break;
    }
  }

  return {
    backgroundColor: bg,
    borderColor: border,
    textColor: text,
    badgeBg,
    badgeText,
    daysOld,
    progress,
    ageLabel,
    tendencyLabel,
  };
}
