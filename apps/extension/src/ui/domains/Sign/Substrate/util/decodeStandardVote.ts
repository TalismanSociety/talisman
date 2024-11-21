const AYE_BITS = 0b10000000
const CON_MASK = 0b01111111

export const decodeStandardVote = (
  vote: number,
): {
  isAye: boolean
  conviction: number
} => ({
  isAye: (vote & AYE_BITS) === AYE_BITS,
  conviction: vote & CON_MASK,
})
