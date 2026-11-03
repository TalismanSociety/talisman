export const formatValidatorApy = (thirtyDayApy: number | null | undefined) =>
  thirtyDayApy == null ? null : `${(thirtyDayApy * 100).toFixed(2)}%`
