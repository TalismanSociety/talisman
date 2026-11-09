export const saveIdForMonitoring = async (swapId: string, txHash: string) => {
  await fetch(`https://swap-providers-monitor.fly.dev/simpleswap/exchange`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ id: swapId, deposit_tx_hash: txHash }),
  })
}
