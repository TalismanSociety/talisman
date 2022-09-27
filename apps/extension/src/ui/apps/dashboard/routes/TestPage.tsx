import StytledHeaderBlock from "@talisman/components/HeaderBlock"
import { classNames } from "@talisman/util/classNames"
import Color from "color"
import { ReactNode, useEffect, useMemo, useRef, useState } from "react"
import Layout from "../layout"

const ColorTile = ({ className }: { className?: string }) => {
  const [color, setColor] = useState<Color>()

  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current) return
    const st = getComputedStyle(ref.current)
    const col = new Color(st.backgroundColor)
    setColor(col)
  }, [])

  const text = useMemo(() => {
    const match = /bg-([^\s]+)/.exec(className ?? "")
    return match?.[1]
  }, [className])

  return (
    <div>
      <div
        ref={ref}
        className={classNames(
          "flex h-56 w-56 min-w-[14rem] place-content-center",
          className,
          color?.isDark() ? "text-white" : "text-black"
        )}
      >
        {text}
      </div>
      <div className="p-2 text-xs">
        {color?.hex().toString()}
        <br />
        {color?.rgb().toString()}
      </div>
    </div>
  )
}

export const TestPage = () => {
  return (
    <Layout withBack backTo="/">
      <StytledHeaderBlock title="Test page" />
      <div className="space-y-8">
        <div className="flex">
          <ColorTile className="bg-white" />
          <ColorTile className="bg-grey-50" />
          <ColorTile className="bg-grey-100" />
          <ColorTile className="bg-grey-200" />
          <ColorTile className="bg-grey-300" />
          <ColorTile className="bg-grey-400" />
          <ColorTile className="bg-grey-500" />
          <ColorTile className="bg-grey-600" />
          <ColorTile className="bg-grey-700" />
          <ColorTile className="bg-grey-800" />
          <ColorTile className="bg-grey-900" />
          <ColorTile className="bg-black" />
        </div>
        <div className="flex">
          <ColorTile className="bg-black" />
          <ColorTile className="bg-black-primary" />
          <ColorTile className="bg-black-secondary" />
          <ColorTile className="bg-black-tertiary" />
        </div>
        <div className="flex">
          <ColorTile className="bg-body" />
          <ColorTile className="bg-body-disabled" />
          <ColorTile className="bg-body-secondary" />
          <ColorTile className="bg-body-black" />
          <ColorTile className="bg-field" />
          <ColorTile className="bg-pill" />
        </div>
        <div className="flex">
          <ColorTile className="bg-alert-success" />
          <ColorTile className="bg-alert-warn" />
          <ColorTile className="bg-alert-error" />
        </div>
        <div className="flex">
          <ColorTile className="bg-primary" />
          <ColorTile className="bg-primary-500" />
          <ColorTile className="bg-primary-700" />
        </div>
        <div className="flex">
          <ColorTile className="bg-blue" />
          <ColorTile className="bg-pink" />
          <ColorTile className="bg-orange" />
        </div>
      </div>
    </Layout>
  )
}
