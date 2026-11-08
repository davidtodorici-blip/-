import { Task } from '../types';
import { QUADRANTS } from '../quadrantConfig';

function formatToGoogleCalendarDate(d: Date): string {
  return d.toISOString().replace(/-|:|\.\d\d\d/g, '');
}

export function createGoogleCalendarUrl(task: Task): string {
  const quadConfig = QUADRANTS.find((q) => q.id === task.quadrant);
  const quadName = quadConfig ? `${quadConfig.num}: ${quadConfig.title}` : task.quadrant;

  let startDate: Date;
  let endDate: Date;

  if (task.dueDate) {
    startDate = new Date(task.dueDate);
    if (isNaN(startDate.getTime())) {
      startDate = new Date();
      startDate.setHours(startDate.getHours() + 1);
    }
    endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // 1 hour event
  } else {
    // Default to today + 1 hour
    startDate = new Date();
    startDate.setHours(startDate.getHours() + 1, 0, 0, 0);
    endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
  }

  const startFormatted = formatToGoogleCalendarDate(startDate);
  const endFormatted = formatToGoogleCalendarDate(endDate);

  const title = encodeURIComponent(task.title);
  const details = encodeURIComponent(
    `Матрица Эйзенхауэра\nКвадрант: ${quadName}\nСоздана: ${new Date(
      task.createdAt
    ).toLocaleDateString('ru-RU')}`
  );

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startFormatted}/${endFormatted}&details=${details}`;
}

export function generateIcsFile(tasks: Task[]): void {
  const validTasks = tasks.filter((t) => !t.completed);
  if (validTasks.length === 0) return;

  const now = new Date();
  const nowFormatted = formatToGoogleCalendarDate(now);

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Матрица Эйзенхауэра//RU',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Матрица Эйзенхауэра',
  ];

  validTasks.forEach((task) => {
    const quad = QUADRANTS.find((q) => q.id === task.quadrant);
    let start = task.dueDate ? new Date(task.dueDate) : new Date(task.createdAt);
    if (isNaN(start.getTime())) start = new Date();
    const end = new Date(start.getTime() + 3600000);

    const priorityMap: Record<string, string> = {
      q1: '1',
      q2: '5',
      q3: '9',
      q4: '9',
    };

    lines.push(
      'BEGIN:VEVENT',
      `UID:${task.id}@eisenhower.matrix`,
      `DTSTAMP:${nowFormatted}`,
      `DTSTART:${formatToGoogleCalendarDate(start)}`,
      `DTEND:${formatToGoogleCalendarDate(end)}`,
      `SUMMARY:${task.title}`,
      `DESCRIPTION:Квадрант: ${quad?.title || task.quadrant}`,
      `PRIORITY:${priorityMap[task.quadrant] || '5'}`,
      'STATUS:CONFIRMED',
      'END:VEVENT'
    );
  });

  lines.push('END:VCALENDAR');

  const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'eisenhower-matrix-calendar.ics';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
