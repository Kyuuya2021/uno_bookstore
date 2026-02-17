/**
 * SVG Assets Module - Layered SVG System
 * 
 * すべてのSVGパーツは同一の ViewBox="0 0 500 500" で統一。
 * 中心座標を揃えることで、CSSで重ねるだけで位置合わせ不要。
 * 
 * Layer 1 (z-index:1): Base Body  — 素体（カラー別）
 * Layer 2 (z-index:2): Role Item  — 役割アイテム
 * Layer 3 (z-index:3): Mode Effect — モードエフェクト
 */

const SVG_VIEWBOX = '0 0 500 500';

// ============================================================
// カラーパレット
// ============================================================
const COLOR_PALETTE = {
  blue:   { body: '#4A90D9', light: '#6BB3F0', dark: '#2E5C8A', skin: '#FFD9B3' },
  red:    { body: '#E74C3C', light: '#F1948A', dark: '#922B21', skin: '#FFD9B3' },
  green:  { body: '#27AE60', light: '#58D68D', dark: '#1E8449', skin: '#FFD9B3' },
  yellow: { body: '#F1C40F', light: '#F9E154', dark: '#B7950B', skin: '#FFD9B3' },
  purple: { body: '#8E44AD', light: '#BB8FCE', dark: '#6C3483', skin: '#FFD9B3' },
  orange: { body: '#E67E22', light: '#F0B27A', dark: '#A04000', skin: '#FFD9B3' },
};

// ============================================================
// Layer 1: Base Body（素体）
// ============================================================
function createBaseBody(color) {
  const c = COLOR_PALETTE[color] || COLOR_PALETTE.blue;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${SVG_VIEWBOX}">
    <!-- Shadow -->
    <ellipse cx="250" cy="440" rx="70" ry="14" fill="rgba(0,0,0,0.10)"/>
    <!-- Body -->
    <rect x="200" y="260" width="100" height="130" rx="30" fill="${c.body}"/>
    <!-- Arms -->
    <rect x="170" y="275" width="30" height="80" rx="15" fill="${c.body}" transform="rotate(-8, 185, 275)"/>
    <rect x="300" y="275" width="30" height="80" rx="15" fill="${c.body}" transform="rotate(8, 315, 275)"/>
    <!-- Legs -->
    <rect x="215" y="375" width="28" height="60" rx="14" fill="${c.dark}"/>
    <rect x="257" y="375" width="28" height="60" rx="14" fill="${c.dark}"/>
    <!-- Shoes -->
    <ellipse cx="229" cy="432" rx="18" ry="10" fill="${c.dark}"/>
    <ellipse cx="271" cy="432" rx="18" ry="10" fill="${c.dark}"/>
    <!-- Head -->
    <circle cx="250" cy="200" r="75" fill="${c.skin}"/>
    <!-- Hair -->
    <ellipse cx="250" cy="165" rx="78" ry="55" fill="${c.body}"/>
    <ellipse cx="250" cy="145" rx="72" ry="40" fill="${c.light}"/>
    <!-- Eyes -->
    <circle cx="228" cy="210" r="8" fill="#2C3E50"/>
    <circle cx="272" cy="210" r="8" fill="#2C3E50"/>
    <!-- Eye highlights -->
    <circle cx="231" cy="207" r="3" fill="#FFF"/>
    <circle cx="275" cy="207" r="3" fill="#FFF"/>
    <!-- Mouth -->
    <path d="M238 235 Q250 248 262 235" stroke="#C0392B" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <!-- Cheeks -->
    <ellipse cx="215" cy="228" rx="12" ry="8" fill="rgba(255,150,150,0.35)"/>
    <ellipse cx="285" cy="228" rx="12" ry="8" fill="rgba(255,150,150,0.35)"/>
    <!-- Collar -->
    <ellipse cx="250" cy="268" rx="35" ry="10" fill="${c.light}"/>
  </svg>`;
}

// ============================================================
// Layer 2: Role Items（役割アイテム）
// ============================================================
const ROLE_ITEMS = {
  freelance: () => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${SVG_VIEWBOX}">
    <!-- Laptop -->
    <g transform="translate(250, 340)">
      <!-- Screen -->
      <rect x="-40" y="-25" width="80" height="50" rx="4" fill="#34495E"/>
      <rect x="-35" y="-20" width="70" height="40" rx="2" fill="#5DADE2"/>
      <!-- Code lines on screen -->
      <line x1="-28" y1="-12" x2="-8" y2="-12" stroke="#FFF" stroke-width="2" opacity="0.7"/>
      <line x1="-28" y1="-4" x2="2" y2="-4" stroke="#2ECC71" stroke-width="2" opacity="0.7"/>
      <line x1="-28" y1="4" x2="-12" y2="4" stroke="#F39C12" stroke-width="2" opacity="0.7"/>
      <line x1="-28" y1="12" x2="8" y2="12" stroke="#FFF" stroke-width="2" opacity="0.7"/>
      <!-- Base -->
      <rect x="-50" y="25" width="100" height="6" rx="3" fill="#5D6D7E"/>
      <rect x="-30" y="28" width="60" height="4" rx="2" fill="#85929E"/>
    </g>
  </svg>`,

  student: () => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${SVG_VIEWBOX}">
    <!-- Book -->
    <g transform="translate(250, 340)">
      <!-- Book body -->
      <rect x="-35" y="-30" width="70" height="55" rx="3" fill="#E74C3C"/>
      <!-- Pages -->
      <rect x="-30" y="-25" width="60" height="45" rx="2" fill="#FDEBD0"/>
      <!-- Spine -->
      <rect x="-35" y="-30" width="8" height="55" rx="2" fill="#C0392B"/>
      <!-- Text lines -->
      <line x1="-18" y1="-15" x2="20" y2="-15" stroke="#BDC3C7" stroke-width="1.5"/>
      <line x1="-18" y1="-7" x2="15" y2="-7" stroke="#BDC3C7" stroke-width="1.5"/>
      <line x1="-18" y1="1" x2="22" y2="1" stroke="#BDC3C7" stroke-width="1.5"/>
      <line x1="-18" y1="9" x2="12" y2="9" stroke="#BDC3C7" stroke-width="1.5"/>
      <!-- Bookmark -->
      <polygon points="15,-30 22,-30 22,-18 18.5,-22 15,-18" fill="#F1C40F"/>
    </g>
  </svg>`,

  designer: () => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${SVG_VIEWBOX}">
    <!-- Pen Tablet -->
    <g transform="translate(250, 340)">
      <!-- Tablet -->
      <rect x="-42" y="-22" width="84" height="52" rx="6" fill="#2C3E50"/>
      <!-- Screen area -->
      <rect x="-35" y="-16" width="60" height="38" rx="3" fill="#1ABC9C"/>
      <!-- Drawing on screen -->
      <path d="M-25,-5 Q-15,-15 -5,0 Q5,15 15,-2 Q20,-10 25,2" stroke="#FFF" stroke-width="2" fill="none" stroke-linecap="round"/>
      <!-- Buttons -->
      <circle cx="32" cy="-5" r="3" fill="#7F8C8D"/>
      <circle cx="32" cy="5" r="3" fill="#7F8C8D"/>
      <circle cx="32" cy="15" r="3" fill="#7F8C8D"/>
      <!-- Stylus -->
      <line x1="30" y1="-30" x2="45" y2="10" stroke="#E67E22" stroke-width="3.5" stroke-linecap="round"/>
      <circle cx="45" cy="10" r="2" fill="#F39C12"/>
    </g>
  </svg>`,

  engineer: () => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${SVG_VIEWBOX}">
    <!-- Gear + Wrench -->
    <g transform="translate(250, 335)">
      <!-- Gear -->
      <g fill="#95A5A6" transform="translate(-15, 0)">
        <circle cx="0" cy="0" r="22" fill="#7F8C8D"/>
        <circle cx="0" cy="0" r="10" fill="#2C3E50"/>
        <rect x="-4" y="-28" width="8" height="12" rx="2"/>
        <rect x="-4" y="16" width="8" height="12" rx="2"/>
        <rect x="-28" y="-4" width="12" height="8" rx="2"/>
        <rect x="16" y="-4" width="12" height="8" rx="2"/>
        <rect x="14" y="-22" width="8" height="12" rx="2" transform="rotate(45, 18, -16)"/>
        <rect x="-22" y="14" width="8" height="12" rx="2" transform="rotate(45, -18, 20)"/>
        <rect x="14" y="14" width="8" height="12" rx="2" transform="rotate(-45, 18, 20)"/>
        <rect x="-22" y="-22" width="8" height="12" rx="2" transform="rotate(-45, -18, -16)"/>
      </g>
      <!-- Wrench -->
      <g transform="translate(20, -5) rotate(30)">
        <rect x="-3" y="-20" width="6" height="40" rx="3" fill="#BDC3C7"/>
        <path d="M-10,-22 Q0,-32 10,-22 L8,-16 -8,-16 Z" fill="#BDC3C7"/>
      </g>
    </g>
  </svg>`,

  writer: () => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${SVG_VIEWBOX}">
    <!-- Quill & Notebook -->
    <g transform="translate(250, 338)">
      <!-- Notebook -->
      <rect x="-35" y="-20" width="62" height="48" rx="3" fill="#F5DEB3"/>
      <rect x="-35" y="-20" width="8" height="48" rx="2" fill="#D4A574"/>
      <!-- Lines -->
      <line x1="-22" y1="-8" x2="20" y2="-8" stroke="#C4A882" stroke-width="1"/>
      <line x1="-22" y1="0" x2="18" y2="0" stroke="#C4A882" stroke-width="1"/>
      <line x1="-22" y1="8" x2="22" y2="8" stroke="#C4A882" stroke-width="1"/>
      <line x1="-22" y1="16" x2="15" y2="16" stroke="#C4A882" stroke-width="1"/>
      <!-- Written text effect -->
      <path d="M-20,-8 Q-10,-10 0,-8 Q8,-6 16,-8" stroke="#2C3E50" stroke-width="1" fill="none" opacity="0.4"/>
      <path d="M-20,0 Q-5,2 10,0" stroke="#2C3E50" stroke-width="1" fill="none" opacity="0.4"/>
      <!-- Quill pen -->
      <g transform="translate(30, -15) rotate(25)">
        <ellipse cx="0" cy="-22" rx="6" ry="18" fill="#8E44AD" opacity="0.8"/>
        <line x1="0" y1="-5" x2="0" y2="25" stroke="#5D4037" stroke-width="2.5"/>
        <polygon points="-2,25 2,25 0,32" fill="#2C3E50"/>
      </g>
    </g>
  </svg>`,
};

// ============================================================
// Layer 3: Mode Effects（モードエフェクト）
// ============================================================
const MODE_EFFECTS = {
  work: () => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${SVG_VIEWBOX}">
    <!-- Focus / Concentration sparkles -->
    <g opacity="0.7">
      <!-- Star 1 -->
      <g transform="translate(145, 140)">
        <polygon points="0,-12 3,-3 12,0 3,3 0,12 -3,3 -12,0 -3,-3" fill="#F1C40F"/>
      </g>
      <!-- Star 2 -->
      <g transform="translate(355, 155)">
        <polygon points="0,-8 2,-2 8,0 2,2 0,8 -2,2 -8,0 -2,-2" fill="#F39C12"/>
      </g>
      <!-- Star 3 -->
      <g transform="translate(340, 110)">
        <polygon points="0,-10 2.5,-2.5 10,0 2.5,2.5 0,10 -2.5,2.5 -10,0 -2.5,-2.5" fill="#F1C40F"/>
      </g>
      <!-- Focus lines -->
      <line x1="130" y1="115" x2="115" y2="100" stroke="#F1C40F" stroke-width="2" stroke-linecap="round" opacity="0.5"/>
      <line x1="370" y1="120" x2="385" y2="105" stroke="#F1C40F" stroke-width="2" stroke-linecap="round" opacity="0.5"/>
      <line x1="150" y1="100" x2="148" y2="82" stroke="#F39C12" stroke-width="1.5" stroke-linecap="round" opacity="0.4"/>
    </g>
    <!-- Fire emoji-like determination -->
    <g transform="translate(320, 170)" opacity="0.6">
      <path d="M0,0 Q5,-15 0,-22 Q8,-12 12,-20 Q10,-5 6,2 Q3,5 0,0Z" fill="#E74C3C"/>
      <path d="M2,-2 Q4,-10 2,-14 Q6,-8 8,-12 Q7,-3 5,1 Q3,3 2,-2Z" fill="#F39C12"/>
    </g>
  </svg>`,

  break: () => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${SVG_VIEWBOX}">
    <!-- Coffee cup + steam / Zzz -->
    <g opacity="0.65">
      <!-- Coffee cup -->
      <g transform="translate(340, 180)">
        <rect x="-12" y="-8" width="24" height="20" rx="3" fill="#8B6914"/>
        <rect x="-9" y="-5" width="18" height="14" rx="2" fill="#D4A574"/>
        <!-- Handle -->
        <path d="M12,-2 Q20,-2 20,6 Q20,12 12,12" stroke="#8B6914" stroke-width="2.5" fill="none"/>
        <!-- Steam -->
        <path d="M-4,-12 Q-6,-20 -2,-25" stroke="#BDC3C7" stroke-width="1.5" fill="none" opacity="0.6">
          <animate attributeName="d" values="M-4,-12 Q-6,-20 -2,-25;M-4,-12 Q-2,-20 -5,-28;M-4,-12 Q-6,-20 -2,-25" dur="2s" repeatCount="indefinite"/>
        </path>
        <path d="M2,-12 Q0,-22 4,-28" stroke="#BDC3C7" stroke-width="1.5" fill="none" opacity="0.6">
          <animate attributeName="d" values="M2,-12 Q0,-22 4,-28;M2,-12 Q4,-20 1,-30;M2,-12 Q0,-22 4,-28" dur="2.5s" repeatCount="indefinite"/>
        </path>
        <path d="M8,-12 Q6,-18 9,-24" stroke="#BDC3C7" stroke-width="1.5" fill="none" opacity="0.5">
          <animate attributeName="d" values="M8,-12 Q6,-18 9,-24;M8,-12 Q10,-18 7,-26;M8,-12 Q6,-18 9,-24" dur="1.8s" repeatCount="indefinite"/>
        </path>
      </g>
      <!-- Zzz -->
      <g transform="translate(155, 145)" fill="#9B59B6" font-family="serif" font-weight="bold">
        <text x="0" y="0" font-size="18" opacity="0.7">Z</text>
        <text x="-15" y="-15" font-size="14" opacity="0.5">z</text>
        <text x="-25" y="-25" font-size="10" opacity="0.3">z</text>
      </g>
      <!-- Music notes -->
      <g transform="translate(160, 110)" fill="#3498DB" opacity="0.4">
        <text font-size="16" font-family="serif">♪</text>
      </g>
    </g>
  </svg>`,

  meeting: () => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${SVG_VIEWBOX}">
    <!-- Chat bubbles -->
    <g opacity="0.7">
      <!-- Main speech bubble -->
      <g transform="translate(330, 130)">
        <path d="M-30,-20 Q-30,-35 -10,-35 L20,-35 Q35,-35 35,-20 L35,-5 Q35,8 20,8 L5,8 L-5,20 L-2,8 L-10,8 Q-30,8 -30,-5 Z" fill="#3498DB"/>
        <!-- Dots -->
        <circle cx="-5" cy="-14" r="3.5" fill="#FFF"/>
        <circle cx="8" cy="-14" r="3.5" fill="#FFF"/>
        <circle cx="21" cy="-14" r="3.5" fill="#FFF"/>
      </g>
      <!-- Small bubble -->
      <g transform="translate(150, 120)">
        <path d="M-18,-12 Q-18,-22 -5,-22 L12,-22 Q22,-22 22,-12 L22,-2 Q22,6 12,6 L2,6 L-3,14 L-1,6 L-5,6 Q-18,6 -18,-2 Z" fill="#2ECC71"/>
        <circle cx="0" cy="-8" r="2.5" fill="#FFF"/>
        <circle cx="9" cy="-8" r="2.5" fill="#FFF"/>
      </g>
      <!-- Connection indicator -->
      <g transform="translate(250, 95)" opacity="0.5">
        <circle cx="0" cy="0" r="5" fill="none" stroke="#E74C3C" stroke-width="1.5"/>
        <circle cx="0" cy="0" r="12" fill="none" stroke="#E74C3C" stroke-width="1" opacity="0.5"/>
        <circle cx="0" cy="0" r="20" fill="none" stroke="#E74C3C" stroke-width="0.8" opacity="0.3"/>
      </g>
    </g>
  </svg>`,
};

// ============================================================
// Public API
// ============================================================

/**
 * 3層レイヤーのHTMLを生成
 * @param {Object} data - { color, role, mode }
 * @returns {string} HTML string
 */
function createAvatarHTML(data) {
  const { color = 'blue', role = 'freelance', mode = 'work' } = data;

  const baseHTML = createBaseBody(color);
  const itemFn = ROLE_ITEMS[role] || ROLE_ITEMS.freelance;
  const effectFn = MODE_EFFECTS[mode] || MODE_EFFECTS.work;

  return `
    <div class="avatar-layer layer-base" style="z-index:1;">${baseHTML}</div>
    <div class="avatar-layer layer-item" style="z-index:2;">${itemFn()}</div>
    <div class="avatar-layer layer-effect" style="z-index:3;">${effectFn()}</div>
  `;
}

/**
 * 利用可能なオプション一覧
 */
const AVATAR_OPTIONS = {
  colors: Object.keys(COLOR_PALETTE),
  roles: Object.keys(ROLE_ITEMS),
  modes: Object.keys(MODE_EFFECTS),
};

// Export for module usage or global
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { createAvatarHTML, AVATAR_OPTIONS, COLOR_PALETTE };
}
