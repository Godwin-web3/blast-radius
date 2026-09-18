import type { OpenApproval } from "@/lib/types";

function polar(index: number, total: number, radius: number): { x: number; y: number } {
  const angle = (Math.PI * 2 * index) / Math.max(total, 1) - Math.PI / 2;
  return {
    x: 600 + Math.cos(angle) * radius,
    y: 340 + Math.sin(angle) * radius,
  };
}

export function BlastMap({
  address,
  approvals,
}: {
  address: string;
  approvals: OpenApproval[];
}) {
  const nodes = approvals.slice(0, 24);
  const short = `${address.slice(0, 6)}…${address.slice(-4)}`;

  return (
    <div className="map-wrap" aria-hidden={nodes.length === 0}>
      <svg viewBox="0 0 1200 680" role="img" aria-label="Blast map of open approvals">
        <defs>
          <radialGradient id="core" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffb020" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#ff3b1f" stopOpacity="0.05" />
          </radialGradient>
        </defs>
        <rect width="1200" height="680" fill="#07060a" />
        {[120, 210, 300].map((r) => (
          <circle
            key={r}
            cx="600"
            cy="340"
            r={r}
            fill="none"
            stroke="rgba(255,59,31,0.18)"
            strokeWidth="1"
          />
        ))}
        {nodes.map((a, i) => {
          const radius = a.unlimited ? 300 : a.movable > 0n ? 220 : 150;
          const p = polar(i, nodes.length, radius);
          return (
            <g key={a.id}>
              <line
                x1="600"
                y1="340"
                x2={p.x}
                y2={p.y}
                stroke={a.unlimited ? "#ff3b1f" : "#ffb020"}
                strokeOpacity="0.55"
                strokeWidth={a.unlimited ? 2.2 : 1}
              />
              <circle cx={p.x} cy={p.y} r={a.unlimited ? 9 : 6} fill={a.unlimited ? "#ff3b1f" : "#ffb020"} />
              <text
                x={p.x}
                y={p.y - 14}
                textAnchor="middle"
                fill="#f4ead8"
                fontSize="12"
                fontFamily="IBM Plex Mono, ui-monospace, monospace"
              >
                {a.tokenSymbol}
              </text>
              <text
                x={p.x}
                y={p.y + 22}
                textAnchor="middle"
                fill={a.unlimited ? "#ff6a3d" : "#8f8778"}
                fontSize="10"
                fontFamily="IBM Plex Mono, ui-monospace, monospace"
              >
                {a.unlimited ? "UNLIMITED" : a.spenderLabel.slice(0, 18)}
              </text>
            </g>
          );
        })}
        <circle cx="600" cy="340" r="46" fill="url(#core)" />
        <circle cx="600" cy="340" r="46" fill="none" stroke="#ffb020" />
        <text
          x="600"
          y="336"
          textAnchor="middle"
          fill="#07060a"
          fontSize="11"
          fontFamily="IBM Plex Mono, ui-monospace, monospace"
        >
          WALLET
        </text>
        <text
          x="600"
          y="352"
          textAnchor="middle"
          fill="#07060a"
          fontSize="11"
          fontFamily="IBM Plex Mono, ui-monospace, monospace"
        >
          {short}
        </text>
      </svg>
    </div>
  );
}
