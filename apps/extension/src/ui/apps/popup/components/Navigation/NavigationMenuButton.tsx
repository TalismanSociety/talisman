import { useNavigationContext } from "@ui/apps/popup/context/NavigationContext"
import { IconButton } from "@talisman/components/IconButton"
import { HamburgerMenuIcon } from "@talisman/theme/icons"

export const NavigationMenuButton = () => {
  const { open } = useNavigationContext()

  return (
    <IconButton onClick={open} aria-label="navigation menu">
      <HamburgerMenuIcon />
    </IconButton>
  )
}
