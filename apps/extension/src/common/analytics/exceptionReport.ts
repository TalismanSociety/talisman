import {
  createDefaultStackParser,
  DOMExceptionCoercer,
  ErrorCoercer,
  ErrorEventCoercer,
  ErrorPropertiesBuilder,
  EventCoercer,
  type Exception,
  ObjectCoercer,
  PrimitiveCoercer,
  PromiseRejectionEventCoercer,
  StringCoercer,
} from "@posthog/core/error-tracking"

/** Mobile's mechanisms plus `caught`: an error a call site caught and chose to report. */
export const EXCEPTION_MECHANISMS = [
  "caught",
  "uncaught",
  "unhandled_rejection",
  "error_boundary",
] as const
export type ExceptionMechanism = (typeof EXCEPTION_MECHANISMS)[number]

export const isHandledMechanism = (mechanism: ExceptionMechanism): boolean =>
  mechanism === "caught" || mechanism === "error_boundary"

/** One source for the builder's cuts and the worker's schema: a built report always parses. */
export const EXCEPTION_LIMITS = {
  entries: 10,
  framesPerEntry: 50,
  typeLength: 128,
  rawValueLength: 2_000,
  filenameLength: 512,
  functionLength: 256,
  chunkIdLength: 64,
  networkIdLength: 128,
  screenLength: 256,
} as const

export type ReportErrorOptions = {
  /** Only the global handlers and the error boundary pass another than `caught`. */
  mechanism?: ExceptionMechanism
  /** A chaindata network id. The worker sends `custom` for user-added and unknown networks. */
  networkId?: string
}

/**
 * What a realm hands to the worker's intake, which treats it as untrusted: it parses, scrubs and
 * fingerprints it. Values are raw, so a report lives in memory and on the port only.
 */
export type ExceptionReport = {
  /** UUIDv4, the event uuid: the boundary shows it as its Error ID. */
  id: string
  mechanism: ExceptionMechanism
  /** The thrown value first, then its `cause` chain, with this realm's chunk ids applied. */
  exceptions: readonly Exception[]
  networkId?: string
  /** Pages only: the screen pattern when it threw. */
  screen?: string
}

const builder = new ErrorPropertiesBuilder(
  [
    new DOMExceptionCoercer(),
    new PromiseRejectionEventCoercer(),
    new ErrorEventCoercer(),
    new ErrorCoercer(),
    new EventCoercer(),
    new ObjectCoercer(),
    new StringCoercer(),
    new PrimitiveCoercer(),
  ],
  createDefaultStackParser()
)

const L = EXCEPTION_LIMITS

const cut = <K extends string>(key: K, text: string | undefined, length: number) =>
  text === undefined ? {} : ({ [key]: text.slice(0, length) } as Record<K, string>)

const withinLimits = ({ type, value, stacktrace, ...exception }: Exception): Exception => ({
  ...exception,
  ...cut("type", type, L.typeLength),
  ...cut("value", value, L.rawValueLength),
  ...(stacktrace?.frames && {
    stacktrace: {
      type: "raw",
      frames: stacktrace.frames
        .slice(-L.framesPerEntry)
        .map(({ filename, function: name, chunk_id, ...frame }) => ({
          ...frame,
          ...cut("filename", filename, L.filenameLength),
          ...cut("function", name, L.functionLength),
          ...cut("chunk_id", chunk_id, L.chunkIdLength),
        })),
    },
  }),
})

/** Never throws: it runs inside the global error handlers. */
export const buildExceptionReport = (
  thrown: unknown,
  { mechanism = "caught", networkId, screen }: ReportErrorOptions & { screen?: string }
): ExceptionReport => {
  const handled = isHandledMechanism(mechanism)
  let exceptions: readonly Exception[]
  try {
    const { $exception_list } = builder.buildFromUnknown(thrown, {
      mechanism: { type: mechanism, handled },
    })
    exceptions = $exception_list.slice(0, L.entries).map(withinLimits)
  } catch {
    exceptions = [
      {
        type: "Error",
        value: "Unreadable thrown value",
        mechanism: { type: mechanism, handled, synthetic: true, exception_id: 0 },
      },
    ]
  }
  return {
    id: crypto.randomUUID(),
    mechanism,
    exceptions,
    ...(networkId && { networkId: networkId.slice(0, L.networkIdLength) }),
    ...(screen && { screen: screen.slice(0, L.screenLength) }),
  }
}

export const installGlobalErrorHandlers = (
  target: Pick<EventTarget, "addEventListener">,
  report: (thrown: unknown, options: { mechanism: ExceptionMechanism }) => void
): void => {
  target.addEventListener("error", (event) => {
    const { error, message } = event as ErrorEvent
    report(error ?? message, { mechanism: "uncaught" })
  })
  target.addEventListener("unhandledrejection", (event) => {
    report((event as PromiseRejectionEvent).reason, { mechanism: "unhandled_rejection" })
  })
}
