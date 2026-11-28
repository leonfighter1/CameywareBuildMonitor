"use client";
import { useEffect, useId, useState, type ReactNode } from "react";

/**
 * A ring that fills to [value] (0–100; the owner, 2026-11-26: 「采用animated 圆盘的进度条，带有bouncing的动感」): from empty at
 * first, then each time it moves, springing past its mark and back (cyber.css .cy-ring-bar); neon from cyan to magenta,
 * or [tone]'s colour; while [live], an orbit spins round it. [children] is what it says in its middle; [label] names it
 * for a screen reader. [smooth] (S86: a category's ring, moving each second): it glides to each mark instead.
 */
export function Ring({
  value,
  size = 120,
  thickness = 10,
  live = false,
  smooth = false,
  tone,
  label,
  children,
}: {
  value: number;
  size?: number;
  thickness?: number;
  live?: boolean;
  smooth?: boolean;
  /** A state's colour token instead of the neon pair: --t-success, --t-danger. */
  tone?: string;
  label: string;
  children?: ReactNode;
}) {
  const id = useId().replace(/:/g, "");
  const v = Math.max(0, Math.min(100, value));
  // Empty on the first frame, so it fills (and springs) from there.
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setShown(v));
    return () => cancelAnimationFrame(frame);
  }, [v]);
  const c = size / 2;
  const r = c - thickness / 2 - 4;
  const round = 2 * Math.PI * r;
  return (
    <div
      className="cy-ring"
      style={{ width: size, height: size }}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(v)}
    >
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} aria-hidden="true">
        <defs>
          <linearGradient id={`g${id}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={tone ?? "var(--cy-neon)"} />
            <stop offset="1" stopColor={tone ?? "var(--cy-neon-2)"} />
          </linearGradient>
        </defs>
        <circle cx={c} cy={c} r={r} fill="none" stroke="var(--t-inset)" strokeWidth={thickness} />
        <circle
          className={smooth ? "cy-ring-bar cy-ring-smooth" : "cy-ring-bar"}
          cx={c}
          cy={c}
          r={r}
          fill="none"
          stroke={`url(#g${id})`}
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeDasharray={round}
          strokeDashoffset={round * (1 - shown / 100)}
          transform={`rotate(-90 ${c} ${c})`}
        />
        {live && (
          <circle
            className="cy-ring-orbit"
            cx={c}
            cy={c}
            r={r + thickness / 2 + 3}
            fill="none"
            stroke="var(--cy-neon)"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeDasharray={`${round * 0.12} ${round}`}
          />
        )}
      </svg>
      <div className="cy-ring-label">{children}</div>
    </div>
  );
}
