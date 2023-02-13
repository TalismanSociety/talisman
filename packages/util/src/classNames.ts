type ClassName = string | false | undefined | null

export const classNames = (...args: ClassName[]): string | undefined => {
  return args.filter(Boolean).join(" ") || undefined
}
