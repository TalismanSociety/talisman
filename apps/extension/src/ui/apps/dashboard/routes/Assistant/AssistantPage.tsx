import { ChatContainer } from "@ui/domains/Assistant/components/ChatContainer"
import type { FC } from "react"

export const AssistantPage: FC = () => {
  return (
    <div className="flex h-[calc(100dvh-13.6rem)] flex-col">
      <ChatContainer />
    </div>
  )
}
