import Color from "color"
import React, { FC, useEffect, useRef } from "react"

import { LoginPhysics } from "./LoginPhysics"
import { ArtifactCharacteristics, ParentSize, useLoginArtifact } from "./useLoginArtifact"

type AccountCanvasProps = React.DetailedHTMLProps<
  React.CanvasHTMLAttributes<HTMLCanvasElement>,
  HTMLCanvasElement
> & {
  config: LoginPhysics
  size: ParentSize
  colors: string[]
}

const drawArtifact = (ctx: CanvasRenderingContext2D, artifact: ArtifactCharacteristics) => {
  const { cx, cy, radius, color, opacity } = artifact

  // gradient background
  const bg = ctx.createRadialGradient(cx, cy, radius / 2, cx, cy, radius)

  // setting transparency on the bg color because ctx.globalAlpha doesn't work on some versions of firefox
  bg.addColorStop(0, Color(color).alpha(opacity).toString())
  bg.addColorStop(1, "transparent")

  ctx.fillStyle = bg
  ctx.beginPath()
  ctx.arc(cx, cy, radius, 0, 2 * Math.PI)
  ctx.fill()
}

export const AccountCanvas: FC<AccountCanvasProps> = ({ config, size, colors, ...props }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const artifact1 = useLoginArtifact(config, size, colors[0])
  const artifact2 = useLoginArtifact(config, size, colors[0])
  const artifact3 = useLoginArtifact(config, size, colors[0])
  const artifact4 = useLoginArtifact(config, size, colors[1])
  const artifact5 = useLoginArtifact(config, size, colors[1])
  const artifact6 = useLoginArtifact(config, size, colors[1])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const context = canvas.getContext("2d")
    if (!context) return

    let animationFrameId: number

    // render on every frame
    const render = () => {
      context.clearRect(0, 0, canvas.width, canvas.height)
      if (config.blur > 0) context.filter = `blur(${config.blur}px)`
      drawArtifact(context, artifact1)
      drawArtifact(context, artifact2)
      drawArtifact(context, artifact3)
      drawArtifact(context, artifact4)
      drawArtifact(context, artifact5)
      drawArtifact(context, artifact6)

      animationFrameId = window.requestAnimationFrame(render)
    }

    render()

    return () => {
      window.cancelAnimationFrame(animationFrameId)
    }
  }, [config, artifact1, artifact2, artifact3, artifact4, artifact5, artifact6])

  return <canvas ref={canvasRef} width={size.width} height={size.height} {...props} />
}
