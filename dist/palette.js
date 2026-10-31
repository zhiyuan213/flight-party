// Material colors calibrated against docs/design/gameplay-reference.png.
// Separate painted bases, floor tiles and route ink; no global hue filter.
export const MATERIALS = Object.freeze([
 {name:'blue',base:'#087fff',floor:'#168efb',lane:'#1285f9',marker:'#168fff',edge:'#74c6ff',side:'#064ba8'},
 {name:'orange',base:'#ff8316',floor:'#ffa628',lane:'#ff9f18',marker:'#ff9229',edge:'#ffce81',side:'#b94c09'},
 {name:'green',base:'#27bb4d',floor:'#30c45b',lane:'#2dbb4e',marker:'#32c75a',edge:'#92e6a0',side:'#167a31'},
 {name:'red',base:'#f83e36',floor:'#ff4c43',lane:'#ff463c',marker:'#ff4c43',edge:'#ff968d',side:'#b52323'},
]);
export const PALETTE = MATERIALS.map(m=>parseInt(m.base.slice(1),16));
