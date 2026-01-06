import { GameMode } from '@/types/game';

export const initCanvas = (
  canvas: HTMLCanvasElement | null,
  selectedMode: GameMode
): void => {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();

  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);

  const gradient = ctx.createLinearGradient(0, 0, rect.width, rect.height);
  if (selectedMode.id === 'GOLD') {
    gradient.addColorStop(0, '#f59e0b');
    gradient.addColorStop(1, '#b45309');
  } else if (selectedMode.id === 'PLATINUM') {
    gradient.addColorStop(0, '#a855f7');
    gradient.addColorStop(1, '#4f46e5');
  } else {
    gradient.addColorStop(0, '#3b82f6');
    gradient.addColorStop(1, '#1e40af');
  }

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, rect.width, rect.height);

  // Decorative pattern
  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  for (let i = 0; i < 50; i++) {
    const x = Math.random() * rect.width;
    const y = Math.random() * rect.height;
    const size = Math.random() * 8 + 2;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.shadowColor = 'rgba(0,0,0,0.3)';
  ctx.shadowBlur = 4;
  ctx.shadowOffsetY = 2;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  ctx.font = '800 24px "Inter", sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(selectedMode.name.toUpperCase(), rect.width / 2, 30);

  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = '12px "Inter", sans-serif';
  ctx.fillText('SCRATCH & WIN', rect.width / 2, 60);

  ctx.textBaseline = 'middle';
  ctx.font = '900 60px "Inter", sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.fillText('SUI', rect.width / 2, rect.height / 2);

  ctx.shadowColor = 'transparent';
  ctx.globalCompositeOperation = 'source-over';
};

export const getPosition = (
  e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent,
  canvas: HTMLCanvasElement | null
): { x: number; y: number } => {
  if (!canvas) return { x: 0, y: 0 };
  const rect = canvas.getBoundingClientRect();
  let clientX: number, clientY: number;

  if ('touches' in e && e.touches.length > 0) {
    clientX = e.touches[0].clientX;
    clientY = e.touches[0].clientY;
  } else if ('clientX' in e) {
    clientX = (e as React.MouseEvent).clientX;
    clientY = (e as React.MouseEvent).clientY;
  } else return { x: 0, y: 0 };

  return { x: clientX - rect.left, y: clientY - rect.top };
};

