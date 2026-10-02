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

export const EXCEPTION_MECHANISMS = [
  "caught",
  "uncaught",
  "unhandled_rejection",
  "error_boundary",
] as const
export type ExceptionMechanism = (typeof EXCEPTION_MECHANISMS)[number]

export const isHandledMechanism = (mechanism: ExceptionMechanism): boolean =>
  mechanism === "caught" || mechanism === "error_boundary"

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
  mechanism?: ExceptionMechanism
  networkId?: string
}

export type ExceptionReport = {
  id: string
  mechanism: ExceptionMechanism
  exceptions: readonly Exception[]
  networkId?: string
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
