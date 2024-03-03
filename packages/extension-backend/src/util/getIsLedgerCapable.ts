export const getIsLedgerCapable = () => !!(window as unknown as { USB?: unknown }).USB
