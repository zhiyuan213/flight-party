// The server publishes membership and selected skin; rendering never grants entitlement.
export const PLANE_SKINS=Object.freeze(Object.fromEntries([
 ['classic','assets/plane-blue-body.png',null,'#3487ec',null,'gold',null,null],
 ['gold2d','assets/plane-vip-gold-body.png','vipGold','#d6a629','vip','gold','#ffe145','gold-glow'],
 ['cloud2d','assets/plane-vip-cloud-body.png','vipCloud','#55b4dc','vip','silver','#b8e6ff','soft-cloud'],
 ['night2d','assets/plane-vip-night-body.png','vipNight','#8c67dc','vip','silver','#c9a8ff','night-glow'],
 ['obsidian2d','assets/plane-vip-obsidian-body.png','vipObsidian','#c98d79','annual','rose','#ffb3a0','obsidian-edge'],
 ['aurora2d','assets/plane-vip-aurora-body.png','vipAurora','#c3e8ed','annual','silver','#e0ffff','aurora-shimmer'],
].map(([style,asset,spriteKey,propellerColor,tier,hubStyle,glowColor,trailStyle])=>[style,Object.freeze({style,asset,spriteKey,propellerColor,tier,hubStyle,glowColor,trailStyle})])));
export const normalizePlaneStyle=style=>Object.hasOwn(PLANE_SKINS,style)?style:'classic';
export const planeSkin=style=>PLANE_SKINS[normalizePlaneStyle(style)];
export const canUsePlaneStyle=(style,appearance)=>appearance?.member===true&&(planeSkin(style).tier!=='annual'||appearance?.annualMember===true);
export const playerPlaneSkin=player=>player?.type!=='bot'&&canUsePlaneStyle(player?.planeStyle,player)?planeSkin(player.planeStyle):PLANE_SKINS.classic;
export const usesVipPlane=player=>playerPlaneSkin(player).style!=='classic';
// Gold aliases remain for existing consumers while all render paths adopt the catalog.
export const VIP_PLANE_ASSET=PLANE_SKINS.gold2d.asset;
export const VIP_PROPELLER_COLOR=PLANE_SKINS.gold2d.propellerColor;
export const vipGlowColor=player=>playerPlaneSkin(player).glowColor||null;
export const vipTrailStyle=player=>playerPlaneSkin(player).trailStyle||null;
