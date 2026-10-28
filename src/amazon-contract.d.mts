export type AmazonProduct = {id:string;title:string;brand:string;category:string;amount:number;rating:string;reviews:string;availability:string;delivery:string;description:string;specs:string;seller:string;media:string;mediaId:string}
export type AmazonSnapshot = {id:string;query:string;currency:string;deliveryArea:string;products:AmazonProduct[];orders:Array<{id:string;summary:string;status:string;delivery:string}>}
export const ROOT_PATTERN:string, DISPLAY_ROOT_PATTERN:string, PRODUCT_PATTERN:string, VERSION:string, ROOT:string, APP_ID:string, MAX_CHARS:number;
export const PRODUCT_FIELDS:string[], ORDER_FIELDS:string[];
export function parseAmazon(source:string):AmazonSnapshot;
export function escapeXml(value:unknown):string;
export function decodeXml(value:unknown):string;
export function minorUnits(amount:string,currency:string):number;
export function formatMoney(amount:number,currency:string):string;
