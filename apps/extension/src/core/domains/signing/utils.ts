import { AnyRespondableRequest, KnownRespondableRequest, RequestTypes } from "./BaseRequestStore"

export const isRequestOfType = <Type extends RequestTypes>(
  request: Partial<AnyRespondableRequest> & Pick<AnyRespondableRequest, "type">,
  type: Type
): request is AnyRespondableRequest => {
  return (request as KnownRespondableRequest<Type>).type === type
}
