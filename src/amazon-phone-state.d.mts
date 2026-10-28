import type {AmazonSnapshot} from './amazon-contract.mjs'
export type CommerceScope={userId:string;chatId:string;ownerId:string;snapshotId:string;sourceKey:string}
export type CommerceLine={productId:string;quantity:number;unitAmount:number;currency:string;title:string}
export type CommerceOrder={id:string;ownerId:string;snapshotId:string;lines:CommerceLine[];total:number;currency:string;status:string;delivery:string;at:number}
export type CommerceEvent={id:string;ownerId:string;snapshotId:string;sourceKey:string;action:string;at:number;currency:string;productId?:string;title?:string;query?:string;quantity?:number;unitAmount?:number;order?:CommerceOrder;consumedBy?:string}
export type CommerceState={schemaVersion:1;scope:CommerceScope;revision:number;cart:CommerceLine[];wishlist:string[];orders:CommerceOrder[];events:CommerceEvent[];operations:Record<string,{signature:string;result:{eventId:string;orderId?:string}}>}
export type CommerceConfirmation={snapshotId:string;revision:number;currency:string;lines:CommerceLine[];total:number}
export type CommerceCommand={scopeKey:string;operationId:string;action:string;productId?:string;quantity?:number;query?:string;confirmation?:CommerceConfirmation;at?:number}
export function createAmazonPhoneState(scope:CommerceScope):CommerceState;
export function applyAmazonAction(state:CommerceState,snapshot:AmazonSnapshot,command:CommerceCommand):{eventId:string;orderId?:string};
export function checkoutSummary(state:CommerceState,snapshot:AmazonSnapshot):CommerceConfirmation;
export function commerceScopeKey(state:CommerceState):string;
export function commerceContextForPrompt(state:CommerceState,scope:{userId:string;chatId:string;ownerIds:string[];maxChars?:number}):{content:string;eventIds:string[]};
export function acknowledgeCommerceContext(state:CommerceState,receipt:{committed:boolean;dryRun?:boolean;aborted?:boolean;scopeKey:string;generationId:string;eventIds:string[]}):boolean;
