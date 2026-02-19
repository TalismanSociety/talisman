import { InfoIcon } from "@talismn/icons"
import { cn } from "@talismn/util"
import {
  type SubnetLeaderboardRow,
  useSubnetLeaderboardEntry,
} from "@ui/domains/TaoDashboard/hooks/useSn45Api"
import { useSentimentLabelFromScore100 } from "@ui/domains/TaoDashboard/shared/SentimentBadge"
import type { TimePeriod } from "@ui/domains/TaoDashboard/shared/types"
import {
  useColorFromScore100,
  useLeaderboardPeriod,
  useScore1To100,
  useScore2To100,
} from "@ui/domains/TaoDashboard/shared/util"
import { type FC, type PropsWithChildren, type ReactNode, useId, useState } from "react"
import { useTranslation } from "react-i18next"
import { Tooltip, TooltipContent, TooltipTrigger } from "talisman-ui"
import { SectionTitleBar } from "./shared"

export const SignalsTrendingSentiment: FC<{ netuid: number }> = ({ netuid }) => {
  const { t } = useTranslation()
  const [period, setPeriod] = useState<TimePeriod>("1W")

  const leaderboardPeriod = useLeaderboardPeriod(period)
  const { data, isLoading } = useSubnetLeaderboardEntry(netuid, leaderboardPeriod)

  return (
    <div>
      <SectionTitleBar label={t("Trending sentiment")} period={period} onPeriodChange={setPeriod} />

      <div className="rounded-lg bg-grey-900 px-12 py-8">
        {isLoading ? (
          <TradingSentimentSkeleton />
        ) : data ? (
          <TrendingSentiment data={data} />
        ) : (
          <div className="flex h-[16.5rem] items-center justify-center text-body-secondary">
            {t("Failed to fetch data")}
          </div>
        )}
      </div>
    </div>
  )
}

const TrendingSentiment: FC<
  PropsWithChildren<{
    data: SubnetLeaderboardRow
  }>
> = ({ data }) => {
  const { t } = useTranslation()
  const scoreLabel = useSentimentLabelFromScore100(data.score)

  const flowChangeScore = useScore2To100(data.taoFlowVelocity)
  const flowChangeColor = useColorFromScore100(flowChangeScore)

  const volChangeScore = useScore2To100(data.volMcapVelocity)
  const volChangeColor = useColorFromScore100(volChangeScore)

  const sentChangeScore = useScore1To100(data.sentimentVelocity)
  const sentChangeColor = useColorFromScore100(sentChangeScore)

  return (
    <div className="flex h-[16.5rem] items-stretch gap-14">
      <div className="flex h-full flex-col items-center justify-between">
        <div className="mb-1 text-body-inactive text-xs">{t("Combined Score")}</div>
        <SentimentGauge score={data.score ?? 50} />
        <div className="text-md">{scoreLabel}</div>
      </div>

      <div className="w-px self-stretch bg-grey-800" />

      <div className="flex h-full flex-col items-start justify-between">
        <SentimentField
          label={t("Flow Change")}
          tooltip={t(
            "0-100 score based on acceleration or deceleration of Tao Flow compared to previous period"
          )}
          className={cn(flowChangeColor)}
        >
          {flowChangeScore}
        </SentimentField>
        <SentimentField
          label={t("Volume Change")}
          tooltip={t(
            "0-100 score based on volume expansion or contraction compared to previous period"
          )}
          className={cn(volChangeColor)}
        >
          {volChangeScore}
        </SentimentField>
        <SentimentField
          label={t("Sentiment Change")}
          tooltip={t("0-100 score based on shift in social sentiment compared to previous period")}
          className={cn(sentChangeColor)}
        >
          {sentChangeScore ?? t("N/A")}
        </SentimentField>
      </div>
    </div>
  )
}

const SentimentField: FC<
  PropsWithChildren<{ label: ReactNode; tooltip?: ReactNode; className?: string }>
> = ({ label, children, tooltip, className }) => (
  <div className={cn("flex flex-col gap-2")}>
    <Tooltip placement="bottom-end">
      <TooltipTrigger asChild>
        <div className="flex max-w-sm items-center gap-1 text-body-inactive text-xs">
          {label}
          {!!tooltip && <InfoIcon />}
        </div>
      </TooltipTrigger>
      {!!tooltip && <TooltipContent>{tooltip}</TooltipContent>}
    </Tooltip>
    <div className={cn("text-md", className)}>{children}</div>
  </div>
)

const SentimentGauge: FC<{ score: number }> = ({ score }) => {
  const gradientId = useId()
  const needleRotation = (score / 100) * 180 - 90

  return (
    <svg
      width="118"
      height="103"
      viewBox="0 0 118 103"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="h-[103px] w-[118px]"
    >
      {/* outer gradient shape */}
      <path
        d="M112.425 71.6381C114.629 72.1594 116.853 70.7968 117.22 68.5622C118.433 61.1737 118.232 53.6087 116.611 46.2731C114.695 37.6005 110.846 29.4724 105.351 22.4949C99.8553 15.5175 92.8555 9.87071 84.8734 5.9758C76.8913 2.0809 68.1329 0.038366 59.2513 0.00053521C50.3697 -0.0372955 41.5942 1.93055 33.5792 5.75732C25.5642 9.58408 18.5166 15.171 12.962 22.1014C7.40744 29.0318 3.48919 37.1269 1.49952 45.7828C-0.183427 53.1043 -0.449851 60.6673 0.700682 68.0659C1.04865 70.3036 3.26099 71.6851 5.46908 71.1825C7.67717 70.68 9.04238 68.4835 8.71953 66.2421C7.82792 60.0519 8.08544 53.738 9.49175 47.6199C11.2049 40.1671 14.5785 33.1972 19.361 27.2301C24.1436 21.263 30.2116 16.4526 37.1125 13.1577C44.0135 9.86288 51.5693 8.16855 59.2164 8.20112C66.8635 8.23369 74.4045 9.99233 81.2772 13.3459C88.1498 16.6994 94.1766 21.5613 98.9082 27.5689C103.64 33.5766 106.954 40.5749 108.603 48.0421C109.958 54.1719 110.161 60.4878 109.217 66.6702C108.875 68.9088 110.221 71.1168 112.425 71.6381Z"
        fill={`url(#${gradientId})`}
      />
      {/* central shape including needle */}
      <g transform={`rotate(${needleRotation}, 59, 59)`}>
        <path
          d="M58.6179 4.30188C58.9746 3.52467 60.0796 3.52467 60.4363 4.30188L68.1443 21.0988C85.2611 25.2139 97.9812 40.6206 97.9812 59.0001C97.9811 80.5293 80.528 97.9825 58.9988 97.9825C37.4698 97.9823 20.0174 80.5291 20.0173 59.0001C20.0173 40.2021 33.323 24.5125 51.03 20.8341L58.6179 4.30188Z"
          fill="#262626"
        />
      </g>
      <text
        x="59"
        y="59"
        textAnchor="middle"
        dominantBaseline="middle"
        fill="#fff"
        fontSize="22"
        fontWeight="700"
      >
        {Math.round(score)}
      </text>
      <defs>
        <linearGradient
          id={gradientId}
          x1="116.42"
          y1="60.5803"
          x2="4.21428"
          y2="60.5803"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#6CFC69" />
          <stop offset="1" stopColor="#FD4848" />
        </linearGradient>
      </defs>
    </svg>
  )
}

const TradingSentimentSkeleton = () => (
  <div className="flex h-[16.5rem] items-stretch gap-14">
    <div className="flex h-full w-[118px] flex-col items-center justify-between">
      <div className="mb-1 text-body-inactive text-xs">
        <Skeleton className="w-[9rem]" />
      </div>
      <SentimentGaucheSkeleton />
      <div>
        <Skeleton className="w-[6rem]" />
      </div>
    </div>

    <div className="w-px self-stretch bg-grey-800" />

    <div className="flex h-full flex-col items-start justify-between">
      <SentimentFieldSkeleton />
      <SentimentFieldSkeleton />
      <SentimentFieldSkeleton />
    </div>
  </div>
)

const SentimentGaucheSkeleton = () => (
  <svg
    width="118"
    height="103"
    viewBox="0 0 118 103"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="h-[103px] w-[118px] animate-pulse"
  >
    <path
      d="M112.425 71.6381C114.629 72.1594 116.853 70.7968 117.22 68.5622C118.433 61.1737 118.232 53.6087 116.611 46.2731C114.695 37.6005 110.846 29.4724 105.351 22.4949C99.8553 15.5175 92.8555 9.87071 84.8734 5.9758C76.8913 2.0809 68.1329 0.038366 59.2513 0.00053521C50.3697 -0.0372955 41.5942 1.93055 33.5792 5.75732C25.5642 9.58408 18.5166 15.171 12.962 22.1014C7.40744 29.0318 3.48919 37.1269 1.49952 45.7828C-0.183427 53.1043 -0.449851 60.6673 0.700682 68.0659C1.04865 70.3036 3.26099 71.6851 5.46908 71.1825C7.67717 70.68 9.04238 68.4835 8.71953 66.2421C7.82792 60.0519 8.08544 53.738 9.49175 47.6199C11.2049 40.1671 14.5785 33.1972 19.361 27.2301C24.1436 21.263 30.2116 16.4526 37.1125 13.1577C44.0135 9.86288 51.5693 8.16855 59.2164 8.20112C66.8635 8.23369 74.4045 9.99233 81.2772 13.3459C88.1498 16.6994 94.1766 21.5613 98.9082 27.5689C103.64 33.5766 106.954 40.5749 108.603 48.0421C109.958 54.1719 110.161 60.4878 109.217 66.6702C108.875 68.9088 110.221 71.1168 112.425 71.6381Z"
      fill="#262626"
    />
    <g transform={`rotate(0, 59, 59)`}>
      <path
        d="M58.6179 4.30188C58.9746 3.52467 60.0796 3.52467 60.4363 4.30188L68.1443 21.0988C85.2611 25.2139 97.9812 40.6206 97.9812 59.0001C97.9811 80.5293 80.528 97.9825 58.9988 97.9825C37.4698 97.9823 20.0174 80.5291 20.0173 59.0001C20.0173 40.2021 33.323 24.5125 51.03 20.8341L58.6179 4.30188Z"
        fill="#262626"
      />
    </g>
  </svg>
)

const SentimentFieldSkeleton = () => (
  <div className="flex flex-col gap-2">
    <div className="text-body-inactive text-xs">
      <Skeleton className="w-[12rem]" />
    </div>
    <div className="text-md">
      <Skeleton className="w-[4rem]" />
    </div>
  </div>
)

const Skeleton: FC<PropsWithChildren<{ className?: string }>> = ({ className }) => (
  <div
    className={cn(
      "my-px h-[0.9em] shrink-0 animate-pulse rounded-xs bg-grey-800 text-grey-800",
      className
    )}
  />
)
