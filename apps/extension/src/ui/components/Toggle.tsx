import { classNames } from "@ui/util/cn"
import {
  type DetailedHTMLProps,
  forwardRef,
  type InputHTMLAttributes,
  type PropsWithChildren,
  useId,
} from "react"

// can't override size, naming this variant instead but it's only for size
type ToggleVariant = "default" | "sm" | "tiny"

const VARIANTS: Record<ToggleVariant, string> = {
  tiny: "h-6 w-11 after:size-5 after:left-0.5 after:top-0.5 border-2",
  sm: "h-10 w-[2.25rem] after:h-8 after:w-8 ",
  default: "h-12 w-[2.75rem] after:h-10 after:w-10 ",
}

type ToggleProps = Omit<
  DetailedHTMLProps<InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>,
  "ref"
> &
  PropsWithChildren & {
    variant?: ToggleVariant
  }

export const Toggle = forwardRef<HTMLInputElement, ToggleProps>(
  ({ children, className, variant = "default", ...props }, ref) => {
    const defaultId = useId()
    const id = props.id ?? defaultId

    return (
      <label
        htmlFor={id}
        className={classNames(
          "relative inline-flex items-center",
          props.disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
          className
        )}
      >
        <input id={id} ref={ref} type="checkbox" className="peer sr-only" {...props} />
        <div
          className={classNames(
            "peer box-content shrink-0 rounded-full border-2 border-transparent bg-grey-600",
            "peer-focus:outline-hidden peer-focus-visible:border-body",
            "peer-checked:after:translate-x-full peer-checked:after:bg-primary",
            "relative after:absolute after:top-1 after:left-1 after:rounded-full after:bg-grey-800 after:transition-all after:content-['']",
            VARIANTS[variant]
          )}
          data-testid="component-toggle-button"
        ></div>
        {children && <span className="ml-3">{children}</span>}
      </label>
    )
  }
)
Toggle.displayName = "Toggle"
