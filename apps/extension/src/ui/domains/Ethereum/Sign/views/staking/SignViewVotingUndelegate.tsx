import { FC } from "react"

export const SignViewVotingUndelegate: FC<{
  trackId: number
}> = ({ trackId }) => {
  return (
    <div className="flex w-full flex-col items-center gap-4">
      <div className="flex w-full items-center justify-between">
        <div>Track</div>
        <div className="text-body">#{trackId}</div>
      </div>
    </div>
  )
}
