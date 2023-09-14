import { BackupNotification } from "./BackupNotification"
import { BraveWarningNotification } from "./BraveNotification"

const DashboardNotifications = () => (
  <div className="absolute bottom-0 left-[7.4rem] right-0 flex flex-col px-12 md:left-[17.2rem] lg:left-[32rem]">
    <BraveWarningNotification />
    <BackupNotification />
  </div>
)

export default DashboardNotifications
