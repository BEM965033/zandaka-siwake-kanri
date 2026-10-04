"use client";

import { useRef, useState } from "react";
import type { CashBookRow } from "@/actions/cashbook";
import { formatCurrency, formatDate } from "@/lib/utils";

interface Props {
  dateFrom: string;
  dateTo: string;
  openingBalance: string;
  rows: CashBookRow[];
}

const W = 800;
const H = 160;
const PAD_Y = 12;

// 期間内の残高推移をステップラインで描く。ホバーで各時点の残高を表示
export function BalanceChart({ dateFrom, dateTo, openingBalance, rows }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<number | null>(null);

  const t0 = new Date(dateFrom).getTime();
  const t1 = Math.max(new Date(dateTo).getTime(), t0 + 1);
  const points = [
    { t: t0, balance: Number(openingBalance), label: "前期繰越" },
    ...rows.map((r) => ({ t: new Date(r.date).getTime(), balance: Number(r.balance), label: r.description })),
  ];

  const values = points.map((p) => p.balance);
  let min = Math.min(...values, 0);
  let max = Math.max(...values);
  if (max === min) max = min + 1;
  const span = max - min;
  min -= span * 0.05;
  max += span * 0.08;

  const x = (t: number) => ((t - t0) / (t1 - t0)) * W;
  const y = (v: number) => PAD_Y + (1 - (v - min) / (max - min)) * (H - PAD_Y * 2);

  let d = `M0,${y(points[0].balance)}`;
  for (let i = 1; i < points.length; i++) {
    d += ` H${x(points[i].t)} V${y(points[i].balance)}`;
  }
  d += ` H${W}`;
  const area = `${d} V${H} H0 Z`;

  function handleMove(e: React.PointerEvent) {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const t = t0 + ((e.clientX - rect.left) / rect.width) * (t1 - t0);
    // カーソル位置以前で最後の点（その時点の残高）
    let idx = 0;
    for (let i = 0; i < points.length; i++) if (points[i].t <= t) idx = i;
    setHover(idx);
  }

  const hp = hover !== null ? points[hover] : null;
  const hpLeft = hp ? (x(hp.t) / W) * 100 : 0;
  const hpTop = hp ? (y(hp.balance) / H) * 100 : 0;

  return (
    <div>
      <div
        ref={ref}
        className="relative h-40 cursor-crosshair"
        onPointerMove={handleMove}
        onPointerLeave={() => setHover(null)}
      >
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
          {min < 0 && (
            <line
              x1={0} x2={W} y1={y(0)} y2={y(0)}
              stroke="#d1d5db" strokeDasharray="4 4" vectorEffect="non-scaling-stroke"
            />
          )}
          <path d={area} fill="#2563eb" fillOpacity={0.08} />
          <path d={d} fill="none" stroke="#2563eb" strokeWidth={2} vectorEffect="non-scaling-stroke" />
        </svg>
        {hp && (
          <>
            <div className="pointer-events-none absolute inset-y-0 w-px bg-gray-300" style={{ left: `${hpLeft}%` }} />
            <div
              className="pointer-events-none absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-blue-600 shadow"
              style={{ left: `${hpLeft}%`, top: `${hpTop}%` }}
            />
            <div
              className="pointer-events-none absolute top-0 z-10 rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs shadow-sm whitespace-nowrap"
              style={hpLeft > 60 ? { right: `${100 - hpLeft}%`, marginRight: 8 } : { left: `${hpLeft}%`, marginLeft: 8 }}
            >
              <p className="text-gray-500">{formatDate(new Date(hp.t))}・{hp.label}</p>
              <p className="font-bold tabular-nums text-gray-900">{formatCurrency(hp.balance)}</p>
            </div>
          </>
        )}
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-gray-400 tabular-nums">
        <span>{formatDate(dateFrom)}</span>
        <span>{formatDate(dateTo)}</span>
      </div>
    </div>
  );
}
