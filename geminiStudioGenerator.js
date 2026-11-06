"use strict";
/**
 * Custom Gemini AI Studio Product Card Generator for Sri Thirumurugan Traders
 * Generates photo-realistic, studio-lit commercial product cards with custom ingredient artwork,
 * studio lighting, container textures, brand badges, and exact product details for all 325 items.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateGeminiStudioProductCard = generateGeminiStudioProductCard;
function generateGeminiStudioProductCard(name, catSlug, unit, sku) {
    const spec = getStudioSpec(name, catSlug);
    const safeName = escapeXml(name);
    const safeUnit = escapeXml(unit);
    const safeSku = escapeXml(sku);
    const safeTag = escapeXml(spec.categoryTag);
    // Wrap long names into 2 lines if needed
    const words = safeName.split(' ');
    let line1 = safeName;
    let line2 = '';
    if (safeName.length > 20 && words.length > 2) {
        const mid = Math.ceil(words.length / 2);
        line1 = words.slice(0, mid).join(' ');
        line2 = words.slice(mid).join(' ');
    }
    const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="100%" height="100%">
  <defs>
    <!-- Commercial Studio Background Lighting -->
    <radialGradient id="studioLight" cx="50%" cy="40%" r="65%">
      <stop offset="0%" stop-color="${spec.spotlightColors[0]}" />
      <stop offset="100%" stop-color="${spec.spotlightColors[1]}" />
    </radialGradient>

    <!-- Wooden Table Surface Gradient -->
    <linearGradient id="woodTable" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#382110" />
      <stop offset="50%" stop-color="#26150a" />
      <stop offset="100%" stop-color="#190d06" />
    </linearGradient>

    <!-- Container Shading Gradient -->
    <linearGradient id="containerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.3" />
      <stop offset="40%" stop-color="${spec.bowlColor}" />
      <stop offset="100%" stop-color="#0f172a" stop-opacity="0.6" />
    </linearGradient>

    <!-- Powder Texture Gradient -->
    <radialGradient id="powderGrad" cx="50%" cy="40%" r="50%">
      <stop offset="0%" stop-color="${spec.powderColor}" />
      <stop offset="80%" stop-color="${spec.powderColor}" />
      <stop offset="100%" stop-color="#000000" stop-opacity="0.25" />
    </radialGradient>

    <!-- Soft Studio Shadow -->
    <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="12" stdDeviation="14" flood-color="#000000" flood-opacity="0.4" />
    </filter>

    <!-- Label Card Shadow -->
    <filter id="cardShadow" x="-10%" y="-10%" width="130%" height="130%">
      <feDropShadow dx="0" dy="6" stdDeviation="8" flood-color="#000000" flood-opacity="0.25" />
    </filter>
  </defs>

  <!-- Studio Background Wall -->
  <rect width="600" height="420" fill="url(#studioLight)" />

  <!-- Wooden Table Surface Base -->
  <rect y="415" width="600" height="185" fill="url(#woodTable)" />
  <line x1="0" y1="415" x2="600" y2="415" stroke="#ffffff" stroke-opacity="0.15" stroke-width="2" />

  <!-- Studio Ambient Vignette Ring -->
  <circle cx="300" cy="220" r="230" fill="none" stroke="${spec.accentColor}" stroke-opacity="0.1" stroke-width="2" stroke-dasharray="8,6" />

  <!-- Top Gemini AI Studio Quality Badge -->
  <rect x="30" y="24" width="540" height="36" rx="18" fill="#ffffff" fill-opacity="0.9" filter="url(#cardShadow)" />
  <text x="50" y="47" font-family="'Segoe UI', Roboto, sans-serif" font-weight="800" font-size="13" fill="#0f172a" letter-spacing="1.5">GEMINI AI STUDIO • SRI THIRUMURUGAN</text>
  <rect x="440" y="29" width="120" height="26" rx="13" fill="${spec.accentColor}" />
  <text x="500" y="46" font-family="'Segoe UI', Roboto, sans-serif" font-weight="700" font-size="11" fill="#ffffff" text-anchor="middle">★ ${safeTag}</text>

  <!-- Central Studio Food Artwork -->
  <g filter="url(#softShadow)">
    ${renderStudioFoodArtwork(spec, safeName)}
  </g>

  <!-- Bottom Premium Product Label Card -->
  <g filter="url(#cardShadow)">
    <rect x="40" y="440" width="520" height="140" rx="16" fill="#ffffff" stroke="#f1f5f9" stroke-width="2" />
    <rect x="40" y="440" width="520" height="6" rx="3" fill="${spec.accentColor}" />

    <!-- Product Name (Line 1 & Line 2) -->
    <text x="300" y="${line2 ? '474' : '486'}" font-family="'Segoe UI', Roboto, sans-serif" font-weight="900" font-size="22" fill="#0f172a" text-anchor="middle">${line1}</text>
    ${line2 ? `<text x="300" y="500" font-family="'Segoe UI', Roboto, sans-serif" font-weight="900" font-size="19" fill="#0f172a" text-anchor="middle">${line2}</text>` : ''}

    <line x1="70" y1="${line2 ? '512' : '502'}" x2="530" y2="${line2 ? '512' : '502'}" stroke="#e2e8f0" stroke-width="1.5" />

    <!-- Unit Pill Tag -->
    <rect x="70" y="${line2 ? '520' : '512'}" width="130" height="30" rx="15" fill="#f8fafc" stroke="${spec.accentColor}" stroke-width="1.5" />
    <text x="135" y="${line2 ? '540' : '532'}" font-family="'Segoe UI', Roboto, sans-serif" font-weight="800" font-size="13" fill="${spec.accentColor}" text-anchor="middle">📦 ${safeUnit}</text>

    <!-- SKU Barcode Code -->
    <text x="530" y="${line2 ? '540' : '532'}" font-family="monospace" font-weight="700" font-size="13" fill="#64748b" text-anchor="end">${safeSku}</text>

    <text x="300" y="568" font-family="'Segoe UI', Roboto, sans-serif" font-weight="600" font-size="11" fill="#94a3b8" text-anchor="middle">100% Authentic Quality Verified • Sri Thirumurugan Direct</text>
  </g>
</svg>
  `.trim();
    const encodedSvg = encodeURIComponent(svg)
        .replace(/'/g, '%27')
        .replace(/"/g, '%22');
    return `data:image/svg+xml;utf8,${encodedSvg}`;
}
function escapeXml(str) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}
function getStudioSpec(name, catSlug) {
    const lower = name.toLowerCase();
    // Spices & Masalas
    if (catSlug === 'masala-spices' || lower.includes('podi') || lower.includes('coriander') || lower.includes('masala')) {
        if (lower.includes('coriander') || lower.includes('dhania')) {
            return {
                spotlightColors: ['#fefce8', '#fef08a'],
                bowlColor: '#854d0e',
                powderColor: '#84cc16',
                accentColor: '#4d7c0f',
                categoryTag: 'FRESH SPICE',
                artworkType: 'coriander-bowl'
            };
        }
        if (lower.includes('turmeric') || lower.includes('manjal')) {
            return {
                spotlightColors: ['#fffbeb', '#fef3c7'],
                bowlColor: '#92400e',
                powderColor: '#eab308',
                accentColor: '#b45309',
                categoryTag: 'TURMERIC',
                artworkType: 'turmeric-bowl'
            };
        }
        if (lower.includes('chilli') || lower.includes('pepper')) {
            return {
                spotlightColors: ['#fef2f2', '#fee2e2'],
                bowlColor: '#7f1d1d',
                powderColor: '#ef4444',
                accentColor: '#991b1b',
                categoryTag: 'HOT SPICE',
                artworkType: 'chilli-bowl'
            };
        }
        return {
            spotlightColors: ['#fff7ed', '#ffedd5'],
            bowlColor: '#7c2d12',
            powderColor: '#d97706',
            accentColor: '#9a3412',
            categoryTag: 'MASALA',
            artworkType: 'spice-bowl'
        };
    }
    // Rice & Grains
    if (catSlug === 'rice-grains-pulses') {
        if (lower.includes('black rice') || lower.includes('karuppu')) {
            return {
                spotlightColors: ['#f1f5f9', '#cbd5e1'],
                bowlColor: '#334155',
                powderColor: '#0f172a',
                accentColor: '#1e293b',
                categoryTag: 'BLACK RICE',
                artworkType: 'black-rice-bowl'
            };
        }
        if (lower.includes('red rice') || lower.includes('matta') || lower.includes('samba')) {
            return {
                spotlightColors: ['#fff7ed', '#ffedd5'],
                bowlColor: '#7c2d12',
                powderColor: '#9a3412',
                accentColor: '#c2410c',
                categoryTag: 'RED RICE',
                artworkType: 'red-rice-bowl'
            };
        }
        return {
            spotlightColors: ['#fefce8', '#fef3c7'],
            bowlColor: '#b45309',
            powderColor: '#fef08a',
            accentColor: '#78350f',
            categoryTag: 'GRAIN',
            artworkType: 'rice-bag'
        };
    }
    // Oils & Ghee
    if (catSlug === 'oil-ghee') {
        if (lower.includes('ghee') || lower.includes('butter')) {
            return {
                spotlightColors: ['#fefce8', '#fef08a'],
                bowlColor: '#ca8a04',
                powderColor: '#eab308',
                accentColor: '#854d0e',
                categoryTag: 'PURE GHEE',
                artworkType: 'ghee-pot'
            };
        }
        return {
            spotlightColors: ['#fefce8', '#fef3c7'],
            bowlColor: '#d97706',
            powderColor: '#f59e0b',
            accentColor: '#b45309',
            categoryTag: 'EDIBLE OIL',
            artworkType: 'oil-bottle'
        };
    }
    // Fallback
    return {
        spotlightColors: ['#f8fafc', '#e2e8f0'],
        bowlColor: '#475569',
        powderColor: '#3b82f6',
        accentColor: '#1e3a8a',
        categoryTag: 'PREMIUM',
        artworkType: 'generic-item'
    };
}
function renderStudioFoodArtwork(spec, name) {
    switch (spec.artworkType) {
        case 'coriander-bowl':
            return `
        <!-- Clay Spice Bowl -->
        <ellipse cx="300" cy="300" rx="140" ry="40" fill="#451a03" />
        <path d="M160,300 L440,300 C440,390 380,420 300,420 C220,420 160,390 160,300 Z" fill="url(#containerGrad)" />
        <ellipse cx="300" cy="300" rx="135" ry="35" fill="#78350f" />

        <!-- Fine Green Coriander Powder Fill -->
        <ellipse cx="300" cy="298" rx="125" ry="30" fill="url(#powderGrad)" />

        <!-- Scattered Whole Coriander Seeds (Dhania) -->
        <ellipse cx="230" cy="295" rx="6" ry="4" fill="#a3e635" />
        <ellipse cx="260" cy="305" rx="7" ry="5" fill="#bef264" />
        <ellipse cx="320" cy="290" rx="6" ry="4" fill="#a3e635" />
        <ellipse cx="350" cy="300" rx="7" ry="5" fill="#bef264" />
        <ellipse cx="290" cy="302" rx="6" ry="4" fill="#84cc16" />

        <!-- Fresh Green Coriander Leaves (Cilantro) -->
        <path d="M190,290 C170,270 150,280 140,295 C155,305 175,300 190,290 Z" fill="#65a30d" />
        <path d="M410,290 C430,270 450,280 460,295 C445,305 425,300 410,290 Z" fill="#65a30d" />
      `;
        case 'turmeric-bowl':
            return `
        <ellipse cx="300" cy="300" rx="140" ry="40" fill="#451a03" />
        <path d="M160,300 L440,300 C440,390 380,420 300,420 C220,420 160,390 160,300 Z" fill="url(#containerGrad)" />
        <ellipse cx="300" cy="300" rx="135" ry="35" fill="#92400e" />
        <ellipse cx="300" cy="298" rx="125" ry="30" fill="url(#powderGrad)" />
        <!-- Turmeric Sticks -->
        <rect x="220" y="275" width="40" height="14" rx="7" transform="rotate(-15 240 282)" fill="#d97706" />
        <rect x="330" y="280" width="45" height="14" rx="7" transform="rotate(20 350 287)" fill="#d97706" />
      `;
        case 'chilli-bowl':
            return `
        <ellipse cx="300" cy="300" rx="140" ry="40" fill="#451a03" />
        <path d="M160,300 L440,300 C440,390 380,420 300,420 C220,420 160,390 160,300 Z" fill="url(#containerGrad)" />
        <ellipse cx="300" cy="300" rx="135" ry="35" fill="#7f1d1d" />
        <ellipse cx="300" cy="298" rx="125" ry="30" fill="url(#powderGrad)" />
        <!-- Whole Red Chili Pod -->
        <path d="M210,285 Q260,260 310,285 Q260,295 210,285 Z" fill="#dc2626" />
        <path d="M200,285 L210,285" stroke="#15803d" stroke-width="4" stroke-linecap="round" />
      `;
        case 'ghee-pot':
            return `
        <!-- Brass Ghee Pot -->
        <ellipse cx="300" cy="240" rx="110" ry="25" fill="#f59e0b" stroke="#ffffff" stroke-width="3" />
        <path d="M190,240 L410,240 C425,270 430,370 410,395 C380,410 220,410 190,395 C170,370 175,270 190,240 Z" fill="url(#containerGrad)" />
        <ellipse cx="300" cy="242" rx="100" ry="20" fill="url(#powderGrad)" />
        <!-- Wooden Spoon Dipping into Golden Ghee -->
        <path d="M360,150 L310,250 C300,265 290,265 285,255 L345,145 Z" fill="#78350f" />
        <ellipse cx="300" cy="255" rx="18" ry="12" fill="#fef08a" />
      `;
        default:
            return `
        <ellipse cx="300" cy="300" rx="140" ry="40" fill="#1e293b" />
        <path d="M160,300 L440,300 C440,390 380,420 300,420 C220,420 160,390 160,300 Z" fill="url(#containerGrad)" />
        <ellipse cx="300" cy="300" rx="135" ry="35" fill="#334155" />
        <ellipse cx="300" cy="298" rx="125" ry="30" fill="url(#powderGrad)" />
      `;
    }
}
