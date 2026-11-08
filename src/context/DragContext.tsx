import React, { createContext, useContext, useState, useRef, useCallback } from 'react';
import { QuadrantId } from '../types';

interface DragState {
  isDragging: boolean;
  taskId: string | null;
  taskTitle: string | null;
  sourceQuadrant: QuadrantId | null;
  dragX: number;
  dragY: number;
  hoveredQuadrant: QuadrantId | null;
  cardWidth: number;
}

interface DragContextValue {
  dragState: DragState;
  startTouchDrag: (
    taskId: string,
    title: string,
    sourceQuadrant: QuadrantId,
    e: React.TouchEvent | React.PointerEvent,
    cardEl: HTMLElement
  ) => void;
  startHtmlDrag: (taskId: string, sourceQuadrant: QuadrantId, e: React.DragEvent) => void;
  setHoveredQuadrant: (quadrant: QuadrantId | null) => void;
  endHtmlDrag: () => void;
  onDropTaskToQuadrant: (targetQuadrant: QuadrantId) => void;
}

const DragContext = createContext<DragContextValue | null>(null);

export const DragProvider: React.FC<{
  onMoveTask: (taskId: string, targetQuadrant: QuadrantId) => void;
  children: React.ReactNode;
}> = ({ onMoveTask, children }) => {
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    taskId: null,
    taskTitle: null,
    sourceQuadrant: null,
    dragX: 0,
    dragY: 0,
    hoveredQuadrant: null,
    cardWidth: 260,
  });

  const activeTaskIdRef = useRef<string | null>(null);
  const activeSourceRef = useRef<QuadrantId | null>(null);
  const touchOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const setHoveredQuadrant = useCallback((quadrant: QuadrantId | null) => {
    setDragState((prev) => (prev.hoveredQuadrant === quadrant ? prev : { ...prev, hoveredQuadrant: quadrant }));
  }, []);

  const onDropTaskToQuadrant = useCallback(
    (targetQuadrant: QuadrantId) => {
      const taskId = activeTaskIdRef.current;
      if (taskId) {
        onMoveTask(taskId, targetQuadrant);
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          try {
            navigator.vibrate(25);
          } catch {
            // ignore
          }
        }
      }
      activeTaskIdRef.current = null;
      activeSourceRef.current = null;
      setDragState({
        isDragging: false,
        taskId: null,
        taskTitle: null,
        sourceQuadrant: null,
        dragX: 0,
        dragY: 0,
        hoveredQuadrant: null,
        cardWidth: 260,
      });
    },
    [onMoveTask]
  );

  // Desktop HTML5 drag start
  const startHtmlDrag = useCallback((taskId: string, sourceQuadrant: QuadrantId, e: React.DragEvent) => {
    activeTaskIdRef.current = taskId;
    activeSourceRef.current = sourceQuadrant;
    e.dataTransfer.setData('text/plain', taskId);
    e.dataTransfer.effectAllowed = 'move';
    setDragState((prev) => ({
      ...prev,
      isDragging: true,
      taskId,
      sourceQuadrant,
    }));
  }, []);

  const endHtmlDrag = useCallback(() => {
    activeTaskIdRef.current = null;
    activeSourceRef.current = null;
    setDragState({
      isDragging: false,
      taskId: null,
      taskTitle: null,
      sourceQuadrant: null,
      dragX: 0,
      dragY: 0,
      hoveredQuadrant: null,
      cardWidth: 260,
    });
  }, []);

  // Mobile Touch drag start
  const startTouchDrag = useCallback(
    (
      taskId: string,
      title: string,
      sourceQuadrant: QuadrantId,
      e: React.TouchEvent | React.PointerEvent,
      cardEl: HTMLElement
    ) => {
      // Prevent default gesture
      if ('touches' in e && e.touches.length > 1) return;

      const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.PointerEvent).clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.PointerEvent).clientY;

      const rect = cardEl.getBoundingClientRect();
      touchOffsetRef.current = {
        x: clientX - rect.left,
        y: clientY - rect.top,
      };

      activeTaskIdRef.current = taskId;
      activeSourceRef.current = sourceQuadrant;

      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try {
          navigator.vibrate(20);
        } catch {
          // ignore
        }
      }

      setDragState({
        isDragging: true,
        taskId,
        taskTitle: title,
        sourceQuadrant,
        dragX: clientX,
        dragY: clientY,
        hoveredQuadrant: sourceQuadrant,
        cardWidth: rect.width,
      });

      const handleMove = (moveEv: TouchEvent | PointerEvent) => {
        const curX = 'touches' in moveEv ? moveEv.touches[0].clientX : (moveEv as PointerEvent).clientX;
        const curY = 'touches' in moveEv ? moveEv.touches[0].clientY : (moveEv as PointerEvent).clientY;

        // Detect quadrant element under pointer
        const elem = document.elementFromPoint(curX, curY);
        const quadEl = elem?.closest('[data-quadrant-id]');
        const targetQuad = quadEl ? (quadEl.getAttribute('data-quadrant-id') as QuadrantId) : null;

        setDragState((prev) => ({
          ...prev,
          dragX: curX,
          dragY: curY,
          hoveredQuadrant: targetQuad,
        }));
      };

      const handleEnd = (endEv: TouchEvent | PointerEvent) => {
        window.removeEventListener('touchmove', handleMove);
        window.removeEventListener('touchend', handleEnd);
        window.removeEventListener('touchcancel', handleEnd);
        window.removeEventListener('pointermove', handleMove);
        window.removeEventListener('pointerup', handleEnd);
        window.removeEventListener('pointercancel', handleEnd);

        let finalX = clientX;
        let finalY = clientY;
        if ('changedTouches' in endEv && endEv.changedTouches.length > 0) {
          finalX = endEv.changedTouches[0].clientX;
          finalY = endEv.changedTouches[0].clientY;
        } else if ('clientX' in endEv) {
          finalX = (endEv as PointerEvent).clientX;
          finalY = (endEv as PointerEvent).clientY;
        }

        const elem = document.elementFromPoint(finalX, finalY);
        const quadEl = elem?.closest('[data-quadrant-id]');
        const finalQuad = quadEl ? (quadEl.getAttribute('data-quadrant-id') as QuadrantId) : null;

        if (finalQuad && activeTaskIdRef.current) {
          onMoveTask(activeTaskIdRef.current, finalQuad);
          if (typeof navigator !== 'undefined' && navigator.vibrate) {
            try {
              navigator.vibrate(30);
            } catch {
              // ignore
            }
          }
        }

        activeTaskIdRef.current = null;
        activeSourceRef.current = null;
        setDragState({
          isDragging: false,
          taskId: null,
          taskTitle: null,
          sourceQuadrant: null,
          dragX: 0,
          dragY: 0,
          hoveredQuadrant: null,
          cardWidth: 260,
        });
      };

      window.addEventListener('touchmove', handleMove, { passive: true });
      window.addEventListener('touchend', handleEnd, { passive: true });
      window.addEventListener('touchcancel', handleEnd, { passive: true });
      window.addEventListener('pointermove', handleMove);
      window.addEventListener('pointerup', handleEnd);
      window.addEventListener('pointercancel', handleEnd);
    },
    [onMoveTask]
  );

  return (
    <DragContext.Provider
      value={{
        dragState,
        startTouchDrag,
        startHtmlDrag,
        setHoveredQuadrant,
        endHtmlDrag,
        onDropTaskToQuadrant,
      }}
    >
      {children}
    </DragContext.Provider>
  );
};

export function useDragContext() {
  const ctx = useContext(DragContext);
  if (!ctx) {
    throw new Error('useDragContext must be used within DragProvider');
  }
  return ctx;
}
