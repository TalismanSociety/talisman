import { classNames } from "@talismn/util"
import { FC, useState } from "react"
import { Button, Checkbox, Drawer, useOpenClose } from "talisman-ui"

import { TestLayout } from "../shared/TestLayout"

const DrawerContent: FC<{ className?: string }> = ({ className }) => {
  return <div className={classNames("bg-brand-blue", className)}>content</div>
}

export const DrawerPage = () => {
  const [withContainer, setWithContainer] = useState(false)
  const [withLightDismiss, setWithLightDismiss] = useState(false)
  const ocLeft = useOpenClose()
  const ocRight = useOpenClose()
  const ocBottom = useOpenClose()
  const ocTop = useOpenClose()

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
          In container
        </Checkbox>
      </div>
      <div className="my-16 flex gap-8">
        <Button onClick={ocTop.toggle}>Top</Button>
        <Button onClick={ocRight.toggle}>Right</Button>
        <Button onClick={ocBottom.toggle}>Bottom</Button>
        <Button onClick={ocLeft.toggle}>Left</Button>
      </div>
      <div>
        <Drawer
          className="bg-brand-orange"
          isOpen={ocRight.isOpen}
          lightDismiss={withLightDismiss}
          onDismiss={ocRight.close}
          anchor="right"
        >
          <DrawerContent />
        </Drawer>
        <Drawer
          className="bg-brand-orange"
          isOpen={ocLeft.isOpen}
          lightDismiss={withLightDismiss}
          onDismiss={ocLeft.close}
          anchor="left"
        >
          <DrawerContent />
        </Drawer>
        <Drawer
          className="bg-brand-orange"
          isOpen={ocTop.isOpen}
          lightDismiss={withLightDismiss}
          onDismiss={ocTop.close}
          anchor="top"
        >
          <DrawerContent />
        </Drawer>
        <Drawer
          className="bg-brand-orange"
          isOpen={ocBottom.isOpen}
          lightDismiss={withLightDismiss}
          onDismiss={ocBottom.close}
          anchor="bottom"
        >
          <DrawerContent />
        </Drawer>
      </div>
      <div>
        <div className="h-[600px] w-[400px] border"></div>
      </div>
    </TestLayout>
  )
}
