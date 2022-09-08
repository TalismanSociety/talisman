import { Id, ToastContent, ToastOptions, toast } from "react-toastify"

import { Notification, NotificationProps } from "./Notification"

const DEFAULT_OPTIONS: ToastOptions = {
  theme: "dark",
  closeButton: false,
  hideProgressBar: true,
  autoClose: 2000,
}

export const notify = (content: NotificationProps, options: ToastOptions = {}): Id => {
  return toast(<Notification {...content} />, {
    ...DEFAULT_OPTIONS,
    ...options,
  })
}

export const notifyCustom = (content: ToastContent<unknown>, options: ToastOptions = {}): Id => {
  return toast(content, {
    ...DEFAULT_OPTIONS,
    ...options,
  })
}

export const notifyUpdate = (
  toastId: Id,
  content: NotificationProps,
  options: ToastOptions = {}
) => {
  if (toast.isActive(toastId))
    toast.update(toastId, {
      ...DEFAULT_OPTIONS,
      render: () => <Notification {...content} />,
      ...options,
    })
  else notify(content, options)
}
