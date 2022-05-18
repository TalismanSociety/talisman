const Footer = ({ children, className }: any) => {
  return <footer className={`${className} layout-footer`}>{children}</footer>
}

Footer.displayName = "layout-footer"

export default Footer
