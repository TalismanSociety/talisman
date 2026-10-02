import { classifyError, type ErrorCategory } from "@common/analytics/errorCategory"
import { sleep } from "@talismn/util"
import { reportToastError } from "@ui/hooks/analytics/errorShown"
import { type Id, type ToastContent, type ToastOptions, toast } from "react-toastify"

import { Notification, type NotificationProps } from "./Notification"

const DEFAULT_OPTIONS: ToastOptions = {
  theme: "dark",
  closeButton: false,
  hideProgressBar: true,
  autoClose: 2000,
}

/** Without a cause, a string subtitle is usually the error's message: its patterns still classify. */
const categoryOf = ({ errorCategory, cause, subtitle }: NotificationProps): ErrorCategory => {
  if (errorCategory) return errorCategory
  if (cause !== undefined) return classifyError(cause)
  return typeof subtitle === "string" ? classifyError(subtitle) : "unknown"
}

export const notify = (content: NotificationProps, options: ToastOptions = {}): Id => {
  const toastId = toast(<Notification {...content} />, {
    ...DEFAULT_OPTIONS,
    ...options,
  })
  if (content.type === "error") reportToastError(toastId, categoryOf(content))
  return toastId
}

export const notifyCustom = (content: ToastContent<unknown>, options: ToastOptions = {}): Id => {
  return toast(content, {
    ...DEFAULT_OPTIONS,
    ...options,
  })
}

export const notifyUpdate = async (
  toastId: Id,
  content: NotificationProps,
  options: ToastOptions = {}
) => {
  // toast.isActive may return false if the toast is not yet rendered
  await sleep(50)

  if (toast.isActive(toastId)) {
    toast.update(toastId, {
      ...DEFAULT_OPTIONS,
      render: () => <Notification {...content} />,
      ...options,
    })
    if (content.type === "error") reportToastError(toastId, categoryOf(content))
  } else notify(content, options)
}
