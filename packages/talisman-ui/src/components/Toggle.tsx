import { classNames } from "@talismn/util"
import { DetailedHTMLProps, InputHTMLAttributes, PropsWithChildren, forwardRef, useId } from "react"

type ToggleProps = Omit<
  DetailedHTMLProps<InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>,
  "ref"
> &
  PropsWithChildren

export const Toggle = forwardRef<HTMLInputElement, ToggleProps>(
  ({ children, className, ...props }, ref) => {
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
            "bg-grey-600 peer h-12 w-[4.4rem] shrink-0 rounded-full",
            "peer-focus-visible:ring-body peer-focus:outline-none peer-focus-visible:ring-2",
            "peer-checked:after:bg-primary peer-checked:after:translate-x-full",
            "after:bg-grey-800 relative after:absolute after:left-1 after:top-1 after:h-10 after:w-10 after:rounded-full after:transition-all after:content-['']"
          )}
        ></div>
        {children && <span className="ml-3">{children}</span>}
      </label>
    )
  }
)
Toggle.displayName = "Toggle"
