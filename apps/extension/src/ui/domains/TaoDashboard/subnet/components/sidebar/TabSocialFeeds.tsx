import { DistanceToNow } from "@talisman/components/DistanceToNow"
import { ArrowRightIcon } from "@talismn/icons"
import { useSubnetSentiment, useSubnetTweets } from "@ui/domains/TaoDashboard/hooks/useSn45Api"
import { SentimentBadge } from "@ui/domains/TaoDashboard/shared/SentimentBadge"
import { TextSkeleton as Skeleton } from "@ui/domains/TaoDashboard/shared/Skeleton"
import type { TimePeriod } from "@ui/domains/TaoDashboard/shared/types"
import { useDaysFromPeriod } from "@ui/domains/TaoDashboard/shared/util"
import {
  type FC,
  Fragment,
  type PropsWithChildren,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { useTranslation } from "react-i18next"
import { SectionTitleBar } from "./SectionTitleBar"

export const TabSocialFeeds: FC<{ netuid: number }> = ({ netuid }) => {
  const { t } = useTranslation()
  const [period, setPeriod] = useState<TimePeriod>("1W")

  return (
    <div className="flex size-full flex-col overflow-hidden">
      <SectionTitleBar label={t("Social Feeds")} period={period} onPeriodChange={setPeriod} />

      <div className="flex w-full grow flex-col overflow-hidden rounded-lg bg-grey-900">
        <SentimentSummary netuid={netuid} period={period} />
        <Separator />
        <TweetsList netuid={netuid} period={period} />
      </div>
    </div>
  )
}

type SubnetSentimentData = ReturnType<typeof useSubnetSentiment>["data"]

const SentimentSummary: FC<{ netuid: number; period: TimePeriod }> = ({ netuid, period }) => {
  const { t } = useTranslation()

  const days = useDaysFromPeriod(period)

  const { data: sentiment, isLoading } = useSubnetSentiment(netuid, days)

  if (isLoading) return <SentimentSummarySkeleton />

  if (!sentiment)
    return (
      <div className="flex h-[11.6rem] items-center justify-center text-body-secondary text-sm">
        {t("Failed to fetch data")}
      </div>
    )

  return (
    <div className="flex h-[11.6rem] flex-col justify-between gap-10 px-12 py-10">
      <div className="flex h-[2.6rem] w-full shrink-0 items-center justify-between overflow-hidden">
        <div className="text-md">{t("Market Sentiment")}</div>
        <div>
          <SentimentBadge sentiment={sentiment.sentiment} />
        </div>
      </div>
      <div className="flex flex-col gap-5">
        <SentimentSummaryBar sentiment={sentiment} />
        <div className="flex h-8 w-full shrink-0 items-center justify-between overflow-hidden text-body-disabled text-xs">
          <div>{t("Bearish")}</div>
          <div>{t("Bullish")}</div>
        </div>
      </div>
    </div>
  )
}

const SentimentSummarySkeleton = () => {
  return (
    <div className="flex h-[11.6rem] flex-col justify-between gap-10 px-12 py-10">
      <div className="flex h-[2.6rem] w-full shrink-0 items-center justify-between overflow-hidden">
        <div className="text-md">
          <Skeleton className="w-[15rem]" />
        </div>
        <div>
          <Skeleton className="h-12 w-[6rem] rounded-full" />
        </div>
      </div>
      <div className="flex flex-col gap-5">
        <Skeleton className="h-2 w-full rounded-full" />
        <div className="flex h-8 w-full shrink-0 items-center justify-between overflow-hidden text-body-disabled text-xs">
          <div>
            <Skeleton className="w-[5rem]" />
          </div>
          <div>
            <Skeleton className="w-[5rem]" />
          </div>
        </div>
      </div>
    </div>
  )
}

const Separator = () => <div className="h-px shrink-0 bg-grey-800"></div>

const SentimentSummaryBar: FC<{ sentiment: SubnetSentimentData }> = ({ sentiment }) => {
  const [bearishPercent, neutralPercent, bullishPercent] = useMemo(() => {
    if (!sentiment?.count) return [false, 0, 100, 0]
    const bearish = Math.round(
      ((sentiment.bearish + sentiment.veryBearish) / sentiment.count) * 100
    )
    const neutral = Math.round((sentiment.neutral / sentiment.count) * 100)
    const bullish = 100 - bearish - neutral
    return [bearish, neutral, bullish]
  }, [sentiment])

  return (
    <div className="flex h-2 w-full shrink-0 overflow-hidden rounded-full">
      {!!bearishPercent && (
        <div className="h-full bg-sell" style={{ width: `${bearishPercent}%` }}></div>
      )}
      {!!neutralPercent && (
        <div className="h-full bg-grey-400" style={{ width: `${neutralPercent}%` }}></div>
      )}
      {!!bullishPercent && (
        <div className="h-full bg-buy" style={{ width: `${bullishPercent}%` }}></div>
      )}
    </div>
  )
}

type TweetsData = ReturnType<typeof useSubnetTweets>["data"]
type Tweet = NonNullable<TweetsData>[number]

const TweetsList: FC<{ netuid: number; period: TimePeriod }> = ({ netuid, period }) => {
  const { t } = useTranslation()
  const days = useDaysFromPeriod(period)
  const { data: tweets, isLoading } = useSubnetTweets(netuid, days)

  const refContainer = useRef<HTMLDivElement>(null)

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll to top if inputs change
  useEffect(() => {
    if (refContainer.current) refContainer.current.scrollTo({ top: 0 })
  }, [netuid, period])

  return (
    <div ref={refContainer} className="flex flex-1 grow flex-col gap-4 overflow-y-auto p-6">
      {isLoading ? (
        <TweetCardSkeleton />
      ) : (
        tweets?.map((tweet, i, arr) => (
          <Fragment key={tweet.id}>
            <TweetCard tweet={tweet} />
            {i < arr.length - 1 && <Separator />}
          </Fragment>
        ))
      )}
      {!isLoading && !tweets?.length && (
        <div className="py-4 text-center text-body-secondary text-sm">{t("No posts found")}</div>
      )}
    </div>
  )
}

const TweetCard: FC<{ tweet: Tweet }> = ({ tweet }) => {
  const { t } = useTranslation()

  return (
    <a
      key={tweet.id}
      href={tweet.url || `https://twitter.com/i/status/${tweet.id}`}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col gap-6 rounded p-6 transition-colors hover:bg-grey-800"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          {tweet.author.profileImage ? (
            <img
              src={tweet.author.profileImage}
              alt={tweet.author.name}
              className="size-12 rounded-full"
            />
          ) : (
            <div className="flex size-8 items-center justify-center rounded-full bg-grey-700 font-bold text-sm">
              {tweet.author.screenName?.[0]?.toUpperCase() ?? "?"}
            </div>
          )}
          <span className="text-base text-body">@{tweet.author.screenName}</span>
        </div>
        <SentimentBadge sentiment={tweet.sentiment} />
      </div>
      <p className="line-clamp-3 text-body-secondary text-sm leading-relaxed">{tweet.text}</p>
      <div className="flex gap-8">
        <ImpactBadge impact={tweet.impactPotential} />
        <ConfidenceBadge confidence={tweet.relevanceConfidence} />
      </div>
      <div className="flex items-center justify-between text-grey-600 text-sm">
        <DistanceToNow timestamp={tweet.createdAt} />
        <span className="text-primary opacity-0 transition-opacity group-hover:opacity-100">
          {t("View")} <ArrowRightIcon className="inline" />
        </span>
      </div>
    </a>
  )
}

const TweetCardSkeleton = () => {
  return (
    <div className="flex flex-col gap-6 rounded p-6">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <Skeleton className="size-12 rounded-full" />
          <div className="text-base text-body">
            <Skeleton className="h-10 w-36" />
          </div>
        </div>
        <Skeleton className="h-12 w-36 rounded-full" />
      </div>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-full" />
        <Skeleton className="h-7 w-full" />
        <Skeleton className="h-7 w-3/4" />
      </div>
      <div className="flex gap-8">
        <Skeleton className="h-12 w-36 rounded-xs" />
        <Skeleton className="h-12 w-48 rounded-xs" />
      </div>
      <div className="flex items-center">
        <Skeleton className="h-7 w-24" />
      </div>
    </div>
  )
}

const ImpactBadge: FC<{ impact: Tweet["impactPotential"] }> = ({ impact }) => {
  const { t } = useTranslation()
  const label = useMemo(() => {
    switch (impact) {
      case "high":
        return t("High Impact")
      case "medium":
        return t("Medium Impact")
      case "low":
        return t("Low Impact")
      default:
        return t("Unknown Impact")
    }
  }, [impact, t])

  return <SquareBadge>{label}</SquareBadge>
}
const ConfidenceBadge: FC<{ confidence: Tweet["relevanceConfidence"] }> = ({ confidence }) => {
  const { t } = useTranslation()
  const label = useMemo(() => {
    switch (confidence) {
      case "high":
        return t("High Confidence")
      case "medium":
        return t("Medium Confidence")
      case "low":
        return t("Low Confidence")
      default:
        return t("Unknown Confidence")
    }
  }, [confidence, t])

  return <SquareBadge>{label}</SquareBadge>
}

const SquareBadge: FC<PropsWithChildren> = ({ children }) => (
  <div className="inline-flex h-12 items-center rounded-xs border border-body-secondary px-5 text-body-secondary text-xs">
    {children}
  </div>
)
