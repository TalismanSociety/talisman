import { AssetLogo } from "@ui/domains/Asset/AssetLogo"

export type TokenLogoProps = {
  tokenId?: string
  className?: string
}

// generic token logo component, supports all token types
// export const TokenLogo = ({ tokenId, className }: TokenLogoProps) => {
//   const token = useToken(tokenId)
//   const [imageUrl, setImageUrl] = useState(
//     //if token id is defined pull from cache, but if not, wait result from getSafeTokenLogoUrl
//     () =>
//       tokenId ? (tokenLogoUrlCache.has(tokenId) ? tokenLogoUrlCache.get(tokenId) : undefined) : null
//   )

//   useEffect(() => {
//     if (!token) return

//     if (!tokenLogoUrlCache.has(token.id)) {
//       if ("image" in token && token.image) {
//         tokenLogoUrlCache.set(token.id, token.image)
//         setImageUrl(token.image)
//       } else {
//         const tokenLogoUrl = getTokenLogoUrl(token)

//         // will fallback to generic token logo if not found
//         getSafeTokenLogoUrl(tokenLogoUrl).then((safeTokenLogoUrl) => {
//           tokenLogoUrlCache.set(token.id, safeTokenLogoUrl)
//           setImageUrl(safeTokenLogoUrl)
//         })
//       }
//     }
//   }, [token])

//   return <TokenImage src={imageUrl} className={className} />
// }
export const TokenLogo = ({ className, tokenId }: TokenLogoProps) => (
  <AssetLogo className={className} id={tokenId} />
)
