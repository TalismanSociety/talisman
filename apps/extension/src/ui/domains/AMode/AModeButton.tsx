import { StarIcon } from "@talismn/icons"
import { Tooltip, TooltipContent, TooltipTrigger } from "@ui/components/Tooltip"
import { cn } from "@ui/util/cn"
import type { FC } from "react"
import { useTranslation } from "react-i18next"

import type { AModeShortcut } from "./types"

const VARIANT_CLASSNAMES = {
  primary: {
    button: "min-h-24 flex-col gap-2 px-2 py-4 text-sm",
    icon: "size-12",
  },
  compact: {
    button: "min-h-20 flex-col gap-1 px-1 py-2 text-tiny leading-[1.2]",
    icon: "size-9",
  },
  regular: {
    button: "min-h-24 flex-col gap-2 px-2 py-3 text-xs leading-[1.2]",
    icon: "size-10",
  },
} as const

const FavouriteToggle: FC<{ label: string; pinned: boolean; onToggle: () => void }> = ({
  label,
  pinned,
  onToggle,
}) => {
  const { t } = useTranslation()
  return (
    <button
      type="button"
      aria-pressed={pinned}
      aria-label={
        pinned
          ? t("Remove {{label}} from favourites", { label })
          : t("Add {{label}} to favourites", { label })
      }
      onClick={onToggle}
      className={cn(
        "absolute top-0 right-0 flex size-10 items-center justify-center rounded-xs",
        "opacity-0 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-primary group-focus-within:opacity-100 group-hover:opacity-100",
        pinned ? "text-primary" : "text-body-secondary hover:text-body"
      )}
    >
      <StarIcon className={cn("size-7", pinned && "fill-current")} aria-hidden />
    </button>
  )
}

export const AModeButton: FC<{
  shortcut: AModeShortcut
  variant: keyof typeof VARIANT_CLASSNAMES
  /** shows the star that pins the shortcut to Favourites */
  favourite?: { pinned: boolean; onToggle: () => void }
}> = ({
  shortcut: { id, label, icon: Icon, onClick, disabled, disabledReason, badge },
  variant,
  favourite,
}) => {
  const { t } = useTranslation()
  const classNames = VARIANT_CLASSNAMES[variant]

  return (
    <div className="group relative min-w-0">
      <Tooltip placement="bottom">
        <TooltipTrigger asChild>
          <button
            type="button"
            data-testid={`a-mode-shortcut-${id}`}
            aria-disabled={disabled || undefined}
            onClick={disabled ? undefined : onClick}
            className={cn(
              "relative flex w-full min-w-0 items-center justify-start rounded-sm text-center text-body-secondary",
              "focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-1",
              variant === "primary" ? "bg-white/5" : "bg-transparent",
              disabled ? "cursor-not-allowed opacity-50" : "hover:bg-white/10 hover:text-body",
              classNames.button
            )}
          >
            <span className="relative">
              <Icon className={classNames.icon} aria-hidden />
              {badge && (
                <>
                  <span
                    aria-hidden
                    className="absolute -top-1 -right-1 size-4 rounded-full bg-alert-error"
                  />
                  <span className="sr-only">{t("Needs attention")}</span>
                </>
              )}
            </span>
            <span className="line-clamp-2 break-words">{label}</span>
          </button>
        </TooltipTrigger>
        {!!disabled && !!disabledReason && <TooltipContent>{disabledReason}</TooltipContent>}
      </Tooltip>
      {favourite && <FavouriteToggle label={label} {...favourite} />}
    </div>
  )
}
