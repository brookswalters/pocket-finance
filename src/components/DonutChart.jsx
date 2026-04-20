export default function DonutChart({ segments, size = 120, thickness = 20, children }) {
  const r = (size - thickness) / 2
  const circ = 2 * Math.PI * r
  const total = segments.reduce((s, seg) => s + (seg.value || 0), 0)

  let cumulative = 0
  const arcs = segments.map((seg, i) => {
    const dash = total > 0 ? (seg.value / total) * circ : 0
    const rotation = total > 0 ? (cumulative / total) * 360 - 90 : -90
    cumulative += seg.value
    return (
      <circle
        key={i}
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={seg.color}
        strokeWidth={thickness}
        strokeDasharray={`${dash} ${circ - dash}`}
        transform={`rotate(${rotation}, ${size / 2}, ${size / 2})`}
        strokeLinecap="butt"
      />
    )
  })

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ position: 'absolute' }}>
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke="#1e293b" strokeWidth={thickness}
        />
        {total > 0 && arcs}
      </svg>
      <div className="relative z-10 flex flex-col items-center justify-center">
        {children}
      </div>
    </div>
  )
}
