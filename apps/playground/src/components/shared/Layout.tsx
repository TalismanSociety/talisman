import { FC, ReactNode, useEffect } from "react"

const PageTitle: FC<{ title?: string }> = ({ title }) => {
  useEffect(() => {
    document.title = title ? `Talisman Playground | ${title}` : "Talisman Playground"
  }, [title])

  return null
}

export type LayoutProps = { title?: string; children?: ReactNode }

export const Layout: FC<LayoutProps> = ({ title, children }) => {
  return (
    <div className="text-left">
      <PageTitle title={title} />
      {children}
    </div>
  )
}
