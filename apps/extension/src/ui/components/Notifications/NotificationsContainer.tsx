import "react-toastify/dist/ReactToastify.css"

import { ToastContainer } from "react-toastify"

export const NotificationsContainer = () => (
  <ToastContainer
    toastClassName="bg-grey-850! rounded! w-82.5 right-12 font-sans! mr-0 mb-4 border border-grey-750"
    bodyClassName="px-4! py-0!"
    className="top-12! right-0! left-auto! w-auto!"
    progressClassName={"helloprogress"}
  />
)
