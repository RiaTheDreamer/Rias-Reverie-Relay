export const VERSION = '0.1.0';
export const ROOT = 'amazon_store';
export const APP_ID = 'amazon';
export const MAX_CHARS = 24000;
const TEXT = '(?:[^<>&]|&(?:amp|lt|gt|quot|apos|#\\d+|#x[\\da-fA-F]+);)*';
const ATTRIBUTE = '(?:[^<>&"]|&(?:amp|lt|gt|quot|apos|#\\d+|#x[\\da-fA-F]+);)*';
const SLUG = '[a-z0-9][a-z0-9-]{0,95}';
const field = (tag, pattern = TEXT, capture = false) => `<${tag}>${capture ? '(' : '(?:'}${pattern})</${tag}>\\s*`;
export const PRODUCT_FIELDS = ['amz_product_id','amz_title','amz_brand','amz_category','amz_amount','amz_rating','amz_reviews','amz_availability','amz_delivery','amz_description','amz_specs','amz_seller'];
export const ORDER_FIELDS = ['amz_order_id','amz_order_summary','amz_order_status','amz_order_delivery'];
const brief = `<scene_brief>${TEXT}</scene_brief>`;
const request = `<image_request\\s+id="${SLUG}"\\s+target="custom\\.artifact-media"\\s+slot="${SLUG}"\\s+aspect="1:1"\\s+alt="${ATTRIBUTE}">\\s*${brief}\\s*</image_request>`;
export const PRODUCT_PATTERN = '<amz_product>\\s*' + PRODUCT_FIELDS.map(tag => field(tag, tag==='amz_product_id'?SLUG:tag==='amz_amount'?'(?:0|[1-9]\\d{0,6})(?:\\.\\d{2})?':tag==='amz_availability'?'Available|Preorder|Unavailable':TEXT)).join('') + `<amz_media>\\s*${request}\\s*</amz_media>\\s*</amz_product>`;
const order = '<amz_order>\\s*' + ORDER_FIELDS.map(tag=>field(tag,tag==='amz_order_id'?SLUG:tag==='amz_order_status'?'Placed|Dispatched|Delivered|Cancelled':TEXT)).join('') + '</amz_order>';
export const ROOT_PATTERN = '<amazon_store>\\s*' + field('amz_id',SLUG,true) + field('amz_query',TEXT,true) + field('amz_currency','EUR|USD|GBP|JPY|KRW',true) + field('amz_delivery_area',TEXT,true) + `<amz_products>\\s*((?:${PRODUCT_PATTERN}\\s*){1,8})</amz_products>\\s*<amz_orders>\\s*((?:${order}\\s*){0,4})</amz_orders>\\s*</amazon_store>`;
// Display-only hydration forms from contracts.ts. These never become authored offers.
const imageAttributes=`(?:src|alt|class|data-reverie-artifact-media|data-dgir-key|data-dgir-request-id|data-dgir-slot|data-dgir-image-id|data-dgir-message-id|data-dgir-swipe-id|data-dgir-image-intent|data-dgir-custom-target|data-caption)="${ATTRIBUTE}"`;
const resolved=`<img(?=[^>]*\\ssrc="(?:https://|/api/|blob:))(?=[^>]*\\sdata-dgir-request-id="${SLUG}")(?=[^>]*\\sdata-dgir-custom-target="custom\\.artifact-media")(?:\\s+${imageAttributes})+\\s*>`;
const failure=`<image_request_error\\s+id="${SLUG}"\\s+target="custom\\.artifact-media"\\s+slot="${SLUG}"\\s+retryable="true">${TEXT}</image_request_error>`;
const comment='(?:<!-- reverie-relay:image(?:-error)? [^<>]{1,800} -->\\s*)?';
export const DISPLAY_ROOT_PATTERN=ROOT_PATTERN.replace(request,`${comment}(?:${request}|${resolved}|${failure})`);
export const escapeXml = value => String(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
export const decodeXml = value => String(value).replace(/&#(x[\da-f]+|\d+);/gi,(_,n)=>String.fromCodePoint(n[0].toLowerCase()==='x'?parseInt(n.slice(1),16):Number(n))).replace(/&(lt|gt|quot|apos|amp);/g,(_,key)=>({lt:'<',gt:'>',quot:'"',apos:"'",amp:'&'})[key]);
const read = (source, tag) => decodeXml(new RegExp(`<${tag}>(${TEXT})</${tag}>`).exec(source)?.[1] || '').trim();
export function minorUnits(amount, currency) {
  const digits = ['JPY','KRW'].includes(currency)?0:2;
  if (!new RegExp(digits?'^(?:0|[1-9]\\d{0,6})\\.\\d{2}$':'^(?:0|[1-9]\\d{0,6})$').test(amount)) throw new Error('Price precision does not match currency.');
  const value = Number(amount.replace('.',''));
  if (!Number.isSafeInteger(value) || value<0 || value>1000000*10**digits) throw new Error('Invalid price.');
  return value;
}
export function formatMoney(value, currency) { return new Intl.NumberFormat('en-US',{style:'currency',currency,maximumFractionDigits:['JPY','KRW'].includes(currency)?0:2}).format(value/(['JPY','KRW'].includes(currency)?1:100)); }
export function parseAmazon(source) {
  if (source.length>MAX_CHARS) throw new Error('Amazon Surface exceeds its bounded size.');
  // XML scalar whitespace is insignificant for identifiers/enums/amounts.
  // Keep this tag-local; visual descriptions and the saved source stay intact.
  source=source.replace(/<(amz_id|amz_product_id|amz_currency|amz_amount|amz_availability|amz_order_id|amz_order_status)>([^<]*)<\/\1>/g,(_,tag,value)=>`<${tag}>${value.trim()}</${tag}>`);
  const match = new RegExp(`^\\s*${ROOT_PATTERN}\\s*$`).exec(source);
  if (!match) throw new Error('Amazon Surface has an invalid or incomplete XML contract.');
  const used = new Set();
  const products = [...match[5].matchAll(/<amz_product>[\s\S]*?<\/amz_product>/g)].map(item => {
    const values = Object.fromEntries(PRODUCT_FIELDS.map(tag=>[tag,read(item[0],tag)]));
    if (Object.values(values).some(value=>!value)) throw new Error('Product metadata is empty.');
    if(values.amz_title.length>180 || values.amz_description.length>1200 || values.amz_specs.length>600 || values.amz_brand.length>160 || values.amz_seller.length>160)throw new Error('Product field exceeds its limit.');
    const id=values.amz_product_id;
    if(used.has(`product:${id}`)) throw new Error('Duplicate product ID.'); used.add(`product:${id}`);
    const media=/<image_request\b[^>]*>[\s\S]*?<\/image_request>/.exec(item[0])[0];
    const attrs=Object.fromEntries([...media.matchAll(/([\w-]+)="([^"]*)"/g)].map(row=>[row[1],decodeXml(row[2])]));
    if(!attrs.alt.trim() || !read(media,'scene_brief') || attrs.id!==attrs.slot || used.has(`media:${attrs.id}`)) throw new Error('Missing, duplicate or mismatched product media owner.'); used.add(`media:${attrs.id}`);
    const rating=values.amz_rating, reviews=values.amz_reviews;
    if(rating!=='Not listed'&&(!/^(?:[0-4](?:\.\d)?|5(?:\.0)?)$/.test(rating)))throw new Error('Invalid rating.');
    if(reviews!=='Not listed'&&!/^(?:0|[1-9]\d{0,7})$/.test(reviews))throw new Error('Invalid review count.');
    return {id,title:values.amz_title,brand:values.amz_brand,category:values.amz_category,amount:minorUnits(values.amz_amount,match[3]),rating,reviews,availability:values.amz_availability,delivery:values.amz_delivery,description:values.amz_description,specs:values.amz_specs,seller:values.amz_seller,media,mediaId:attrs.id};
  });
  const orders=[...match[6].matchAll(/<amz_order>[\s\S]*?<\/amz_order>/g)].map(item=>{
    const values=Object.fromEntries(ORDER_FIELDS.map(tag=>[tag,read(item[0],tag)]));
    if(Object.values(values).some(value=>!value)||used.has(`order:${values.amz_order_id}`))throw new Error('Invalid established order.');used.add(`order:${values.amz_order_id}`);
    return {id:values.amz_order_id,summary:values.amz_order_summary,status:values.amz_order_status,delivery:values.amz_order_delivery};
  });
  if(!decodeXml(match[2]).trim()||!decodeXml(match[4]).trim())throw new Error('Search and delivery-area metadata must be populated.');
  return {id:match[1],query:decodeXml(match[2]),currency:match[3],deliveryArea:decodeXml(match[4]),products,orders};
}
