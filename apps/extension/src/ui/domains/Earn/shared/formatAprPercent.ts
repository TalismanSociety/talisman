// formats a yield percentage (4.5 == 4.5%) consistently wherever an APR/APY is displayed
export const formatAprPercent = (apr: number) =>
  Intl.NumberFormat(undefined, { style: "percent", maximumFractionDigits: 1 }).format(apr / 100)
