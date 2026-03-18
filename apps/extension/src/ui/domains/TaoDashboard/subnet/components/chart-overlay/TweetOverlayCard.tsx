import { DistanceToNow } from "@ui/components/DistanceToNow"
import type { FC } from "react"

import type { Tweet } from "./ChartOverlayContext"

export const TweetOverlayCard: FC<{ tweet: Tweet }> = ({ tweet }) => (
  <div className="flex flex-col gap-[8px]">
    {/* Author */}
    <div className="flex flex-col gap-[4px]">
      <div className="flex items-center gap-[4px]">
        {tweet.author.profileImage ? (
          <img
            src={tweet.author.profileImage}
            alt={tweet.author.name}
            className="size-[12px] rounded-full"
          />
        ) : (
          <div className="flex size-[12px] items-center justify-center rounded-full bg-grey-700 font-bold text-[8px]">
            {tweet.author.screenName?.[0]?.toUpperCase() ?? "?"}
          </div>
        )}
        <span className="text-[12px] text-white leading-[1.2]">@{tweet.author.screenName}</span>
      </div>
      {/* Tweet text */}
      <p className="line-clamp-3 text-[#a5a5a5] text-[12px] leading-[1.3]">{tweet.text}</p>
    </div>

    {/* Divider */}
    <div className="h-px w-full bg-white/20" />

    {/* Timestamp */}
    <div className="text-[#a5a5a5] text-[10px] leading-[1.2] opacity-60">
      <DistanceToNow timestamp={tweet.createdAt} />
    </div>
  </div>
)
