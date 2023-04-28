import { classNames } from "@talismn/util"
import { FC, ReactNode, useState } from "react"
import { Button, Checkbox, Drawer, useOpenClose } from "talisman-ui"

import { Layout } from "../shared/Layout"

const DrawerContent: FC<{ className?: string; children?: ReactNode }> = ({
  className,
  children,
}) => {
  return (
    <div
      className={classNames(
        "bg-brand-blue flex h-full flex-col items-center justify-center",
        className
      )}
    >
      {children ?? <p>content</p>}
    </div>
  )
}

export const DrawerPage = () => {
  const [withContainer, setWithContainer] = useState(false)
  const [withLightDismiss, setWithLightDismiss] = useState(false)
  const ocLeft = useOpenClose()
  const ocRight = useOpenClose()
  const ocBottom1 = useOpenClose()
  const ocBottom2 = useOpenClose()
  const ocTop = useOpenClose()

  const containerId = withContainer ? "container" : undefined

  return (
    <Layout title="Mystical Background">
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
          <div>
            <Button onClick={ocTop.toggle}>Top</Button>
          </div>
          <div></div>
          <div>
            <Button onClick={ocLeft.toggle}>Left</Button>
          </div>
          <div></div>
          <div>
            <Button onClick={ocRight.toggle}>Right</Button>
          </div>
          <div></div>
          <div className="flex flex-col">
            <Button onClick={ocBottom1.toggle}>Bottom 1</Button>
            <Button onClick={ocBottom2.toggle}>Bottom 2</Button>
          </div>
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
          <DrawerContent className="h-[150px]" />
        </Drawer>
        <Drawer
          className="bg-brand-orange"
          isOpen={ocLeft.isOpen}
          containerId={containerId}
          onDismiss={withLightDismiss ? ocLeft.close : undefined}
          anchor="left"
        >
          <DrawerContent className="h-[150px]" />
        </Drawer>
        <Drawer
          className="bg-brand-orange"
          isOpen={ocTop.isOpen}
          containerId={containerId}
          onDismiss={withLightDismiss ? ocTop.close : undefined}
          anchor="top"
        >
          <DrawerContent className="h-[150px]" />
        </Drawer>
        <Drawer
          className="bg-brand-orange"
          isOpen={ocBottom1.isOpen}
          containerId={containerId}
          onDismiss={withLightDismiss ? ocBottom1.close : undefined}
          anchor="bottom"
        >
          <DrawerContent className="h-[150px]">Bottom 1</DrawerContent>
        </Drawer>
        <Drawer
          className="bg-brand-orange"
          isOpen={ocBottom2.isOpen}
          containerId={containerId}
          onDismiss={withLightDismiss ? ocBottom2.close : undefined}
          anchor="bottom"
        >
          <DrawerContent className="bg-brand-orange h-[250px]">Bottom 2</DrawerContent>
        </Drawer>
      </div>
      <div>
        <div
          id="container"
          className="bg-brand-pink relative h-[600px] w-[400px] overflow-hidden border "
        ></div>
      </div>
    </Layout>
  )
}
