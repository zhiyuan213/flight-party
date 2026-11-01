// The server publishes membership and selected skin; rendering never grants entitlement.
export const usesVipPlane=player=>player?.member===true&&player?.planeStyle==='gold2d'&&player?.type!=='bot';
export const VIP_PLANE_ASSET='assets/plane-vip-gold-body.png';
export const VIP_PROPELLER_COLOR='#d6a629';
