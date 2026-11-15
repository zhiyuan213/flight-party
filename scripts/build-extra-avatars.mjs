/** Six original hairstyles for the shared warm-peach square-face family.
 * Regenerates only these assets; existing expressions/defaults stay unchanged.
 * Rarity is assigned to accessories in the catalogue, never to face/skin tone.
 * Usage: node scripts/build-extra-avatars.mjs
 */
import {mkdirSync, writeFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ink = '#28232D';
const stroke = `stroke="${ink}" stroke-linecap="round" stroke-linejoin="round"`;
const brow = `<g fill="none" ${stroke} stroke-width="5.5"><path d="M64 98Q80 89 98 96"/><path d="M158 96Q175 89 192 98"/></g>`;
const eye = (x, lashes = true) => `<g ${stroke}><ellipse cx="${x}" cy="130" rx="21" ry="25" fill="#FFFDFC" stroke-width="3"/><ellipse cx="${x + 1}" cy="133" rx="10" ry="13" fill="${ink}" stroke="none"/><circle cx="${x - 2}" cy="128" r="3.5" fill="#FFFDFC" stroke="none"/>${lashes ? `<path d="M${x - 18} 113l-6-6M${x + 18} 113l6-6" fill="none" stroke-width="2.8"/>` : ''}</g>`;
const eyes = eye(82) + eye(174);
const wink = eye(82) + `<path d="M155 131Q173 113 192 131" fill="none" ${stroke} stroke-width="5"/>`;
const happyEyes = `<g fill="none" ${stroke} stroke-width="5"><path d="M63 132Q81 110 101 132M155 132Q174 110 193 132"/><path d="M62 132l-5-2M194 132l5-2" stroke-width="2.8"/></g>`;
const smile = `<path d="M88 177Q128 191 168 175C164 199 148 213 127 213C106 212 93 197 88 177Z" fill="#783747" ${stroke} stroke-width="3.5"/><path d="M95 181Q128 191 160 180L156 190Q127 198 100 190Z" fill="#FFFDFC"/><path d="M110 207Q128 195 146 207Q127 215 110 207Z" fill="#EF93AA"/>`;
const gentle = `<path d="M101 184Q128 206 156 181" fill="none" ${stroke} stroke-width="4"/><path d="M116 199Q130 204 142 197" fill="none" stroke="#D2827C" stroke-width="2.5" stroke-linecap="round"/>`;
const cheeks = `<g fill="#E59C88" opacity=".42"><ellipse cx="57" cy="163" rx="13" ry="7"/><ellipse cx="199" cy="163" rx="13" ry="7"/></g>`;
const base = `<rect x="16" y="16" width="224" height="224" rx="27" fill="#F3D2AD"/>`;
const hairPaths = (fill, paths, lines = '') => `<g fill="${fill}">${paths}</g>${lines ? `<g fill="none" stroke="#B17A52" stroke-width="3" stroke-linecap="round" opacity=".56">${lines}</g>` : ''}`;
const bow = (x, y, colour) => `<g transform="translate(${x} ${y})"><path d="M0 0C-22-21-29-11-22 8L-1 5C17 22 31 10 23-8Z" fill="${colour}" stroke="#695274" stroke-width="2.5"/><path d="M-4 6l-5 17 11-5 7 6 1-17" fill="${colour}" stroke="#695274" stroke-width="2"/><ellipse cx="1" cy="3" rx="7" ry="9" fill="#F1D8FA" stroke="#695274" stroke-width="2"/></g>`;
const pearl = (x, y, r = 5) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#FFF7DC" stroke="#B89458" stroke-width="1.3"/><circle cx="${x - 1.5}" cy="${y - 1.5}" r="${r * .34}" fill="#FFFDFC"/>`;

export const extraAvatars = [
  {
    id: 'avatar-bob', title: 'Chestnut Bob', expression: eyes + smile,
    hair: hairPaths('#6A4230', `<path d="M16 84V43Q16 16 43 16H213Q240 16 240 43V160Q237 190 210 194L207 91Q154 81 135 49Q107 83 48 88L47 195Q20 189 16 164Z"/>`, `<path d="M35 78Q78 67 108 42M153 35Q181 63 220 70M29 102v55M224 99v56"/>`),
    accessory: `<g transform="rotate(14 197 83)"><rect x="181" y="77" width="38" height="10" rx="5" fill="#72CDB8" stroke="#376E62" stroke-width="2.5"/><path d="M188 80h23" stroke="#C8F4DC" stroke-width="2.5" stroke-linecap="round"/></g>`,
    description: 'Same warm peach square face, a short chestnut bob and mint clip.'
  },
  {
    id: 'avatar-ponytail', title: 'Sunny Ponytail', expression: wink + smile,
    hair: hairPaths('#5B392F', `<path d="M172 33Q212 17 235 49Q253 76 232 115Q218 145 229 174Q200 157 206 127Q212 102 189 84Z"/><path d="M16 74V43Q16 16 43 16H180Q215 22 219 62L208 104Q203 70 176 61Q128 91 68 74L47 108L44 166Q23 149 23 111Z"/>`, `<path d="M40 53Q92 33 150 39M54 64Q109 54 151 44M211 55Q237 76 218 114M30 102l8 30"/>`),
    accessory: `<g transform="rotate(-14 189 58)"><path d="M177 55Q190 42 204 48L210 63Q195 57 185 71Z" fill="#E77481" stroke="#A4485B" stroke-width="2.5"/><path d="M197 64l19 19-13 1 2 12-18-27" fill="#F79C9B" stroke="#A4485B" stroke-width="2"/></g>`,
    description: 'Same warm peach square face, high ponytail, coral ribbon and a wink.'
  },
  {
    id: 'avatar-buns', title: 'Ribbon Buns', expression: happyEyes + smile,
    hair: hairPaths('#49352E', `<circle cx="44" cy="46" r="34"/><circle cx="212" cy="46" r="34"/><path d="M27 100Q20 31 94 28H162Q236 31 229 100L210 92Q192 82 185 62Q150 81 128 58Q98 86 70 65L48 103Z"/>`, `<path d="M28 51Q17 29 44 26Q67 25 64 45M191 46Q187 24 210 26Q235 25 233 49M61 53Q83 44 103 46M155 46Q179 42 193 55"/>`),
    accessory: bow(48, 79, '#BA99DC') + bow(208, 79, '#BA99DC'),
    description: 'Same warm peach square face, twin buns, lilac bows and laughing eyes.'
  },
  {
    id: 'avatar-waves', title: 'Pearl Waves', expression: eyes + gentle,
    hair: hairPaths('#8B5136', `<path d="M16 91V43Q16 16 43 16H213Q240 16 240 43V201Q236 229 218 240H195Q211 215 196 195Q218 172 203 146Q219 116 200 85Q160 79 135 48Q103 82 57 89Q42 112 55 143Q35 171 55 198Q37 219 60 240H37Q15 221 16 199Z"/>`, `<path d="M39 76Q82 65 113 37M156 35Q178 59 216 68M33 109Q45 130 31 154Q21 176 35 196Q45 212 32 229M221 104Q210 126 224 148Q236 172 222 192Q210 212 223 229"/>`),
    accessory: `<path d="M170 81l45 12" stroke="#C5A45F" stroke-width="6" stroke-linecap="round"/>` + [0,1,2,3].map(i => pearl(175 + i * 11, 82 + i * 3, 5.5)).join(''),
    description: 'Same warm peach square face, flowing waves and a small pearl barrette.'
  },
  {
    id: 'avatar-blossom', title: 'Blossom Hairpin', expression: eyes + smile,
    hair: hairPaths('#503C36', `<path d="M16 43Q16 16 43 16H213Q240 16 240 43V240H207Q221 214 205 196L214 95Q177 88 157 54Q122 92 47 96L50 195Q35 215 48 240H16Z"/>`, `<path d="M36 77Q93 70 136 36M178 37Q193 65 223 76M31 111l7 84M227 111l-8 84"/>`),
    accessory: `<g transform="translate(199 73) rotate(14)"><path d="M-1 5Q-35 3-30-19Q-7-19-1 5M4 8Q31 3 32 25Q10 31 4 8" fill="#83AB78" stroke="#496F50" stroke-width="2"/><path d="M-25-15L22 23" fill="none" stroke="#D1DFA0" stroke-width="2"/><g fill="#F1A7B9" stroke="#BA617E" stroke-width="2.5"><path d="M0 1C-23-4-22-27-5-27C9-27 12-9 0 1Z"/><path d="M0 1C-4-23 17-34 27-20C36-7 18 7 0 1Z"/><path d="M0 1C20-13 39 1 30 16C22 28 4 20 0 1Z"/><path d="M0 1C22 13 15 35-3 31C-17 28-17 9 0 1Z"/><path d="M0 1C0 25-24 31-29 13C-34-3-15-9 0 1Z"/></g><circle cx="0" cy="1" r="8" fill="#F7C451" stroke="#AF7B35" stroke-width="2"/><circle cx="-2" cy="-1" r="2.5" fill="#FFF4C1"/><path d="M-13 26l-4 19M-17 31l-9 7" stroke="#C99D50" stroke-width="2" stroke-linecap="round"/>${pearl(-18, 46, 4)}</g>`,
    description: 'Same warm peach square face, swept hair and a crafted pink blossom hairpin.'
  },
  {
    id: 'avatar-beret', title: 'Ruby Beret', expression: wink + smile,
    hair: hairPaths('#604133', `<path d="M28 58Q70 22 130 29Q202 22 231 71L223 184Q211 205 192 195L203 102Q164 97 132 67Q95 93 54 97L58 195Q37 204 24 184Z"/>`, `<path d="M40 108l4 62M214 111l-4 57M62 82Q103 74 129 58"/>`),
    accessory: `<path d="M27 62Q8 35 41 19Q82-2 143 12Q224 5 239 44Q245 59 224 67Q160 80 27 62Z" fill="#A74D66" stroke="#713D51" stroke-width="3"/><path d="M40 56Q122 68 212 57" fill="none" stroke="#D58899" stroke-width="4" stroke-linecap="round"/><path d="M35 67Q128 82 220 69L215 82Q127 91 36 79Z" fill="#773D55" stroke="#713D51" stroke-width="2"/><path d="M135 16l3-11" stroke="#713D51" stroke-width="6" stroke-linecap="round"/><g transform="translate(200 51)"><circle r="14" fill="#DCAE59" stroke="#805634" stroke-width="2"/><path d="M0-10L3-3 10-3 5 2 7 10 0 6-7 10-5 2-10-3-3-3Z" fill="#FFF0B5" stroke="#A6753A" stroke-width="1.3"/><circle cx="-1" cy="-1" r="2.4" fill="#FFFDFC"/></g>`,
    description: 'Same warm peach square face, ruby beret, gold star brooch and a confident wink.'
  }
];

export function renderExtraAvatar(avatar) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256" role="img" aria-labelledby="title desc">
<title id="title">${avatar.title}</title>
<desc id="desc">${avatar.description}</desc>
<defs><clipPath id="face"><rect x="16" y="16" width="224" height="224" rx="27"/></clipPath></defs>
${base}
<g clip-path="url(#face)">${avatar.hair}</g>
${cheeks}${brow}${avatar.expression}
${avatar.accessory}
</svg>
`;
}

export function buildExtraAvatars() {
  const out = resolve(root, 'dist/assets/shop/avatars-v4');
  mkdirSync(out, {recursive: true});
  for (const avatar of extraAvatars) writeFileSync(resolve(out, `${avatar.id}.svg`), renderExtraAvatar(avatar));
  return extraAvatars.map(avatar => avatar.id);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  console.log(`Built ${buildExtraAvatars().length} additional square-face avatars.`);
}
