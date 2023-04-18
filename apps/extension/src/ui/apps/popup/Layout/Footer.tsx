import { FC, PropsWithChildren } from "react"

const Footer: FC<PropsWithChildren & { className?: string }> = ({ children, className }) => {
  return <footer className={`${className} layout-footer`}>{children}</footer>
}

Footer.displayName = "layout-footer"

export default Footer
