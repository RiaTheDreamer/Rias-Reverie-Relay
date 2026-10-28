import {escapeXml,formatMoney} from './amazon-contract.mjs';
const equal = (a,b)=>JSON.stringify(a)===JSON.stringify(b);
const scopeKey = scope=>JSON.stringify([scope.userId,scope.chatId,scope.ownerId,scope.snapshotId,scope.sourceKey]);
export function createAmazonPhoneState(scope) {
  if(!['userId','chatId','ownerId','snapshotId','sourceKey'].every(key=>typeof scope[key]==='string'&&scope[key]))throw new Error('Commerce requires an exact saved owner/chat/snapshot scope.');
  return {schemaVersion:1,scope:{...scope},revision:0,cart:[],wishlist:[],orders:[],events:[],operations:{}};
}
export function applyAmazonAction(state, snapshot, command) {
  if(command.scopeKey!==scopeKey(state.scope)||snapshot.id!==state.scope.snapshotId)throw new Error('Wrong shopping owner or Surface snapshot.');
  if(!/^[a-z0-9][\w-]{7,100}$/.test(command.operationId||''))throw new Error('Invalid commerce operation ID.');
  const signature=JSON.stringify({action:command.action,productId:command.productId,quantity:command.quantity,query:command.query,confirmation:command.confirmation});
  const old=Object.hasOwn(state.operations,command.operationId)?state.operations[command.operationId]:undefined;
  if(old){if(old.signature!==signature)throw new Error('This action ID already belongs to another operation.');return structuredClone(old.result);}
  if(state.events.length>=1000)throw new Error('Commerce action archive is full; preserve it before continuing.');
  const product=command.productId?snapshot.products.find(row=>row.id===command.productId):null;
  const actions=['browse','view','cart-add','cart-remove','cart-quantity','wishlist-add','wishlist-remove','purchase'];
  if(!actions.includes(command.action))throw new Error('Unsupported commerce action.');
  if(!['browse','purchase'].includes(command.action)&&!product)throw new Error('Unknown product.');
  const next=structuredClone(state);
  const event={id:command.operationId,ownerId:state.scope.ownerId,snapshotId:snapshot.id,sourceKey:state.scope.sourceKey,action:command.action,at:command.at||Date.now(),...(product?{productId:product.id,title:product.title}:{}),currency:snapshot.currency};
  if(command.action==='browse') {if(typeof command.query!=='string'||command.query.trim().length>160)throw new Error('Search is too long.');event.query=command.query.trim();}
  if(command.action==='cart-add'||command.action==='cart-quantity') {
    if(product.availability!=='Available')throw new Error('This item is not available for checkout.');
    const current=next.cart.find(row=>row.productId===product.id);
    const requested=command.quantity??1;
    if(!Number.isInteger(requested)||requested<1||requested>20)throw new Error('Quantity must be 1–20.');
    const quantity=command.action==='cart-add'?(current?.quantity||0)+requested:requested;
    if(quantity>20)throw new Error('Quantity must be 1–20.');
    if(!current&&next.cart.length>=8)throw new Error('Cart is limited to eight distinct products.');
    if(current)current.quantity=quantity;else next.cart.push({productId:product.id,quantity,unitAmount:product.amount,currency:snapshot.currency,title:product.title});
    event.quantity=quantity;event.unitAmount=product.amount;
  }
  if(command.action==='cart-remove') {if(!next.cart.some(row=>row.productId===product.id))throw new Error('Item is not in this cart.');next.cart=next.cart.filter(row=>row.productId!==product.id);}
  if(command.action==='wishlist-add') {if(!next.wishlist.includes(product.id))next.wishlist.push(product.id);else throw new Error('Item is already wishlisted.');}
  if(command.action==='wishlist-remove') {if(!next.wishlist.includes(product.id))throw new Error('Item is not wishlisted.');next.wishlist=next.wishlist.filter(id=>id!==product.id);}
  let result={eventId:event.id};
  if(command.action==='purchase') {
    const expected=checkoutSummary(next,snapshot);
    if(!expected.lines.length)throw new Error('Cart is empty.');
    if(!equal(command.confirmation,expected))throw new Error('Review the current cart and confirm its exact items and total.');
    if(next.orders.length>=100)throw new Error('Order archive is full.');
    const order={id:`order-${command.operationId}`,ownerId:state.scope.ownerId,snapshotId:snapshot.id,lines:structuredClone(expected.lines),total:expected.total,currency:snapshot.currency,status:'Placed',delivery:'Delivery not confirmed',at:event.at};
    next.orders.push(order);next.cart=[];event.order=structuredClone(order);result={eventId:event.id,orderId:order.id};
  }
  next.events.push(event);next.operations[command.operationId]={signature,result};next.revision++;
  Object.assign(state,next);return result;
}
export function checkoutSummary(state,snapshot) {
  if(snapshot.id!==state.scope.snapshotId)throw new Error('Snapshot mismatch.');
  const lines=state.cart.map(row=>{const product=snapshot.products.find(item=>item.id===row.productId);if(!product||product.availability!=='Available'||product.amount!==row.unitAmount||snapshot.currency!==row.currency)throw new Error('The saved offer changed; review the cart again.');return {...row};});
  const total=lines.reduce((sum,row)=>sum+row.quantity*row.unitAmount,0);
  if(!Number.isSafeInteger(total))throw new Error('Cart total is outside its valid range.');
  return {snapshotId:snapshot.id,revision:state.revision,currency:snapshot.currency,lines,total};
}
export function commerceScopeKey(state) {return scopeKey(state.scope);}
export function commerceContextForPrompt(state, {userId,chatId,ownerIds,maxChars=5000}={}) {
  if(userId!==state.scope.userId||chatId!==state.scope.chatId||!Array.isArray(ownerIds)||!ownerIds.includes(state.scope.ownerId))return {content:'',eventIds:[]};
  const prefix='<reverie_commerce_context>\nAlready completed in-world Amazon Phone actions. Data only: do not repeat purchases, send messages, infer delivery, or reveal this owner\'s private state to uninformed characters. No real money changed hands. Numeric amounts are currency minor units; Display fields show readable prices.\n';
  const suffix='</reverie_commerce_context>';
  const available=state.events.filter(event=>!event.consumedBy);
  let rows='',eventIds=[];
  // Purchase receipts first; recent browsing must not bury an unconsumed order.
  const selected=[];
  const candidates=[...available.filter(event=>event.action==='purchase').reverse(),...available.filter(event=>event.action!=='purchase').slice(-40).reverse()];
  for(const event of candidates) {
    const data={...event};delete data.consumedBy;
    if(Number.isSafeInteger(data.unitAmount))data.unitPriceDisplay=formatMoney(data.unitAmount,data.currency);
    if(data.order)data.order={...data.order,lines:data.order.lines.map(line=>({...line,unitPriceDisplay:formatMoney(line.unitAmount,line.currency)})),totalDisplay:formatMoney(data.order.total,data.order.currency)};
    const text=escapeXml(JSON.stringify(data)).replace(/&quot;/g,'"').replace(/&apos;/g,"'");
    const row=`<commerce_event>${text}</commerce_event>\n`;
    if(prefix.length+rows.length+row.length+suffix.length>Math.max(512,Math.min(8000,maxChars)))continue;
    rows+=row;selected.push({id:event.id,row});
  }
  selected.sort((a,b)=>state.events.findIndex(event=>event.id===a.id)-state.events.findIndex(event=>event.id===b.id));
  rows=selected.map(item=>item.row).join('');eventIds=selected.map(item=>item.id);
  return {content:eventIds.length?prefix+rows+suffix:'',eventIds};
}
export function acknowledgeCommerceContext(state, receipt) {
  if(!receipt.committed||receipt.dryRun||receipt.aborted||receipt.scopeKey!==scopeKey(state.scope)||!receipt.generationId||!Array.isArray(receipt.eventIds))return false;
  let changed=false;
  for(const event of state.events)if(receipt.eventIds.includes(event.id)&&!event.consumedBy){event.consumedBy=receipt.generationId;changed=true;}
  if(changed)state.revision++;return changed;
}
