import { useRef, useState, useCallback, useEffect } from 'react';
import { GameState } from '@/types/game';
import { getPosition } from '@/utils/canvasUtils';

const SCRATCH_PERCENTAGE_THRESHOLD = 0.7; // %70

export const useScratch = (
  canvasRef: React.RefObject<HTMLCanvasElement>,
  gameState: GameState,
  onReveal: () => void
) => {
  const isDrawing = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const scratchedPixels = useRef(0);
  const totalPixels = useRef(0);
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

  const calculateScratchedArea = useCallback((canvas: HTMLCanvasElement): number => {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return 0;

    // Use sampling for better performance (check every 4th pixel)
    const sampleRate = 4;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    let transparentPixels = 0;
    let totalSampled = 0;

    // Count transparent pixels with sampling
    for (let i = 3; i < data.length; i += sampleRate * 4) {
      totalSampled++;
      if (data[i] === 0) {
        transparentPixels++;
      }
    }

    // Extrapolate to total pixels
    return Math.round((transparentPixels / totalSampled) * (canvas.width * canvas.height));
  }, []);

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

      lastPoint.current = currentPos;
      setCurrentPoint(currentPos);

      // Calculate scratched area percentage
      if (totalPixels.current === 0) {
        totalPixels.current = canvas.width * canvas.height;
      }

      // Throttle the calculation to avoid performance issues
      const now = Date.now();
      if (!(window as any).lastScratchCheck) {
        (window as any).lastScratchCheck = now;
      }

        if (now - (window as any).lastScratchCheck > 100) {
        // Check every 100ms
        scratchedPixels.current = calculateScratchedArea(canvas);
        const scratchedPercentage = scratchedPixels.current / totalPixels.current;

        if (scratchedPercentage >= SCRATCH_PERCENTAGE_THRESHOLD) {
          // Clear entire canvas to reveal all
          ctx.save();
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.restore();
          onReveal();
        }
        (window as any).lastScratchCheck = now;
      }
    },
    [gameState, canvasRef, onReveal, calculateScratchedArea]
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
    scratchedPixels.current = 0;
    totalPixels.current = 0;
    lastPoint.current = null;
    setCurrentPoint(null);
    (window as any).lastScratchCheck = 0;
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

