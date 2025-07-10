import crypto from "crypto"

// @ts-expect-error use web implementation of crypto modules
global.crypto = crypto.webcrypto

// this works too, same performance as above
// global.crypto = crypto
