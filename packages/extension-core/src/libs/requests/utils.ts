import { AnyRespondableRequest, KnownRequestTypes, KnownRespondableRequest } from "./types"

export const isRequestOfType = <Type extends KnownRequestTypes>(
  request: Partial<AnyRespondableRequest> & Pick<AnyRespondableRequest, "type">,
  type: Type
): request is AnyRespondableRequest => {
  return (request as KnownRespondableRequest<Type>).type === type
}
