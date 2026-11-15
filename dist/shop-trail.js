/* Resolves the flight-trail style drawn behind a moving plane.

   A server-verified appearance is authoritative: a signed-in member's
   `flightTrail` from the room seat wins. Otherwise the locally equipped
   points-shop trail (published by site-points.js as data-shop-trail on
   <html>) is used, so a redeemed Starlight / Rainbow / Cloud cosmetic
   really appears in a local game. Only the three styles that
   FlightTrails.emit accepts are ever returned; anything else is "no trail".
   This module is cosmetic only — no game rule, dice or score is touched. */
export const TRAIL_STYLES = Object.freeze(['star','rainbow','cloud']);

export function activeTrailStyle(owner){
  const server = owner && owner.member ? owner.flightTrail : '';
  if(TRAIL_STYLES.includes(server))return server;
  if(typeof document==='undefined'||!document.documentElement)return '';
  const shop = document.documentElement.getAttribute('data-shop-trail')||'';
  return TRAIL_STYLES.includes(shop)?shop:'';
}
