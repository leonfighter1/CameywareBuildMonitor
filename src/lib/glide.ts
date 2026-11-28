"use client";
import { useEffect, useRef, useState } from "react";

/**
 * [target] as shown: it moves a fifth of the way there every half second, at least half a point, so a figure that jumps
 * (a category ending early or late) glides there over a few seconds (S86; the owner, 2026-11-28: 「随着时间流逝，圆盘进度要有
 * 慢慢调整的动态表现，而不是一下子就从3% 跳到%60」); the bar's and the rings' own transitions smooth each move.
 */
export function useGlide(target: number): number {
  const [shown, setShown] = useState(target);
  const goal = useRef(target);
  goal.current = target;
  useEffect(() => {
    const t = setInterval(
      () =>
        setShown((s) => {
          const gap = goal.current - s;
          if (Math.abs(gap) <= 0.5) return goal.current;
          return s + Math.sign(gap) * Math.max(0.5, Math.abs(gap) / 5);
        }),
      500,
    );
    return () => clearInterval(t);
  }, []);
  return shown;
}
