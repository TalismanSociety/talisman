import {
  YieldxyzOpportunitiesResponse,
  YieldxyzPositionRefreshRequest,
  YieldxyzPositionsResponse,
  YieldxyzProvidersResponse,
} from "./yieldxyz/types"

// Message type augmentation for handler routing
export interface EarnMessages {
  "pri(earn.yieldxyz.positions.subscribe)": [null, boolean, YieldxyzPositionsResponse]
  "pri(earn.yieldxyz.positions.refresh)": [YieldxyzPositionRefreshRequest, void]
  "pri(earn.yieldxyz.products.subscribe)": [null, boolean, YieldxyzOpportunitiesResponse]
  "pri(earn.yieldxyz.providers.subscribe)": [null, boolean, YieldxyzProvidersResponse]
}
