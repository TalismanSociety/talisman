type SigningDapp = { dappDomain: string | null }

type PageContext = {
  screen: string | null
  requestId: string | null
  signingDapps: SigningDapp[]
}

export const pageContext: PageContext = { screen: null, requestId: null, signingDapps: [] }

export const currentSigningDapp = (): SigningDapp | undefined => pageContext.signingDapps.at(-1)
