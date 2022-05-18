import { ScrollContainer } from "@talisman/components/ScrollContainer"
import { classNames } from "@talisman/util/classNames"

const Content = ({ children, className }: any) => (
  <ScrollContainer className={classNames("layout-content", className)} innerClassName="children">
    {children}
  </ScrollContainer>
)

Content.displayName = "layout-content"

export default Content
