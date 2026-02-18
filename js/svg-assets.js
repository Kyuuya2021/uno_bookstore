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
// Brand Constants
// ============================================================
const BRAND_TEAL = '#3BA8B4';
const BRAND_TEAL_DARK = '#2E9AA5';

/**
 * 宇野書店ロゴ（簡略版SVG）— エプロンに使用
 * 白い有機的な波模様のマーク
 */
function unoLogoMark(cx, cy, size) {
  const s = size / 30;
  return `<g transform="translate(${cx}, ${cy}) scale(${s})">
    <rect x="-15" y="-15" width="30" height="30" rx="6" fill="#FFF"/>
    <path d="M-12,2 Q-8,-4 -4,1 Q0,5 4,0 Q8,-5 12,1" stroke="${BRAND_TEAL}" stroke-width="3.5" fill="none" stroke-linecap="round"/>
    <circle cx="-10" cy="2" r="2.5" fill="#FFF"/>
    <circle cx="-4" cy="-1" r="2" fill="#FFF"/>
    <circle cx="4" cy="1" r="2.2" fill="#FFF"/>
    <circle cx="10" cy="0" r="2.5" fill="#FFF"/>
  </g>`;
}

/**
 * スタッフ用エプロン（ティール + ロゴ）
 */
function staffApron() {
  return `
    <rect x="210" y="288" width="80" height="90" rx="8" fill="${BRAND_TEAL}"/>
    <line x1="225" y1="288" x2="250" y2="274" stroke="${BRAND_TEAL_DARK}" stroke-width="2.5" stroke-linecap="round"/>
    <line x1="275" y1="288" x2="250" y2="274" stroke="${BRAND_TEAL_DARK}" stroke-width="2.5" stroke-linecap="round"/>
    <rect x="210" y="288" width="80" height="6" rx="3" fill="${BRAND_TEAL_DARK}"/>
    ${unoLogoMark(250, 340, 28)}
  `;
}

// ============================================================
// NPC Avatars（常駐キャラクター）
// ============================================================

/**
 * NPC: 宇野さん（店長）
 * 黒髪ナチュラル・四角いメガネ・黒ジャケット + ティールエプロン
 */
function createNPCOwner() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${SVG_VIEWBOX}">
    <ellipse cx="250" cy="440" rx="70" ry="14" fill="rgba(0,0,0,0.10)"/>
    <!-- Body: black jacket -->
    <rect x="195" y="260" width="110" height="132" rx="30" fill="#1A1A1A"/>
    <!-- Jacket collar -->
    <path d="M215,265 L250,280 L285,265" stroke="#2C2C2C" stroke-width="3" fill="none"/>
    <!-- Apron -->
    ${staffApron()}
    <!-- Arms -->
    <rect x="165" y="278" width="30" height="80" rx="15" fill="#1A1A1A" transform="rotate(-8, 180, 278)"/>
    <rect x="305" y="278" width="30" height="80" rx="15" fill="#1A1A1A" transform="rotate(8, 320, 278)"/>
    <!-- Legs -->
    <rect x="215" y="378" width="28" height="55" rx="14" fill="#333"/>
    <rect x="257" y="378" width="28" height="55" rx="14" fill="#333"/>
    <!-- Shoes -->
    <ellipse cx="229" cy="432" rx="18" ry="10" fill="#222"/>
    <ellipse cx="271" cy="432" rx="18" ry="10" fill="#222"/>
    <!-- Head -->
    <circle cx="250" cy="200" r="75" fill="#FFD9B3"/>
    <!-- Hair: black, natural/messy, medium length -->
    <ellipse cx="250" cy="162" rx="82" ry="60" fill="#1A1A1A"/>
    <ellipse cx="250" cy="148" rx="76" ry="44" fill="#252525"/>
    <!-- Bangs falling over forehead -->
    <path d="M190,175 Q200,148 218,168 Q228,155 240,170" fill="#1A1A1A"/>
    <path d="M260,168 Q272,152 282,168 Q295,148 310,175" fill="#1A1A1A"/>
    <path d="M235,160 Q245,145 255,162" fill="#252525"/>
    <!-- Glasses (rectangular) -->
    <rect x="208" y="200" width="34" height="24" rx="4" fill="none" stroke="#333" stroke-width="2.5"/>
    <rect x="258" y="200" width="34" height="24" rx="4" fill="none" stroke="#333" stroke-width="2.5"/>
    <line x1="242" y1="212" x2="258" y2="212" stroke="#333" stroke-width="2"/>
    <line x1="208" y1="210" x2="195" y2="207" stroke="#333" stroke-width="2"/>
    <line x1="292" y1="210" x2="305" y2="207" stroke="#333" stroke-width="2"/>
    <!-- Eyes behind glasses -->
    <circle cx="225" cy="212" r="6" fill="#2C3E50"/>
    <circle cx="275" cy="212" r="6" fill="#2C3E50"/>
    <circle cx="227" cy="210" r="2.5" fill="#FFF"/>
    <circle cx="277" cy="210" r="2.5" fill="#FFF"/>
    <!-- Eyebrows -->
    <line x1="212" y1="195" x2="236" y2="193" stroke="#1A1A1A" stroke-width="2.5" stroke-linecap="round"/>
    <line x1="264" y1="193" x2="288" y2="195" stroke="#1A1A1A" stroke-width="2.5" stroke-linecap="round"/>
    <!-- Mouth: confident smile -->
    <path d="M235 236 Q250 248 265 236" stroke="#C0392B" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <!-- Cheeks -->
    <ellipse cx="210" cy="228" rx="10" ry="7" fill="rgba(255,150,150,0.25)"/>
    <ellipse cx="290" cy="228" rx="10" ry="7" fill="rgba(255,150,150,0.25)"/>
  </svg>`;
}

/**
 * NPC: 看板猫（猫耳の人型キャラ）
 * ティールエプロン、猫耳、しっぽ
 */
function createNPCCat() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${SVG_VIEWBOX}">
    <ellipse cx="250" cy="440" rx="70" ry="14" fill="rgba(0,0,0,0.10)"/>
    <!-- Tail -->
    <path d="M300,370 Q340,350 345,310 Q348,290 335,280" stroke="#F5C06B" stroke-width="10" fill="none" stroke-linecap="round"/>
    <circle cx="335" cy="278" r="7" fill="#F5C06B"/>
    <!-- Body -->
    <rect x="200" y="262" width="100" height="128" rx="30" fill="#FFF8E7"/>
    <!-- Apron -->
    ${staffApron()}
    <!-- Arms -->
    <rect x="170" y="278" width="30" height="75" rx="15" fill="#FFF8E7" transform="rotate(-8, 185, 278)"/>
    <rect x="300" y="278" width="30" height="75" rx="15" fill="#FFF8E7" transform="rotate(8, 315, 278)"/>
    <!-- Paw pads -->
    <circle cx="182" cy="355" r="8" fill="#FFB6C1"/>
    <circle cx="318" cy="355" r="8" fill="#FFB6C1"/>
    <!-- Legs -->
    <rect x="215" y="376" width="28" height="55" rx="14" fill="#F5DEB3"/>
    <rect x="257" y="376" width="28" height="55" rx="14" fill="#F5DEB3"/>
    <!-- Shoes (little paws) -->
    <ellipse cx="229" cy="432" rx="18" ry="10" fill="#F5DEB3"/>
    <ellipse cx="271" cy="432" rx="18" ry="10" fill="#F5DEB3"/>
    <circle cx="222" cy="434" r="3" fill="#FFB6C1"/>
    <circle cx="236" cy="434" r="3" fill="#FFB6C1"/>
    <circle cx="264" cy="434" r="3" fill="#FFB6C1"/>
    <circle cx="278" cy="434" r="3" fill="#FFB6C1"/>
    <!-- Head -->
    <circle cx="250" cy="205" r="72" fill="#FFF8E7"/>
    <!-- Cat ears -->
    <polygon points="195,155 185,95 220,140" fill="#FFF8E7"/>
    <polygon points="200,148 192,108 216,138" fill="#FFB6C1"/>
    <polygon points="305,155 315,95 280,140" fill="#FFF8E7"/>
    <polygon points="300,148 308,108 284,138" fill="#FFB6C1"/>
    <!-- Inner ear tufts -->
    <!-- Eyes (big, cat-like) -->
    <ellipse cx="228" cy="210" rx="10" ry="11" fill="#2ECC71"/>
    <ellipse cx="272" cy="210" rx="10" ry="11" fill="#2ECC71"/>
    <ellipse cx="228" cy="212" rx="5" ry="9" fill="#1A1A1A"/>
    <ellipse cx="272" cy="212" rx="5" ry="9" fill="#1A1A1A"/>
    <circle cx="231" cy="207" r="3" fill="#FFF"/>
    <circle cx="275" cy="207" r="3" fill="#FFF"/>
    <!-- Nose -->
    <polygon points="247,226 250,230 253,226" fill="#FFB6C1"/>
    <!-- Mouth -->
    <path d="M244,232 Q247,236 250,232" stroke="#C0392B" stroke-width="1.5" fill="none"/>
    <path d="M250,232 Q253,236 256,232" stroke="#C0392B" stroke-width="1.5" fill="none"/>
    <line x1="250" y1="230" x2="250" y2="234" stroke="#C0392B" stroke-width="1.5"/>
    <!-- Whiskers -->
    <line x1="200" y1="222" x2="230" y2="225" stroke="#BDC3C7" stroke-width="1.2"/>
    <line x1="198" y1="230" x2="228" y2="230" stroke="#BDC3C7" stroke-width="1.2"/>
    <line x1="270" y1="225" x2="300" y2="222" stroke="#BDC3C7" stroke-width="1.2"/>
    <line x1="272" y1="230" x2="302" y2="230" stroke="#BDC3C7" stroke-width="1.2"/>
    <!-- Cheeks -->
    <ellipse cx="215" cy="228" rx="10" ry="7" fill="rgba(255,180,180,0.3)"/>
    <ellipse cx="285" cy="228" rx="10" ry="7" fill="rgba(255,180,180,0.3)"/>
  </svg>`;
}

/**
 * NPC: バイトくん（元気な若者スタッフ）
 * 短髪・ティールエプロン・本を持っている
 */
function createNPCPartTimer() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${SVG_VIEWBOX}">
    <ellipse cx="250" cy="440" rx="70" ry="14" fill="rgba(0,0,0,0.10)"/>
    <!-- Body: white shirt -->
    <rect x="200" y="262" width="100" height="130" rx="30" fill="#FAFAFA"/>
    <!-- Apron -->
    ${staffApron()}
    <!-- Arms -->
    <rect x="170" y="278" width="30" height="78" rx="15" fill="#FAFAFA" transform="rotate(-12, 185, 278)"/>
    <rect x="300" y="278" width="30" height="78" rx="15" fill="#FAFAFA" transform="rotate(8, 315, 278)"/>
    <!-- Book in left hand -->
    <g transform="translate(162, 355) rotate(-15)">
      <rect x="-14" y="-18" width="28" height="36" rx="2" fill="#E74C3C"/>
      <rect x="-11" y="-15" width="22" height="30" rx="1" fill="#FDEBD0"/>
      <rect x="-14" y="-18" width="5" height="36" rx="1" fill="#C0392B"/>
    </g>
    <!-- Legs -->
    <rect x="215" y="378" width="28" height="55" rx="14" fill="#5DADE2"/>
    <rect x="257" y="378" width="28" height="55" rx="14" fill="#5DADE2"/>
    <!-- Shoes: sneakers -->
    <ellipse cx="229" cy="432" rx="18" ry="10" fill="#FFF"/>
    <ellipse cx="271" cy="432" rx="18" ry="10" fill="#FFF"/>
    <ellipse cx="229" cy="434" rx="12" ry="4" fill="#3498DB"/>
    <ellipse cx="271" cy="434" rx="12" ry="4" fill="#3498DB"/>
    <!-- Head -->
    <circle cx="250" cy="200" r="72" fill="#FFD9B3"/>
    <!-- Hair: short, slightly spiky, brown -->
    <ellipse cx="250" cy="165" rx="75" ry="52" fill="#6B4226"/>
    <ellipse cx="250" cy="152" rx="68" ry="38" fill="#7D5234"/>
    <!-- Spiky front -->
    <path d="M210,155 L218,135 L230,158" fill="#6B4226"/>
    <path d="M235,150 L245,128 L255,150" fill="#6B4226"/>
    <path d="M260,152 L270,132 L282,158" fill="#6B4226"/>
    <!-- Eyes: bright, energetic -->
    <circle cx="228" cy="210" r="9" fill="#2C3E50"/>
    <circle cx="272" cy="210" r="9" fill="#2C3E50"/>
    <circle cx="231" cy="207" r="3.5" fill="#FFF"/>
    <circle cx="275" cy="207" r="3.5" fill="#FFF"/>
    <circle cx="226" cy="213" r="1.5" fill="#FFF"/>
    <circle cx="270" cy="213" r="1.5" fill="#FFF"/>
    <!-- Eyebrows (energetic, slightly raised) -->
    <path d="M214,194 Q224,188 238,192" stroke="#5D3A1A" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <path d="M262,192 Q276,188 286,194" stroke="#5D3A1A" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <!-- Mouth: big grin -->
    <path d="M232 232 Q250 252 268 232" stroke="#C0392B" stroke-width="2.5" fill="rgba(255,255,255,0.4)" stroke-linecap="round"/>
    <!-- Cheeks -->
    <ellipse cx="212" cy="226" rx="12" ry="8" fill="rgba(255,150,150,0.35)"/>
    <ellipse cx="288" cy="226" rx="12" ry="8" fill="rgba(255,150,150,0.35)"/>
  </svg>`;
}

/**
 * NPC: 本の妖精（ファンタジーキャラ）
 * 翼・キラキラ・本モチーフの帽子
 */
function createNPCFairy() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${SVG_VIEWBOX}">
    <ellipse cx="250" cy="440" rx="55" ry="10" fill="rgba(0,0,0,0.08)"/>
    <!-- Wings -->
    <g opacity="0.4">
      <ellipse cx="185" cy="290" rx="45" ry="70" fill="#AED6F1" transform="rotate(15, 185, 290)"/>
      <ellipse cx="315" cy="290" rx="45" ry="70" fill="#AED6F1" transform="rotate(-15, 315, 290)"/>
      <ellipse cx="175" cy="275" rx="25" ry="45" fill="#D6EAF8" transform="rotate(20, 175, 275)"/>
      <ellipse cx="325" cy="275" rx="25" ry="45" fill="#D6EAF8" transform="rotate(-20, 325, 275)"/>
    </g>
    <!-- Sparkles around wings -->
    <g opacity="0.6">
      <polygon points="155,240 157,236 159,240 163,242 159,244 157,248 155,244 151,242" fill="#F1C40F"/>
      <polygon points="340,230 342,226 344,230 348,232 344,234 342,238 340,234 336,232" fill="#F1C40F"/>
      <polygon points="160,320 161,317 163,320 166,321 163,323 161,326 160,323 157,321" fill="#F39C12"/>
      <polygon points="345,310 346,307 348,310 351,311 348,313 346,316 345,313 342,311" fill="#F39C12"/>
    </g>
    <!-- Body: magical robe -->
    <path d="M210,268 L200,400 Q250,415 300,400 L290,268 Q250,255 210,268Z" fill="#8E44AD"/>
    <path d="M215,270 L208,395 Q250,408 292,395 L285,270 Q250,260 215,270Z" fill="#A569BD"/>
    <!-- Star clasp -->
    <polygon points="250,275 253,268 260,268 255,263 257,256 250,260 243,256 245,263 240,268 247,268" fill="#F1C40F"/>
    <!-- Arms (slender) -->
    <rect x="178" y="280" width="24" height="70" rx="12" fill="#A569BD" transform="rotate(-10, 190, 280)"/>
    <rect x="298" y="280" width="24" height="70" rx="12" fill="#A569BD" transform="rotate(10, 310, 280)"/>
    <!-- Hands holding a tiny book -->
    <g transform="translate(250, 358)">
      <circle cx="-30" cy="0" r="10" fill="#FFD9B3"/>
      <circle cx="30" cy="0" r="10" fill="#FFD9B3"/>
      <rect x="-12" y="-10" width="24" height="18" rx="2" fill="#2ECC71"/>
      <rect x="-9" y="-7" width="18" height="12" rx="1" fill="#FDEBD0"/>
      <rect x="-12" y="-10" width="4" height="18" rx="1" fill="#1E8449"/>
      <polygon points="4,-10 8,-10 8,-5 6,-7 4,-5" fill="#F1C40F"/>
    </g>
    <!-- Legs (hidden by robe, just shoes peek out) -->
    <ellipse cx="235" cy="408" rx="14" ry="8" fill="#7D3C98"/>
    <ellipse cx="265" cy="408" rx="14" ry="8" fill="#7D3C98"/>
    <!-- Head -->
    <circle cx="250" cy="200" r="65" fill="#FFD9B3"/>
    <!-- Hair: flowing lavender -->
    <ellipse cx="250" cy="170" rx="70" ry="50" fill="#D2B4DE"/>
    <ellipse cx="250" cy="158" rx="64" ry="38" fill="#E8DAEF"/>
    <!-- Flowing side hair -->
    <path d="M185,180 Q178,220 185,260 Q188,250 190,230 Q186,210 190,185Z" fill="#D2B4DE"/>
    <path d="M315,180 Q322,220 315,260 Q312,250 310,230 Q314,210 310,185Z" fill="#D2B4DE"/>
    <!-- Book hat / page crown -->
    <g transform="translate(250, 138)">
      <rect x="-22" y="-18" width="44" height="28" rx="3" fill="#2ECC71"/>
      <rect x="-18" y="-14" width="36" height="20" rx="2" fill="#FDEBD0"/>
      <line x1="-12" y1="-8" x2="12" y2="-8" stroke="#BDC3C7" stroke-width="1"/>
      <line x1="-12" y1="-2" x2="8" y2="-2" stroke="#BDC3C7" stroke-width="1"/>
      <line x1="-12" y1="4" x2="10" y2="4" stroke="#BDC3C7" stroke-width="1"/>
    </g>
    <!-- Eyes: big sparkly -->
    <ellipse cx="232" cy="205" rx="10" ry="11" fill="#8E44AD"/>
    <ellipse cx="268" cy="205" rx="10" ry="11" fill="#8E44AD"/>
    <circle cx="235" cy="202" r="4" fill="#FFF"/>
    <circle cx="271" cy="202" r="4" fill="#FFF"/>
    <circle cx="230" cy="208" r="2" fill="#FFF" opacity="0.6"/>
    <circle cx="266" cy="208" r="2" fill="#FFF" opacity="0.6"/>
    <!-- Blush -->
    <ellipse cx="218" cy="220" rx="10" ry="6" fill="rgba(255,150,200,0.4)"/>
    <ellipse cx="282" cy="220" rx="10" ry="6" fill="rgba(255,150,200,0.4)"/>
    <!-- Mouth: gentle smile -->
    <path d="M242 225 Q250 234 258 225" stroke="#D35400" stroke-width="2" fill="none" stroke-linecap="round"/>
    <!-- Floating sparkles -->
    <g opacity="0.5">
      <polygon points="310,155 312,150 314,155 319,157 314,159 312,164 310,159 305,157" fill="#F1C40F">
        <animate attributeName="opacity" values="0.3;0.8;0.3" dur="2s" repeatCount="indefinite"/>
      </polygon>
      <polygon points="185,165 187,161 189,165 193,167 189,169 187,173 185,169 181,167" fill="#F39C12">
        <animate attributeName="opacity" values="0.5;1;0.5" dur="2.5s" repeatCount="indefinite"/>
      </polygon>
    </g>
  </svg>`;
}

// ============================================================
// NPC Definitions（常駐キャラクター設定）
// ============================================================

const NPC_CHARACTERS = [
  {
    id: 'npc_owner',
    nickname: '宇野さん（店長）',
    createSVG: createNPCOwner,
    badge: 'owner',
  },
  {
    id: 'npc_cat',
    nickname: 'たま（看板猫）',
    createSVG: createNPCCat,
    badge: 'cat',
  },
  {
    id: 'npc_parttimer',
    nickname: 'バイトくん',
    createSVG: createNPCPartTimer,
    badge: 'staff',
  },
  {
    id: 'npc_fairy',
    nickname: '本の妖精',
    createSVG: createNPCFairy,
    badge: 'fairy',
  },
];

/**
 * NPCアバターのHTMLを生成（3層ではなく1層の完全SVG）
 */
function createNPCAvatarHTML(npcType) {
  const npc = NPC_CHARACTERS.find(n => n.id === npcType);
  if (!npc) return '';
  return `<div class="avatar-layer layer-base" style="z-index:1;">${npc.createSVG()}</div>`;
}

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
  module.exports = { createAvatarHTML, createNPCAvatarHTML, NPC_CHARACTERS, AVATAR_OPTIONS, COLOR_PALETTE };
}
