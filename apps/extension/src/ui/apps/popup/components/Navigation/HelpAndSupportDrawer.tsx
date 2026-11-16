import { Drawer } from "@ui/components/Drawer"
import { createGlobalOpenClose } from "@ui/hooks/createGlobalOpenClose"

import { HelpAndSupport } from "../HelpAndSupport"

export const [useHelpAndSupportDrawerOpenClose] = createGlobalOpenClose()

export const HelpAndSupportDrawer = () => {
  const { isOpen, close } = useHelpAndSupportDrawerOpenClose()

  return (
    <Drawer
      analyticsId="help_and_support"
      className="w-full"
      anchor="right"
      isOpen={isOpen}
      containerId="main"
      onDismiss={close}
    >
      <HelpAndSupport onBack={close} />
    </Drawer>
  )
}
