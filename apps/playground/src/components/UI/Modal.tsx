import { classNames } from "@talismn/util"
import { FC, ReactNode, useState } from "react"
import { Button, Checkbox, Modal, useOpenClose } from "talisman-ui"

import { Layout } from "../shared/Layout"

const ModalContent: FC<{ className?: string; children?: ReactNode; close?: () => void }> = ({
  className,
  children,
  close,
}) => {
  return (
    <div
      className={classNames(
        "bg-brand-blue flex h-full flex-col items-center justify-center",
        className
      )}
    >
      {children ?? <p>content</p>}
      <div>
        <button onClick={close}>close</button>
      </div>
    </div>
  )
}

export const ModalPage = () => {
  const [withContainer, setWithContainer] = useState(false)
  const [withLightDismiss, setWithLightDismiss] = useState(false)
  const [blur, setBlur] = useState(false)
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
      <div>
        <Checkbox checked={blur} onChange={(e) => setBlur(e.target.checked)}>
          Backdrop Blur
        </Checkbox>
      </div>
      <Button className="my-4" onClick={ocTop.toggle}>
        Show
      </Button>
      <div>
        <Modal
          className="bg-brand-orange"
          isOpen={ocTop.isOpen}
          containerId={containerId}
          onDismiss={withLightDismiss ? ocTop.close : undefined}
        >
          <ModalContent className="h-[150px]" close={ocTop.close} />
        </Modal>
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
