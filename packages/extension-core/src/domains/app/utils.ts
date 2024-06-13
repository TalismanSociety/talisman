export class TalismanNotOnboardedError extends Error {
  constructor() {
    super("Talisman extension has not been configured yet. Please continue with onboarding.")
  }
}
