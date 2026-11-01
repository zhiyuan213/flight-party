// The server publishes membership and selected skin; rendering never grants entitlement.
export const PLANE_SKINS=Object.freeze(Object.fromEntries([
 ['classic','assets/plane-blue-body.png',null,'#3487ec'],
 ['gold2d','assets/plane-vip-gold-body.png','vipGold','#d6a629'],
 ['cloud2d','assets/plane-vip-cloud-body.png','vipCloud','#55b4dc'],
 ['night2d','assets/plane-vip-night-body.png','vipNight','#8c67dc'],
].map(([style,asset,spriteKey,propellerColor])=>[style,Object.freeze({style,asset,spriteKey,propellerColor,hubStyle:['cloud2d','night2d'].includes(style)?'silver':'gold'})])));
export const normalizePlaneStyle=style=>Object.hasOwn(PLANE_SKINS,style)?style:'classic';
export const planeSkin=style=>PLANE_SKINS[normalizePlaneStyle(style)];
export const playerPlaneSkin=player=>player?.member===true&&player?.type!=='bot'?planeSkin(player.planeStyle):PLANE_SKINS.classic;
export const usesVipPlane=player=>playerPlaneSkin(player).style!=='classic';
// Gold aliases remain for existing consumers while all render paths adopt the catalog.
export const VIP_PLANE_ASSET=PLANE_SKINS.gold2d.asset;
export const VIP_PROPELLER_COLOR=PLANE_SKINS.gold2d.propellerColor;
