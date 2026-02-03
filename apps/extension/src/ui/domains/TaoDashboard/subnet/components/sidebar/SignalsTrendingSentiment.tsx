// ============================================================================
// Trending Sentiment Section
// ============================================================================

import { Icon } from "@iconify/react/dist/iconify.js"
import { cn } from "@talismn/util"
import {
  useSubnetDailyTrend,
  useSubnetEconomicsWithSentiment,
  useSubnetTokenomics,
} from "@ui/domains/TaoDashboard/hooks/useSn45Api"
import type { TimePeriod } from "@ui/domains/TaoDashboard/shared/TaoDashboardPeriodTabs"
import { type FC, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { SectionTitleBar } from "./shared"

export const SignalsTrendingSentiment: FC<{ netuid: number }> = ({ netuid }) => {
  const { t } = useTranslation()
  const [_period, _setPeriod] = useState<TimePeriod>("1W")
  const { data: tokenomics, isLoading: tokenomicsLoading } = useSubnetTokenomics(netuid)
  const { data: _dailyTrend, isLoading: trendLoading } = useSubnetDailyTrend(netuid)
  const { data: economics, isLoading: economicsLoading } = useSubnetEconomicsWithSentiment()
  const economicsData = economics?.[netuid]
  const isLoading = tokenomicsLoading || trendLoading || economicsLoading

  const alphaFlow = useMemo(() => {
    if (!tokenomics) return 0
    const alphaIn = parseFloat(tokenomics.alphaIn) / 1e9
    const alphaOut = parseFloat(tokenomics.alphaOut) / 1e9
    return alphaIn - alphaOut
  }, [tokenomics])

  const EMA = useMemo(() => {
    if (!tokenomics?.emaTaoFlow) return 0
    return parseFloat(tokenomics.emaTaoFlow) / 2 ** 64 / 1e9
  }, [tokenomics])

  if (isLoading) {
    return (
      <div className="rounded-xl bg-grey-900 p-5">
        <div className="h-40 animate-pulse rounded-lg bg-grey-800" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <SectionTitleBar
        label={t("Trending sentiment")}
        period={_period}
        onPeriodChange={_setPeriod}
      />

      <div className="rounded-xl bg-grey-900 p-5">
        <div className="flex items-stretch gap-6">
          {/* Left: Gauge */}
          <div className="flex flex-col items-center">
            <span className="mb-1 text-body-secondary text-xs">Sentiment Score</span>
            <SentimentGauge
              score={
                economicsData?.sentimentScore !== undefined
                  ? Math.round(((economicsData.sentimentScore + 2) / 4) * 100)
                  : 0
              }
              // TODO translate
              label={getSentimentLabel(
                economicsData?.sentimentScore !== undefined
                  ? Math.round(((economicsData.sentimentScore + 2) / 4) * 100)
                  : 0
              )}
            />
          </div>

          {/* Vertical Divider */}
          <div className="w-px self-stretch bg-grey-700" />

          {/* Right: Metrics */}
          <div className="flex flex-1 flex-col justify-center space-y-4">
            <div>
              <span className="text-body-secondary text-xs">Alpha Flow</span>
              <div className="flex items-center gap-1">
                <span
                  className={cn(
                    "font-bold text-lg",
                    alphaFlow >= 0 ? "text-green" : "text-red-500"
                  )}
                >
                  {formatCompactNumber(Math.abs(alphaFlow))}α
                </span>
                <Icon
                  icon={alphaFlow >= 0 ? "mdi:arrow-top-right" : "mdi:arrow-bottom-right"}
                  className={cn("size-5", alphaFlow >= 0 ? "text-green" : "text-red-500")}
                />
              </div>
            </div>

            <div>
              <span className="text-body-secondary text-xs">EMA</span>
              <div className={cn("font-bold text-lg", EMA >= 0 ? "text-green" : "text-red-500")}>
                {EMA >= 0 ? "+" : ""}
                {EMA.toFixed(2)}
              </div>
            </div>

            <div>
              {/* <span className="text-body-secondary text-xs">Combined Score</span>
              <div
                className={cn(
                  "font-bold text-2xl",
                  combineScore === "Bullish"
                    ? "text-green"
                    : combineScore === "Bearish"
                      ? "text-red-500"
                      : "text-white"
                )}
              >
                {combineScore}
              </div> */}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Sentiment Gauge Component (SVG-based semi-circular fuel gauge)
// ============================================================================

const SentimentGauge: FC<{
  score: number // 0-100
  label: string
}> = ({ score, label }) => {
  // Calculate needle rotation: -90deg (left/red) to 90deg (right/green)
  const needleRotation = (score / 100) * 180 - 90

  // Designed for compact in-panel display: fits in card, not full page
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        width: 120,
        padding: "0 4px",
      }}
    >
      {/* Title */}
      {/* <div
        style={{
          color: '#808080',
          fontSize: 11,
          fontWeight: 400,
          marginBottom: 4,
          letterSpacing: '0.5px',
          lineHeight: 1,
        }}
      >
        Sentiment
      </div> */}

      {/* Gauge SVG Container */}
      <div style={{ width: 160, height: 150, position: "relative" }}>
        <svg
          viewBox="0 0 100 68"
          style={{
            width: "100%",
            height: "100%",
            display: "block",
          }}
        >
          <defs>
            <linearGradient id="gaugeGradientMini" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#e63946" />
              <stop offset="25%" stopColor="#f4a261" />
              <stop offset="50%" stopColor="#e9c46a" />
              <stop offset="75%" stopColor="#a7c957" />
              <stop offset="100%" stopColor="#2a9d3f" />
            </linearGradient>
            <radialGradient id="ballGradientMini" cx="50%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#444" />
              <stop offset="100%" stopColor="#222" />
            </radialGradient>
            <filter id="dialShadowMini" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow
                dx="0"
                dy="2"
                stdDeviation="2"
                floodColor="#000000"
                floodOpacity="0.45"
              />
            </filter>
          </defs>
          {/* Half-arc (gauge) */}
          <path
            d="M 13 53 A 37 37 0 0 1 87 53"
            fill="none"
            stroke="url(#gaugeGradientMini)"
            strokeWidth="9"
            strokeLinecap="round"
          />
          {/* Needle - wide pointer */}
          <g transform={`rotate(${needleRotation}, 50, 53)`}>
            <polygon points="50,20 44,53 56,53" fill="#2d2d2d" />
          </g>
          {/* Center dial ball with drop shadow */}
          <circle cx="50" cy="53" r="20" fill="#2d2d2d" filter="url(#dialShadowMini)" />
          <circle cx="50" cy="53" r="20" fill="url(#ballGradientMini)" />
          {/* Score number */}
          <text
            x="50"
            y="57"
            textAnchor="middle"
            fill="#fff"
            fontSize="17"
            fontWeight="700"
            fontFamily="Helvetica Neue, Helvetica, Arial, sans-serif"
            style={{ letterSpacing: "-1px" }}
          >
            {Math.round(score)}
          </text>
        </svg>
      </div>
      {/* Sentiment Label */}
      <div
        style={{
          color: "#fff",
          fontSize: 15,
          fontWeight: 400,
          lineHeight: "21px",
          marginTop: 0,
          textAlign: "center",
          width: "100%",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
        title={label}
      >
        {label}
      </div>
    </div>
  )
}

const formatCompactNumber = (num: number): string => {
  if (num >= 1000000000) return `${(num / 1000000000).toFixed(1)}B`
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
  return num.toFixed(0)
}

const getSentimentLabel = (score: number) => {
  if (score >= 80) {
    return "Very Bullish"
  } else if (score >= 60) {
    return "Bullish"
  } else if (score >= 40) {
    return "Neutral"
  } else if (score >= 20) {
    return "Bearish"
  } else {
    return "Very Bearish"
  }
}
