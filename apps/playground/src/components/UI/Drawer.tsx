import { classNames } from "@talismn/util"
import { FC } from "react"
import { Button, Drawer, useOpenClose } from "talisman-ui"

import { TestLayout } from "../shared/TestLayout"

const DrawerContent: FC<{ className?: string }> = ({ className }) => {
  return <div className={classNames("bg-brand-blue", className)}>content</div>
}

export const DrawerPage = () => {
  const ocLeft = useOpenClose()
  const ocRight = useOpenClose()
  const ocBottom = useOpenClose()
  const ocTop = useOpenClose()

  return (
    <TestLayout title="Mystical Background">
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
          lightDismiss
          onDismiss={ocRight.close}
          anchor="right"
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
