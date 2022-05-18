import styled from "styled-components"

type CircleProps = {
  progress: number
  radius?: number
  lineWidth?: number
}

export default styled(
  ({ className, progress, radius, lineWidth }: CircleProps & { className?: string }) => {
    radius = radius ?? 175
    lineWidth = lineWidth ?? 25

    const diameter = radius * 2
    const size = diameter + lineWidth * 2
    const circumference = Math.round(Math.PI * diameter)
    const strokeDashoffset = Math.round(((100 - Math.min(progress, 100)) / 100) * circumference)

    return (
      <svg
        className={className}
        fill="none"
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
      >
        <circle
          className="background"
          cx={radius + lineWidth}
          cy={radius + lineWidth}
          r={radius}
          strokeWidth={lineWidth}
        />
        <circle
          className="progress"
          cx={radius + lineWidth}
          cy={radius + lineWidth}
          r={radius}
          strokeWidth={lineWidth}
          strokeDasharray="1100"
          style={{ strokeDashoffset }}
        />
      </svg>
    )
  }
)`
  width: 100%;
  height: 100%;

  > .background {
    stroke: var(--color-foreground);
    opacity: 0.2;
  }

  > .progress {
    stroke: var(--color-primary);
    transform: rotate(-90deg);
    transform-origin: center;
    transition: stroke-dashoffset 1s ease-out;
  }
`
