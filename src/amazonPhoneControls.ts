import {formatMoney} from './amazon-contract.mjs'
import {checkoutSummary,commerceScopeKey,type CommerceState,type CommerceConfirmation} from './amazon-phone-state.mjs'
import type {AmazonPhoneView} from './amazonSurface'
import type {PhoneCommand} from './phoneDevice'
export type AmazonNavigation={page:'browse'|'wishlist'|'cart'|'orders';query:string;detail?:string;review?:CommerceConfirmation}
export const amazonNavigation=():AmazonNavigation=>({page:'browse',query:''})
/** Every mutation uses the serialized Phone service, never a provider or localStorage. */
export function mountAmazonPhone(root:ShadowRoot,view:AmazonPhoneView,states:CommerceState[],ownerId:string,ui:AmazonNavigation,pending:boolean,queued:boolean,dispatch:(patch:Partial<PhoneCommand>)=>void){
  const found=root.querySelector<HTMLElement>('.rr-amazon');if(!found)return
  const section:HTMLElement=found
  section.dataset.mode='phone'
  const snapshot=view.snapshot,state=states.find(state=>commerceScopeKey(state)===view.scopeKey),cart=state?.cart||[],wishlist=state?.wishlist||[]
  const products=section.querySelector<HTMLElement>('.amz-products')!,nativeOrders=section.querySelector<HTMLElement>('.amz-orders');if(nativeOrders)nativeOrders.hidden=true
  const make=<K extends keyof HTMLElementTagNameMap>(tag:K,text='',className='')=>{const el=document.createElement(tag);el.textContent=text;el.className=className;return el}
  const send=(action:string,patch:Partial<PhoneCommand>={})=>{if(!pending)dispatch({commerceAction:action,commerceScope:view.scopeKey,...patch})}
  const button=(text:string,handler:()=>void)=>{const el=make('button',text);el.type='button';el.disabled=pending;el.addEventListener('click',handler);return el}
  const nav=make('nav','','amz-phone-nav'),panel=make('div','','amz-phone-panel'),search=make('form','','amz-search'),input=make('input'),queue=make('div','','amz-phone-queue')
  nav.setAttribute('aria-label','Amazon shopping tabs');input.type='search';input.value=ui.query;input.maxLength=160;input.placeholder='Search Amazon';input.setAttribute('aria-label','Search Amazon products')
  const icon=(path:string)=>{const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');const shape=document.createElementNS('http://www.w3.org/2000/svg','path');shape.setAttribute('d',path);svg.append(shape);return svg}
  const navIcons={browse:'M3 10 12 3l9 7v11h-6v-7H9v7H3z',wishlist:'M20 5c-3-3-6-1-8 1-2-2-5-4-8-1-5 5 8 15 8 15S25 10 20 5Z',cart:'M2 3h3l3 13h11l3-10H6 M9 20h.01 M19 20h.01',orders:'M5 3h14v18l-3-2-4 2-4-2-3 2z M8 8h8 M8 12h8'}
  const headerCart=section.querySelector('.amz-header-cart');if(headerCart){const openCart=button('',()=>{ui.page='cart';delete ui.review;delete ui.detail;render()});openCart.className='amz-header-cart';openCart.setAttribute('aria-label','Open shopping cart');openCart.append(...headerCart.childNodes);headerCart.replaceWith(openCart)}
  function render(){
    nav.replaceChildren();panel.replaceChildren();queue.replaceChildren();products.hidden=ui.page==='cart'||ui.page==='orders';search.hidden=ui.page!=='browse';input.value=ui.query
    const cartCount=cart.reduce((sum,line)=>sum+line.quantity,0)
    const heading=section.querySelector('.amz-heading h2');if(heading)heading.textContent=ui.page==='wishlist'?'Your Lists':ui.page==='cart'?'Shopping Cart':ui.page==='orders'?'Your Orders':'Results'
    const caption=section.querySelector<HTMLElement>('.amz-heading p');if(caption)caption.hidden=ui.page!=='browse'
    const cartLabel=section.querySelector('.amz-header-cart span');if(cartLabel)cartLabel.textContent=String(cartCount)
    for(const [id,label]of [['browse','Browse'],['wishlist',`Wishlist (${wishlist.length})`],['cart',`Cart (${cartCount})`],['orders','Orders']]as const){const tab=button(label,()=>{ui.page=id;delete ui.review;delete ui.detail;render()});tab.setAttribute('aria-pressed',String(ui.page===id));tab.setAttribute('aria-label',label);tab.prepend(icon(navIcons[id]));nav.append(tab)}
    const inject=button(queued?'Queued for next story prompt':'Inject shopping into next story prompt',()=>send('inject'));inject.className='amz-inject';queue.append(inject)
    for(const product of snapshot.products){
      const tile=products.querySelector<HTMLElement>(`[data-amz-product="${product.id}"]`);if(!tile)continue
      tile.hidden=ui.page==='wishlist'&&!wishlist.includes(product.id)||ui.page==='browse'&&![product.title,product.brand,product.category,product.description].join(' ').toLocaleLowerCase().includes(ui.query.toLocaleLowerCase())
      let controls=tile.querySelector<HTMLElement>('.amz-product-actions');if(!controls){controls=make('div','','amz-product-actions');tile.append(controls)}
      const add=button('Add to cart',()=>send('cart-add',{productId:product.id,quantity:1}));add.className='amz-add';add.disabled=pending||product.availability!=='Available'
      controls.replaceChildren(button('View details',()=>{ui.detail=product.id;send('view',{productId:product.id});render()}),add,button(wishlist.includes(product.id)?'Remove from wishlist':'Add to wishlist',()=>send(wishlist.includes(product.id)?'wishlist-remove':'wishlist-add',{productId:product.id})))
      if(ui.detail===product.id){const detail=make('article','','amz-phone-row');detail.setAttribute('aria-label','Amazon product detail');detail.append(make('h3',product.title),make('p',product.description),make('p',product.specs),make('p',`Seller: ${product.seller}`),make('strong',formatMoney(product.amount,snapshot.currency)),make('p',`${product.availability} · ${product.delivery}`),button('Close product details',()=>{delete ui.detail;render()}));panel.append(detail)}
    }
    if(ui.page==='cart'){
      if(!cart.length)panel.append(make('p','Your Amazon cart is empty.','amz-empty'))
      for(const line of cart){const row=make('article','','amz-phone-row'),quantity=make('input');quantity.type='number';quantity.min='1';quantity.max='20';quantity.step='1';quantity.value=String(line.quantity);quantity.disabled=pending;quantity.setAttribute('aria-label',`Quantity for ${line.title}`);quantity.addEventListener('change',()=>send('cart-quantity',{productId:line.productId,quantity:Number(quantity.value)}));row.append(make('strong',line.title),make('p',`${formatMoney(line.unitAmount,line.currency)} each · ${formatMoney(line.unitAmount*line.quantity,line.currency)}`),quantity,button('Remove from cart',()=>send('cart-remove',{productId:line.productId})));panel.append(row)}
      let summary:CommerceConfirmation|undefined;try{if(state)summary=checkoutSummary(state,snapshot)}catch(error){panel.append(make('p',error instanceof Error?error.message:String(error)))}
      if(summary?.lines.length){const checkout=button('Review in-story checkout',()=>{ui.review=summary;render()});checkout.className='amz-checkout';panel.prepend(make('h3',`Subtotal: ${formatMoney(summary.total,summary.currency)}`),checkout)}
      if(ui.review){const review=ui.review,confirm=make('section','','amz-confirm');confirm.setAttribute('role','dialog');confirm.setAttribute('aria-label','Confirm fictional Amazon checkout');confirm.append(make('h3','Review in-story purchase'),make('p','Fictional order only. No real payment, address or Amazon request.'))
        for(const line of review.lines)confirm.append(make('p',`${line.quantity} × ${line.title} — ${formatMoney(line.quantity*line.unitAmount,line.currency)}`))
        const purchase=button('Confirm in-story purchase',()=>{send('purchase',{confirmation:review});delete ui.review});purchase.className='amz-checkout'
        const cancel=button('Cancel checkout',()=>{delete ui.review;render()});cancel.className='amz-inject'
        confirm.append(make('strong',`Total: ${formatMoney(review.total,review.currency)}`),make('p','Delivery not confirmed'),purchase,cancel);panel.append(confirm)
      }
    }
    if(ui.page==='orders'){
      const orders=states.filter(state=>state.scope.ownerId===ownerId).flatMap(state=>state.orders).sort((a,b)=>b.at-a.at)
      if(!orders.length)panel.append(make('p','No Phone purchases yet.'))
      for(const order of orders){const row=make('article','','amz-phone-row');row.append(make('div',`ORDER PLACED · ${formatMoney(order.total,order.currency)} · ${order.id}`,'amz-order-summary'),make('strong',order.status),make('p',order.lines.map(line=>`${line.quantity} × ${line.title}`).join(' · ')),make('p',order.delivery));panel.append(row)}
    }
    queue.append(make('p',`${states.filter(state=>state.scope.ownerId===ownerId).flatMap(state=>state.events).filter(event=>!event.consumedBy).length} shopping actions awaiting story context · Saved for this Phone owner.`))
    const visible=[...products.querySelectorAll<HTMLElement>('.amz-product')].filter(tile=>!tile.hidden).length
    const resultbar=section.querySelector<HTMLElement>('.amz-resultbar');if(resultbar){resultbar.hidden=ui.page==='cart'||ui.page==='orders';resultbar.textContent=ui.page==='wishlist'?`${visible} saved item${visible===1?'':'s'}`:`${visible} result${visible===1?'':'s'} for “${ui.query||snapshot.query}”`}
    if(!visible&&!products.hidden)panel.append(make('p',ui.page==='wishlist'?'Your list is empty. Save an item to see it here.':'No saved products match your search.','amz-empty'))
  }
  const searchButton=button('Search',()=>{});searchButton.type='submit';searchButton.setAttribute('aria-label','Search');searchButton.replaceChildren(icon('M21 21l-5-5 M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0'))
  search.append(input,searchButton);search.addEventListener('submit',event=>{event.preventDefault();ui.query=input.value.trim();send('browse',{text:ui.query});render()})
  section.querySelector('.amz-top')?.after(search);section.querySelector('.amz-heading')?.after(panel)
  const main=section.querySelector('.amz-main'),footer=section.querySelector('.amz-foot');if(main){if(footer)main.append(footer);main.append(queue)}
  section.append(nav);render()
}
