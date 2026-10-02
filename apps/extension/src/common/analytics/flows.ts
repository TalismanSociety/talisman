/** @knipignore seam for unit 4 */
export type FlowDefinition<
  Name extends string = string,
  Steps extends readonly string[] = readonly string[],
> = {
  readonly name: Name
  readonly description: string
  readonly steps: Steps
}

export type FlowEventName<Name extends string> =
  | `${Name}_started`
  | `${Name}_step_viewed`
  | `${Name}_submitted`
  | `${Name}_completed`
  | `${Name}_failed`
  | `${Name}_abandoned`
