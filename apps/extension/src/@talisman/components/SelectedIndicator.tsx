import { classNames } from "@talismn/util"

export const SelectedIndicator = ({ className }: { className?: string }) => (
  <svg
    width="18"
    height="16"
    viewBox="0 0 18 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={classNames(className)}
  >
    <ellipse cx="9.26364" cy="8" rx="8.45841" ry="8" fill="#5A5A5A" />
    <ellipse cx="9.26363" cy="8" rx="4.2292" ry="4" fill="#D5FF5C" />
  </svg>
)
