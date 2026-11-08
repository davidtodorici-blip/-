/**
 * Types for the Eisenhower Matrix App
 */

export type QuadrantId = 'q1' | 'q2' | 'q3' | 'q4';

export interface Task {
  id: string;
  title: string;
  quadrant: QuadrantId;
  completed: boolean;
  completedAt?: number;
  isFading?: boolean;
  dueDate?: string; // ISO date-time string optional
  createdAt: number;
  syncedToCalendar?: boolean;
  order?: number;
}

export type SortOption = 'manual' | 'newest' | 'oldest' | 'dueDate' | 'aging';

export interface QuadrantConfig {
  id: QuadrantId;
  num: 1 | 2 | 3 | 4;
  title: string;
  subtitle: string;
  urgency: string;
  importance: string;
  color: {
    accent: string;
    bgLight: string;
    bgDark: string;
    borderLight: string;
    borderDark: string;
    badgeBgLight: string;
    badgeBgDark: string;
    badgeText: string;
    indicator: string;
    ring: string;
  };
}

export interface DragItem {
  taskId: string;
  sourceQuadrant: QuadrantId;
  taskTitle: string;
  elementWidth?: number;
}
