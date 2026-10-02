import { type DevLogEntry, devLogStore } from "@core/domains/analytics/exports"
import { bind } from "@react-rxjs/core"
import { DashboardLayout } from "@ui/apps/dashboard/layout"
import { HeaderBlock } from "@ui/components/HeaderBlock"
import { cn } from "@ui/util/cn"
import { useMemo, useState } from "react"
import { map, of } from "rxjs"

const [useDevLogEntries] = bind(
  devLogStore ? devLogStore.observable.pipe(map(({ entries }) => entries)) : of([])
)

const time = (ms: number) => new Date(ms).toLocaleTimeString()

const DISPOSITION_COLOURS: Record<DevLogEntry["disposition"], string> = {
  queued: "bg-primary/10 text-primary",
  released: "bg-primary/10 text-primary",
  held: "bg-alert-warn/10 text-alert-warn",
  dropped_consent: "bg-grey-800 text-body-secondary",
  dropped_off: "bg-grey-800 text-body-secondary",
  purged: "bg-grey-800 text-body-secondary",
  rejected: "bg-alert-error/10 text-alert-error",
}

const Chip = ({ className, children }: { className?: string; children: string }) => (
  <span className={cn("rounded px-3 py-1 text-xs", className ?? "bg-grey-800 text-body-secondary")}>
    {children}
  </span>
)

const DevLogRow = ({ entry }: { entry: DevLogEntry }) => {
  const uiContext = entry.wire?.properties.ui_context
  return (
    <details className="rounded bg-grey-850 px-6 py-4">
      <summary className="flex cursor-pointer items-center gap-4">
        <span className="w-28 shrink-0 text-body-secondary text-xs">{time(entry.capturedAt)}</span>
        <span className="grow truncate font-mono text-sm">{entry.name || "(no name)"}</span>
        {typeof uiContext === "string" && <Chip>{uiContext}</Chip>}
        <Chip className={DISPOSITION_COLOURS[entry.disposition]}>{entry.disposition}</Chip>
        <span className="w-48 shrink-0 text-right text-body-secondary text-xs">
          {entry.deliveredAt
            ? `delivered ${time(entry.deliveredAt)}`
            : entry.wire && `sends after ${time(Date.parse(entry.wire.timestamp))}`}
        </span>
      </summary>
      <pre className="mt-4 overflow-x-auto whitespace-pre-wrap break-all text-body-secondary text-xs">
        {JSON.stringify(entry.wire ?? { issues: entry.issues }, null, 2)}
      </pre>
    </details>
  )
}

const Content = () => {
  const entries = useDevLogEntries()
  const [filter, setFilter] = useState("")
  const [clearedAt, setClearedAt] = useState(0)

  const shown = useMemo(
    () =>
      entries
        .filter((entry) => entry.capturedAt > clearedAt && entry.name.includes(filter))
        .reverse(),
    [entries, filter, clearedAt]
  )

  return (
    <>
      <HeaderBlock
        title="Analytics event log"
        text="Dev builds only. Every event the background captured, newest first, as it would be sent. Dev builds never send."
      />
      <div className="mt-8 flex gap-4">
        <input
          className="grow rounded bg-grey-850 px-6 py-3 text-sm"
          placeholder="Filter by event name"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
        />
        <button
          type="button"
          className="rounded bg-grey-800 px-6 py-3 text-sm hover:bg-grey-750"
          onClick={() => setClearedAt(Date.now())}
        >
          Clear
        </button>
      </div>
      <div className="mt-8 flex flex-col gap-2">
        {shown.map((entry) => (
          <DevLogRow key={entry.id} entry={entry} />
        ))}
        {!shown.length && <div className="text-body-secondary text-sm">No events yet.</div>}
      </div>
    </>
  )
}

const DevEventLogPage = () => (
  <DashboardLayout sidebar="settings">
    <Content />
  </DashboardLayout>
)

export default DevEventLogPage
