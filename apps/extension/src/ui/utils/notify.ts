import { Id, ToastContent, ToastOptions, toast } from "react-toastify"

// Styles are defined in src/@talisman/components/NotificationsContainer.tsx

const DEFAULT_OPTIONS: ToastOptions = {
  theme: "dark",
  closeButton: false,
}

export const notify = (content: ToastContent<unknown>, options: ToastOptions = {}): Id => {
  return toast(content, {
    ...DEFAULT_OPTIONS,
    ...options,
  })
}
