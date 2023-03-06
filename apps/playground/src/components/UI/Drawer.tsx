import { classNames } from "@talismn/util"
import { FC, useState } from "react"
import { Button, Checkbox, Drawer, useOpenClose } from "talisman-ui"

import { TestLayout } from "../shared/TestLayout"

const DrawerContent: FC<{ className?: string }> = ({ className }) => {
  return (
    <div
      className={classNames(
        "bg-brand-blue flex h-full flex-col items-center justify-center",
        className
      )}
    >
      <p>content</p>
    </div>
  )
}

export const DrawerPage = () => {
  const [withContainer, setWithContainer] = useState(false)
  const [withLightDismiss, setWithLightDismiss] = useState(false)
  const ocLeft = useOpenClose()
  const ocRight = useOpenClose()
  const ocBottom = useOpenClose()
  const ocTop = useOpenClose()

  const containerId = withContainer ? "container" : undefined

  return (
    <TestLayout title="Mystical Background">
      <div>
        <Checkbox checked={withContainer} onChange={(e) => setWithContainer(e.target.checked)}>
          In container
        </Checkbox>
      </div>
      <div>
        <Checkbox
          checked={withLightDismiss}
          onChange={(e) => setWithLightDismiss(e.target.checked)}
        >
          Light dismiss
        </Checkbox>
      </div>
      <div className="my-16 flex gap-8">
        <div className="grid grid-cols-3">
          <div></div>
          <Button onClick={ocTop.toggle}>Top</Button>
          <div></div>
          <Button onClick={ocLeft.toggle}>Left</Button>
          <div></div>
          <Button onClick={ocRight.toggle}>Right</Button>
          <div></div>
          <Button onClick={ocBottom.toggle}>Bottom</Button>
          <div></div>
        </div>
      </div>
      <div>
        <Drawer
          className="bg-brand-orange"
          isOpen={ocRight.isOpen}
          containerId={containerId}
          onDismiss={withLightDismiss ? ocRight.close : undefined}
          anchor="right"
        >
          <DrawerContent />
        </Drawer>
        <Drawer
          className="bg-brand-orange"
          isOpen={ocLeft.isOpen}
          containerId={containerId}
          onDismiss={withLightDismiss ? ocLeft.close : undefined}
          anchor="left"
        >
          <DrawerContent />
        </Drawer>
        <Drawer
          className="bg-brand-orange"
          isOpen={ocTop.isOpen}
          containerId={containerId}
          onDismiss={withLightDismiss ? ocTop.close : undefined}
          anchor="top"
        >
          <DrawerContent />
        </Drawer>
        <Drawer
          className="bg-brand-orange"
          isOpen={ocBottom.isOpen}
          containerId={containerId}
          onDismiss={withLightDismiss ? ocBottom.close : undefined}
          anchor="bottom"
        >
          <DrawerContent />
        </Drawer>
      </div>
      <div>
        <div
          id="container"
          className="bg-brand-pink relative h-[600px] w-[400px] overflow-hidden border "
        ></div>
      </div>
    </TestLayout>
  )
}
