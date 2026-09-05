import React, { useRef, useEffect, useState } from 'react';
import { getNinjaTomatoSpritesUrl } from '../assets';
import { HAS_NINJA_SCENE } from '../../shared/target';
import FocusOrbitScene from './FocusOrbitScene';
import LightGardenScene from './LightGardenScene';
import FocusTreeScene from './FocusTreeScene';

// «Сцена» — ambient pixel-art animation under the timer.
//
// Styles (each bundles variants for the work modes):
//   'flight' — кораблик летит вправо и уклоняется от препятствий;
//              в паузе — спокойный дрейф; при БЕЗДЕЙСТВИИ (чистое время
//              поставило таймер на паузу) анимация полностью замирает.
//   'chart'  — график активности: пока пользователь работает (таймер идёт,
//              бездействия нет) — линия растёт вверх с зелёной стрелкой;
//              стоит отойти — график ползёт вниз с красной стрелкой.
//
// Rendering: a tiny logical grid scaled up with smoothing off — chunky pixels.

export interface SceneProps {
  mode: 'focus' | 'break';
  running: boolean;
  idle: boolean;   // pure-time auto-pause: the user is away from the keyboard
  accent: string;
  style?: string;  // 'ninja' | 'flight' | 'chart'
  speed?: number;  // animation speed in percent
  status?: 'idle' | 'running' | 'paused' | 'completed' | 'waiting';
  lang?: 'ru' | 'en';
  // Bumped when an interval finishes: the chart scene then freezes and shows
  // the WHOLE session compressed to the module width (см. summary ниже).
  summaryKey?: number;
  progress?: number;
  // Real seconds reported by the timer engine. The activity chart uses this
  // instead of its own interval so its clean time cannot run one tick ahead.
  elapsedSeconds?: number;
}

const W = 192;
const H = 72;

// 8×6 pixel ship sprite (0 = empty, 1 = hull, 2 = accent, 3 = window glow).
const SHIP: number[][] = [
  [0, 0, 1, 0, 0, 0, 0, 0],
  [0, 1, 2, 1, 1, 0, 0, 0],
  [1, 2, 2, 3, 2, 1, 1, 1],
  [1, 2, 2, 3, 2, 1, 1, 1],
  [0, 1, 2, 1, 1, 0, 0, 0],
  [0, 0, 1, 0, 0, 0, 0, 0],
];

const GREEN = '#3FAE79';
const RED = '#D95757';

interface Obstacle { x: number; gapY: number; gapH: number; w: number }
interface Star { x: number; y: number; speed: number; tone: number }

type ActivityState = 1 | 0 | -1; // active | idle | manually paused

interface ActivityMetrics {
  samples: number;
  focus: number;
  activeSeconds: number;
  idleSeconds: number;
  pausedSeconds: number;
  interruptions: number;
  longestStreak: number;
}

const EMPTY_METRICS: ActivityMetrics = {
  samples: 0,
  focus: 0,
  activeSeconds: 0,
  idleSeconds: 0,
  pausedSeconds: 0,
  interruptions: 0,
  longestStreak: 0,
};

function metricsFromHistory(history: ActivityState[]): ActivityMetrics {
  let activeSeconds = 0;
  let idleSeconds = 0;
  let pausedSeconds = 0;
  let interruptions = 0;
  let currentStreak = 0;
  let longestStreak = 0;
  let wasInterrupted = false;

  for (const state of history) {
    if (state === 1) {
      activeSeconds++;
      currentStreak++;
      longestStreak = Math.max(longestStreak, currentStreak);
      wasInterrupted = false;
    } else {
      if (!wasInterrupted && (idleSeconds + pausedSeconds > 0 || activeSeconds > 0)) interruptions++;
      wasInterrupted = true;
      currentStreak = 0;
      if (state === 0) idleSeconds++;
      else pausedSeconds++;
    }
  }

  const measured = activeSeconds + idleSeconds;
  return {
    samples: history.length,
    focus: measured ? activeSeconds / measured : 0,
    activeSeconds,
    idleSeconds,
    pausedSeconds,
    interruptions,
    longestStreak,
  };
}

const formatShortTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

const colorWithAlpha = (color: string, alpha: number) => {
  const hex = color.replace('#', '');
  if (/^[\da-f]{6}$/i.test(hex)) {
    const value = Number.parseInt(hex, 16);
    return `rgba(${(value >> 16) & 255},${(value >> 8) & 255},${value & 255},${alpha})`;
  }
  return color;
};

function CanvasScene({
  mode,
  running,
  idle,
  accent,
  style = 'flight',
  speed = 100,
  summaryKey = 0,
  status = 'idle',
  lang = 'ru',
  elapsedSeconds = 0,
}: SceneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [activityMetrics, setActivityMetrics] = useState<ActivityMetrics>(EMPTY_METRICS);
  const sim = useRef({
    shipY: H / 2, shipVy: 0, t: 0,
    obstacles: [] as Obstacle[],
    stars: [] as Star[],
    nextSpawn: 60,
    // Active seconds come from the timer engine; idle/pause context is sampled
    // around them. The curve is a rolling 60-second focus ratio.
    points: [0] as number[],
    history: [] as ActivityState[],
    lastSampleAt: 0,
    lastEngineSecond: 0,
    summary: null as null | { pts: number[]; metrics: ActivityMetrics },
  });
  const propsRef = useRef({
    mode,
    running,
    idle,
    accent,
    style,
    speed,
    status,
    lang,
    elapsedSeconds,
  });
  propsRef.current = {
    mode,
    running,
    idle,
    accent,
    style,
    speed,
    status,
    lang,
    elapsedSeconds,
  };
  const previousStatus = useRef(status);

  // Таймер отработал → замораживаем сцену и строим итоговый график.
  useEffect(() => {
    const s = sim.current;
    if (summaryKey <= 0) return;
    const h = s.history;
    if (h.length < 2) { s.summary = null; return; }
    // «По-умному ужать»: делим всю историю на W-2 колонок и берём максимум в
    // каждой корзине — так всплески активности не теряются при сжатии
    // (усреднение бы их сгладило), а провалы простоя остаются видны.
    const cols = Math.min(72, h.length);
    const per = h.length / cols;
    const pts: number[] = [];
    let previous = 0.5;
    for (let i = 0; i < cols; i++) {
      const from = Math.floor(i * per);
      const to = Math.max(from + 1, Math.floor((i + 1) * per));
      const measured = h.slice(from, Math.min(to, h.length)).filter(v => v >= 0);
      if (measured.length) previous = measured.reduce<number>((a, b) => a + b, 0) / measured.length;
      pts.push(previous);
    }
    const metrics = metricsFromHistory(h);
    s.summary = {
      pts, metrics,
    };
  }, [summaryKey]);

  // Новый запуск — сбрасываем итог и копим историю заново.
  useEffect(() => {
    const previous = previousStatus.current;
    const beginsNewInterval = status === 'running'
      && (previous === 'idle' || previous === 'waiting' || previous === 'completed');
    if (beginsNewInterval) {
      sim.current.summary = null;
      sim.current.history = [];
      // A real zero point keeps both the line and all counters at 00:00 until
      // the engine reports its first completed second.
      sim.current.points = [0];
      sim.current.lastSampleAt = performance.now();
      sim.current.lastEngineSecond = 0;
      setActivityMetrics(EMPTY_METRICS);
    }
    previousStatus.current = status;
  }, [status]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const s = sim.current;
    if (s.stars.length === 0) {
      for (let i = 0; i < 42; i++) {
        s.stars.push({ x: Math.random() * W, y: Math.random() * H, speed: 0.2 + Math.random() * 0.9, tone: Math.random() });
      }
    }
    let raf = 0;
    let last = performance.now();

    const drawFlight = (px: number, speed: number) => {
      const { mode: m, running: run, accent: acc } = propsRef.current;
      const isFocus = m === 'focus';
      s.t += speed;

      for (const st of s.stars) {
        st.x -= st.speed * speed * 1.6;
        if (st.x < 0) { st.x = W + Math.random() * 8; st.y = Math.random() * H; }
      }
      if (isFocus && run) {
        s.nextSpawn -= speed;
        if (s.nextSpawn <= 0) {
          const gapH = 22 + Math.random() * 14;
          s.obstacles.push({ x: W + 6, gapY: 8 + Math.random() * (H - gapH - 16), gapH, w: 7 });
          s.nextSpawn = 55 + Math.random() * 50;
        }
      }
      for (const o of s.obstacles) o.x -= 1.1 * speed;
      s.obstacles = s.obstacles.filter(o => o.x + o.w > -2);

      let targetY = H / 2 + Math.sin(s.t * 0.05) * (isFocus ? 6 : 12);
      const next = s.obstacles.find(o => o.x + o.w > 16);
      if (next && next.x < W * 0.75) targetY = next.gapY + next.gapH / 2;
      s.shipVy += (targetY - s.shipY) * (isFocus ? 0.045 : 0.02);
      s.shipVy *= 0.82;
      s.shipY = Math.max(6, Math.min(H - 10, s.shipY + s.shipVy));

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const st of s.stars) {
        ctx.fillStyle = st.tone > 0.66 ? '#5a5a72' : st.tone > 0.33 ? '#3d3d52' : '#2a2a3a';
        ctx.fillRect(Math.floor(st.x) * px, Math.floor(st.y) * px, px, px);
      }
      ctx.fillStyle = '#3a3f55';
      for (const o of s.obstacles) {
        const x = Math.floor(o.x) * px, w = o.w * px;
        ctx.fillRect(x, 0, w, Math.floor(o.gapY) * px);
        ctx.fillRect(x, Math.floor(o.gapY + o.gapH) * px, w, canvas.height);
        ctx.fillStyle = '#4d5470';
        ctx.fillRect(x, (Math.floor(o.gapY) - 1) * px, w, px);
        ctx.fillRect(x, Math.floor(o.gapY + o.gapH) * px, w, px);
        ctx.fillStyle = '#3a3f55';
      }
      const sx = 18, sy = Math.floor(s.shipY);
      for (let i = 1; i <= 5; i++) {
        ctx.fillStyle = `rgba(255,255,255,${0.16 - i * 0.028})`;
        ctx.fillRect((sx - 2 - i * 2) * px, (sy + 2) * px, px * 2, px);
      }
      for (let ry = 0; ry < SHIP.length; ry++) {
        for (let rx = 0; rx < SHIP[ry].length; rx++) {
          const v = SHIP[ry][rx];
          if (!v) continue;
          ctx.fillStyle = v === 1 ? '#d8d8e4' : v === 2 ? acc : '#fff7c9';
          ctx.fillRect((sx + rx) * px, (sy - 3 + ry) * px, px, px);
        }
      }
      if (m === 'break') {
        ctx.fillStyle = 'rgba(120,200,160,0.7)';
        const zx = (sx + 12 + Math.sin(s.t * 0.03) * 3) | 0;
        const zy = (sy - 8 - ((s.t * 0.1) % 6)) | 0;
        if (zy > 2) { ctx.fillRect(zx * px, zy * px, px, px); ctx.fillRect((zx + 2) * px, (zy - 2) * px, px, px); }
      }
    };

    const drawChart = (px: number, now: number) => {
      const {
        mode: currentMode,
        running: isRunning,
        idle: isAway,
        status: currentStatus,
        accent: currentAccent,
        elapsedSeconds: currentElapsedSeconds,
      } = propsRef.current;

      const appendActivity = (state: ActivityState) => {
        s.history.push(state);
        const measuredTail = s.history.filter(v => v >= 0).slice(-60);
        const ratio = measuredTail.length
          ? measuredTail.filter(v => v === 1).length / measuredTail.length
          : 0;
        s.points.push(ratio);
        if (s.points.length > 72) s.points.shift();
      };

      let metricsChanged = false;
      if (currentMode === 'focus') {
        const engineSecond = Math.max(0, Math.floor(currentElapsedSeconds));
        const completedSeconds = Math.max(0, engineSecond - s.lastEngineSecond);
        for (let i = 0; i < completedSeconds; i++) appendActivity(1);
        if (completedSeconds > 0) {
          s.lastEngineSecond = engineSecond;
          s.lastSampleAt = now;
          metricsChanged = true;
        }
      }
      if (currentMode === 'focus'
        && !(isRunning && !isAway)
        && (isRunning || currentStatus === 'paused')
        && now - s.lastSampleAt >= 1000) {
        // Idle and manual-pause spans are wall-clock context around the clean
        // engine time. They never increment the clean-time counter itself.
        appendActivity(isAway ? 0 : -1);
        s.lastSampleAt = now;
        metricsChanged = true;
      }
      if (metricsChanged) {
        setActivityMetrics(metricsFromHistory(s.history));
      }

      let points = s.summary && !isRunning ? s.summary.pts : s.points;
      if (currentMode === 'break' && !(s.summary && !isRunning)) {
        points = Array.from({ length: 48 }, (_, i) => 0.55 + Math.sin(i * 0.24 + now * 0.001) * 0.08);
      }
      if (!points.length) points = [0, 0];

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.scale(px, px);
      ctx.imageSmoothingEnabled = true;

      const chartTop = 27;
      const chartBottom = 61;
      const chartLeft = 6;
      const chartRight = W - 6;
      const yOf = (value: number) => chartBottom - value * (chartBottom - chartTop);
      const xOf = (index: number) => chartLeft
        + (index / Math.max(1, points.length - 1)) * (chartRight - chartLeft);

      ctx.strokeStyle = 'rgba(255,255,255,0.04)';
      ctx.lineWidth = 0.5;
      for (const y of [chartTop, (chartTop + chartBottom) / 2, chartBottom]) {
        ctx.beginPath();
        ctx.moveTo(chartLeft, y);
        ctx.lineTo(chartRight, y);
        ctx.stroke();
      }

      const trace = () => {
        ctx.beginPath();
        ctx.moveTo(xOf(0), yOf(points[0]));
        for (let i = 1; i < points.length; i++) {
          const x = xOf(i);
          const y = yOf(points[i]);
          const previousX = xOf(i - 1);
          const previousY = yOf(points[i - 1]);
          const middleX = (previousX + x) / 2;
          ctx.quadraticCurveTo(previousX, previousY, middleX, (previousY + y) / 2);
          if (i === points.length - 1) ctx.quadraticCurveTo(x, y, x, y);
        }
      };

      trace();
      ctx.lineTo(chartRight, chartBottom);
      ctx.lineTo(chartLeft, chartBottom);
      ctx.closePath();
      const fill = ctx.createLinearGradient(0, chartTop, 0, chartBottom);
      fill.addColorStop(0, colorWithAlpha(currentAccent, currentMode === 'break' ? 0.08 : 0.13));
      fill.addColorStop(1, colorWithAlpha(currentAccent, 0));
      ctx.fillStyle = fill;
      ctx.fill();

      trace();
      ctx.strokeStyle = currentAccent;
      ctx.lineWidth = 0.9;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.shadowColor = currentAccent;
      ctx.shadowBlur = 1.5;
      ctx.stroke();
      ctx.shadowBlur = 0;

      const lastX = xOf(points.length - 1);
      const lastY = yOf(points[points.length - 1]);
      ctx.beginPath();
      ctx.arc(lastX, lastY, 2.2, 0, Math.PI * 2);
      ctx.fillStyle = colorWithAlpha(currentAccent, 0.12);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(lastX, lastY, 0.9, 0, Math.PI * 2);
      ctx.fillStyle = currentAccent;
      ctx.fill();

      const rail = s.history.slice(-96);
      if (currentMode === 'focus' && rail.length) {
        const railWidth = chartRight - chartLeft;
        const segment = railWidth / rail.length;
        rail.forEach((state, index) => {
          ctx.fillStyle = state === 1 ? currentAccent : state === 0 ? '#8a7257' : '#5c6069';
          ctx.globalAlpha = state === 1 ? 0.82 : 0.55;
          ctx.fillRect(chartLeft + index * segment, 60, Math.max(0.8, segment), 1.5);
        });
        ctx.globalAlpha = 1;
      }
      ctx.restore();
    };

    const step = (now: number) => {
      raf = requestAnimationFrame(step);
      if (now - last < 33) return;
      const dtn = Math.min(3, (now - last) / 33);
      last = now;
      if (document.hidden) return;

      const { mode: m, running: run, idle: away, style: st, speed: sceneSpeed } = propsRef.current;
      const speedRate = Math.max(0.5, Math.min(2, sceneSpeed / 100));
      const px = canvas.width / W;
      ctx.imageSmoothingEnabled = false;

      if (st === 'chart') {
        drawChart(px, now);
        return;
      }
      // flight: freeze the WHOLE scene while the user is away (чистое время
      // paused the timer) — the world stops with them.
      if (away) return;
      const frameSpeed = (run ? (m === 'focus' ? 1.6 : 0.7) : 0.25) * dtn * speedRate;
      drawFlight(px, frameSpeed);
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [style]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const fit = () => {
      const rect = canvas.getBoundingClientRect();
      const scale = Math.max(2, Math.floor((rect.width * window.devicePixelRatio) / W));
      canvas.width = W * scale;
      canvas.height = H * scale;
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, []);

  if (style === 'chart') {
    const isSummary = Boolean(sim.current.summary && !running);
    const isBreak = mode === 'break' && !isSummary;
    const copy = lang === 'ru'
      ? {
          title: isSummary ? 'Фокус завершён' : isBreak ? 'Пауза' : idle ? 'Фокус приостановлен' : 'Фокус в реальном времени',
          live: idle ? 'НЕТ АКТИВНОСТИ' : running ? 'LIVE' : status === 'paused' ? 'ПАУЗА' : 'ГОТОВ',
          focus: 'фокус',
          clean: 'чистое время',
          streak: 'лучшая серия',
          pauses: 'паузы',
          idle: 'бездействия',
          breakHint: 'Ровный ритм для качественного отдыха',
        }
      : {
          title: isSummary ? 'Focus complete' : isBreak ? 'Break' : idle ? 'Focus suspended' : 'Focus in real time',
          live: idle ? 'IDLE' : running ? 'LIVE' : status === 'paused' ? 'PAUSED' : 'READY',
          focus: 'focus',
          clean: 'clean time',
          streak: 'best streak',
          pauses: 'interruptions',
          idle: 'idle',
          breakHint: 'A calm rhythm for a better recovery',
        };

    return (
      <div className={`scene-activity${isBreak ? ' scene-activity--break' : ''}`}>
        <canvas ref={canvasRef} className="scene-canvas scene-canvas--activity" aria-hidden="true" />
        <div className="scene-activity__head">
          <span className="scene-activity__title">{copy.title}</span>
          {!isSummary && !isBreak && (
            <span className={`scene-activity__badge${running && !idle ? ' is-live' : ''}`}>
              <i aria-hidden="true" />
              {copy.live}
            </span>
          )}
        </div>
        {isBreak ? (
          <div className="scene-activity__recovery">
            <strong>{copy.breakHint}</strong>
          </div>
        ) : (
          <div className="scene-activity__metrics">
            <div className="scene-activity__metric scene-activity__metric--primary">
              <strong>
                {activityMetrics.samples
                  ? <>{Math.round(activityMetrics.focus * 100)}<small>%</small></>
                  : '—'}
              </strong>
              <span>{copy.focus}</span>
            </div>
            <div className="scene-activity__metric">
              <strong>{formatShortTime(activityMetrics.activeSeconds)}</strong>
              <span>{copy.clean}</span>
            </div>
            <div className="scene-activity__metric">
              <strong>{formatShortTime(activityMetrics.longestStreak)}</strong>
              <span>{copy.streak}</span>
            </div>
          </div>
        )}
        {!isBreak && (
          <div className="scene-activity__foot">
            <>
              <span>{copy.pauses} <b>{activityMetrics.interruptions}</b></span>
              <span><b>{formatShortTime(activityMetrics.idleSeconds)}</b> {copy.idle}</span>
              <span className="scene-activity__legend">
                <i className="is-focus" />
                <i className="is-idle" />
                <i className="is-paused" />
              </span>
            </>
          </div>
        )}
      </div>
    );
  }

  return <canvas ref={canvasRef} className="scene-canvas" aria-hidden="true" />;
}

type NinjaState = 'inactive' | 'paused' | 'focus' | 'break';

const NINJA_LABELS: Record<'ru' | 'en', Record<NinjaState, string>> = {
  ru: {
    inactive: 'Ниндзя ждёт и начинает сердиться',
    paused: 'Ниндзя отдыхает',
    focus: 'Ниндзя тренируется — время фокуса',
    break: 'Ниндзя восстанавливается',
  },
  en: {
    inactive: 'The ninja is waiting and getting impatient',
    paused: 'The ninja is resting',
    focus: 'The ninja is training — focus time',
    break: 'The ninja is recovering',
  },
};

function NinjaTomatoScene({
  mode,
  running,
  idle,
  status = 'idle',
  lang = 'ru',
  speed = 100,
}: SceneProps) {
  const [spriteUrl, setSpriteUrl] = useState('');
  useEffect(() => {
    let active = true;
    getNinjaTomatoSpritesUrl()
      .then(url => { if (active) setSpriteUrl(url); })
      .catch(() => { /* protected scene remains hidden on a bad build key */ });
    return () => { active = false; };
  }, []);

  let state: NinjaState = 'inactive';
  if (status === 'paused') state = 'paused';
  else if (running && mode === 'break') state = 'break';
  else if (running && !idle) state = 'focus';
  const baseDuration = state === 'focus' ? 0.65 : state === 'paused' || state === 'break' ? 1.25 : 1;
  const speedRate = Math.max(0.5, Math.min(2, speed / 100));

  return (
    <div
      className={`scene-ninja scene-ninja--${state}`}
      role="img"
      aria-label={NINJA_LABELS[lang][state]}
    >
      <span
        className="scene-ninja__sprite"
        style={{
          backgroundImage: spriteUrl ? `url("${spriteUrl}")` : undefined,
          animationDuration: `${baseDuration / speedRate}s`,
        }}
        aria-hidden="true"
      />
    </div>
  );
}

export default function Scene(props: SceneProps) {
  if (props.style === 'ninja') return HAS_NINJA_SCENE
    ? <NinjaTomatoScene {...props} />
    : <FocusOrbitScene {...props} />;
  if (props.style === 'orbit') return <FocusOrbitScene {...props} />;
  if (props.style === 'garden') return <LightGardenScene {...props} />;
  if (props.style === 'tree') return <FocusTreeScene {...props} />;
  return <CanvasScene {...props} />;
}
