import StytledHeaderBlock from "@talisman/components/HeaderBlock"
import { classNames } from "@talisman/util/classNames"
import Color from "color"
import { useEffect, useMemo, useRef, useState } from "react"
import { Button, Checkbox } from "talisman-ui"

import Layout from "../layout"

const ColorTile = ({ className }: { className?: string }) => {
  const [color, setColor] = useState<Color>()

  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current) return
    const style = getComputedStyle(ref.current)
    setColor(new Color(style.backgroundColor))
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
        <Button>Library button</Button>
        <div className="text-xl">
          <div>XL checkbox</div>
          <Checkbox>label of the checkbox</Checkbox>
        </div>
        <h3>Grey shades</h3>
        <div className="flex flex-wrap">
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
          <ColorTile className="bg-grey-850" />
          <ColorTile className="bg-grey-900" />
          <ColorTile className="bg-black" />
        </div>
        <h3>Black</h3>
        <div className="flex flex-wrap">
          <ColorTile className="bg-black" />
          <ColorTile className="bg-black-primary" />
          <ColorTile className="bg-black-secondary" />
          <ColorTile className="bg-black-tertiary" />
        </div>
        <h3>Body</h3>
        <div className="flex flex-wrap">
          <ColorTile className="bg-body" />
          <ColorTile className="bg-body-disabled" />
          <ColorTile className="bg-body-secondary" />
          <ColorTile className="bg-body-black" />
          <ColorTile className="bg-field" />
          <ColorTile className="bg-pill" />
        </div>
        <h3>Primary</h3>
        <div className="flex flex-wrap">
          <ColorTile className="bg-primary" />
          <ColorTile className="bg-primary-500" />
          <ColorTile className="bg-primary-700" />
        </div>
        <h3>Alerts</h3>
        <div className="flex flex-wrap">
          <ColorTile className="bg-alert-success" />
          <ColorTile className="bg-alert-warn" />
          <ColorTile className="bg-alert-error" />
        </div>
        <h3>Greens</h3>
        <div className="flex flex-wrap">
          <ColorTile className="bg-green-200" />
          <ColorTile className="bg-green" />
          <ColorTile className="bg-green-500" />
        </div>
        <h3>Oranges</h3>
        <div className="flex flex-wrap">
          <ColorTile className="bg-orange-200" />
          <ColorTile className="bg-orange" />
          <ColorTile className="bg-orange-500" />
        </div>
        <h3>Reds</h3>
        <div className="flex flex-wrap">
          <ColorTile className="bg-red-200" />
          <ColorTile className="bg-red" />
          <ColorTile className="bg-red-500" />
        </div>
        <h3>Brand</h3>
        <div className="flex flex-wrap"></div>
        <div className="flex">
          <ColorTile className="bg-brand-blue" />
          <ColorTile className="bg-brand-pink" />
          <ColorTile className="bg-brand-orange" />
        </div>
      </div>
    </Layout>
  )
}
