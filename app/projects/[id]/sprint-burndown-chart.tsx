type SprintBurndownChartProps = {
  startDate: string | null;
  endDate: string | null;
  completedAt: string | null;
  isActive: boolean;
  snapshots: {
    snapshotDate: string;
    scopeTasks: number;
    remainingTasks: number;
  }[];
};

const WIDTH = 640;
const HEIGHT = 240;
const LEFT = 44;
const RIGHT = 16;
const TOP = 16;
const BOTTOM = 34;

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function formatDay(value: string) {
  return new Date(`${value}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export default function SprintBurndownChart({
  startDate,
  endDate,
  completedAt,
  isActive,
  snapshots,
}: SprintBurndownChartProps) {
  const sortedSnapshots = [...snapshots].sort((a, b) => a.snapshotDate.localeCompare(b.snapshotDate));
  if (!sortedSnapshots.length) {
    return (
      <div className="mt-4 rounded-xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
        Progress snapshots will appear as the sprint is viewed or its issues change.
      </div>
    );
  }

  const firstSnapshotDate = sortedSnapshots[0].snapshotDate;
  const start = startDate ? dayKey(new Date(startDate)) : firstSnapshotDate;
  const plannedEnd = endDate ? dayKey(new Date(endDate)) : dayKey(new Date());
  const latestSnapshotDate = sortedSnapshots[sortedSnapshots.length - 1].snapshotDate;
  const end = completedAt
    ? dayKey(new Date(completedAt))
    : isActive && latestSnapshotDate > plannedEnd
      ? latestSnapshotDate
      : plannedEnd;
  const startTime = new Date(`${start}T00:00:00Z`).getTime();
  const endTime = Math.max(startTime, new Date(`${end}T00:00:00Z`).getTime());
  const duration = Math.max(1, Math.ceil((endTime - startTime) / 86_400_000));
  const maxScope = Math.max(1, ...sortedSnapshots.map((snapshot) => snapshot.scopeTasks));
  const plotWidth = WIDTH - LEFT - RIGHT;
  const plotHeight = HEIGHT - TOP - BOTTOM;
  const x = (date: string) =>
    LEFT + ((new Date(`${date}T00:00:00Z`).getTime() - startTime) / (endTime - startTime || 1)) * plotWidth;
  const y = (remaining: number) => TOP + (1 - remaining / maxScope) * plotHeight;
  const actualPoints = sortedSnapshots
    .filter((snapshot) => {
      const timestamp = new Date(`${snapshot.snapshotDate}T00:00:00Z`).getTime();
      return timestamp >= startTime && timestamp <= endTime;
    })
    .map((snapshot) => `${x(snapshot.snapshotDate)},${y(snapshot.remainingTasks)}`)
    .join(" ");
  const idealStart = sortedSnapshots.find((snapshot) => snapshot.snapshotDate >= start)?.scopeTasks ?? maxScope;
  const idealPoints = `${x(start)},${y(idealStart)} ${x(end)},${y(0)}`;
  const labelStep = Math.ceil(duration / 5);

  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3 sm:p-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-slate-700">Remaining issues</p>
        <div className="flex items-center gap-3 text-[11px] text-slate-500">
          <span className="flex items-center gap-1.5"><i className="h-0.5 w-4 bg-indigo-500" />Actual</span>
          <span className="flex items-center gap-1.5"><i className="h-0.5 w-4 border-t border-dashed border-slate-400" />Ideal</span>
        </div>
      </div>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label="Sprint burndown chart showing remaining issues over time" className="w-full">
        {[0, 0.25, 0.5, 0.75, 1].map((fraction) => {
          const value = Math.round(maxScope * fraction);
          const lineY = y(value);
          return (
            <g key={fraction}>
              <line x1={LEFT} y1={lineY} x2={WIDTH - RIGHT} y2={lineY} stroke="#e2e8f0" strokeDasharray="3 5" />
              <text x={LEFT - 8} y={lineY + 4} textAnchor="end" fill="#64748b" fontSize="10">{value}</text>
            </g>
          );
        })}
        <polyline points={idealPoints} fill="none" stroke="#94a3b8" strokeWidth="2" strokeDasharray="5 5" />
        {actualPoints ? <polyline points={actualPoints} fill="none" stroke="#4f46e5" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" /> : null}
        {sortedSnapshots
          .filter((snapshot) => snapshot.snapshotDate >= start && snapshot.snapshotDate <= end)
          .map((snapshot) => (
            <circle key={snapshot.snapshotDate} cx={x(snapshot.snapshotDate)} cy={y(snapshot.remainingTasks)} r="3.5" fill="#4f46e5" />
          ))}
        {[0, 1, 2, 3, 4, 5].map((index) => {
          const offset = Math.min(duration, index * labelStep);
          const date = dayKey(new Date(startTime + offset * 86_400_000));
          return (
            <text key={index} x={x(date)} y={HEIGHT - 8} textAnchor={index === 0 ? "start" : index === 5 ? "end" : "middle"} fill="#64748b" fontSize="10">
              {formatDay(date)}
            </text>
          );
        })}
      </svg>
      <p className="mt-1 text-[11px] text-slate-400">
        Daily snapshots are updated when the project is viewed or sprint issues change{isActive ? "." : " (available data only)."}
      </p>
    </div>
  );
}
