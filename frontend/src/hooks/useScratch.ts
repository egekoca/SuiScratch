import { useRef, useState, useCallback, useEffect } from 'react';
import { GameState } from '@/types/game';
import { getPosition } from '@/utils/canvasUtils';

const SCRATCH_THRESHOLD = 2000;

export const useScratch = (
  canvasRef: React.RefObject<HTMLCanvasElement>,
  gameState: GameState,
  onReveal: () => void
) => {
  const isDrawing = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const scratchProgress = useRef(0);
  const [currentPoint, setCurrentPoint] = useState<{ x: number; y: number } | null>(null);

  const startScratch = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (gameState !== 'PLAYING') return;
      isDrawing.current = true;
      const pos = getPosition(e, canvasRef.current);
      lastPoint.current = pos;
      setCurrentPoint(pos);
    },
    [gameState, canvasRef]
  );

  const moveScratch = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (gameState !== 'PLAYING') return;
      if (e.type === 'touchmove' && !isDrawing.current) return;

      const canvas = canvasRef.current;
      if (!canvas || !canvas.getContext('2d')) return;
      const ctx = canvas.getContext('2d')!;

      const currentPos = getPosition(e, canvasRef.current);
      const last = lastPoint.current || currentPos;

      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(currentPos.x, currentPos.y);
      ctx.lineWidth = 60;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#000';
      ctx.stroke();

      const dist = Math.hypot(currentPos.x - last.x, currentPos.y - last.y);
      scratchProgress.current += dist;
      lastPoint.current = currentPos;
      setCurrentPoint(currentPos);

      if (scratchProgress.current > SCRATCH_THRESHOLD) {
        onReveal();
      }
    },
    [gameState, canvasRef, onReveal]
  );

  const endScratch = useCallback(() => {
    isDrawing.current = false;
  }, []);

  const handleMouseEnter = useCallback(
    (e: React.MouseEvent) => {
      if (gameState === 'PLAYING') {
        const pos = getPosition(e, canvasRef.current);
        lastPoint.current = pos;
        setCurrentPoint(pos);
      }
    },
    [gameState, canvasRef]
  );

  const resetScratch = useCallback(() => {
    scratchProgress.current = 0;
    lastPoint.current = null;
    setCurrentPoint(null);
  }, []);

  useEffect(() => {
    const upHandler = () => {
      isDrawing.current = false;
    };
    window.addEventListener('mouseup', upHandler);
    window.addEventListener('touchend', upHandler);
    return () => {
      window.removeEventListener('mouseup', upHandler);
      window.removeEventListener('touchend', upHandler);
    };
  }, []);

  return {
    isDrawing: isDrawing.current,
    lastPoint: currentPoint,
    startScratch,
    moveScratch,
    endScratch,
    handleMouseEnter,
    resetScratch,
  };
};

