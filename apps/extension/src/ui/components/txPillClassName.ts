/**
 * a value in a transaction's detail rows that opens a setting: icon first, row-sized text.
 * The pill hangs into the row's right margin, so its text ends where the plain values end.
 * The icon is taller than the digits beside it: half a pixel up centres it on them.
 */
export const TX_PILL_CLASS_NAME =
  "-mr-4 [&>svg]:-translate-y-[0.5px] flex h-11 min-w-0 items-center gap-2 overflow-hidden rounded-full bg-grey-800 px-4 text-body text-xs hover:bg-grey-700"
