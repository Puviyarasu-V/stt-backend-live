"use strict";
/**
 * High-Quality Product Image Generator for Sri Thirumurugan Traders
 * Generates individual, 100% unique, visually accurate SVG product card Data URIs
 * for all 325 catalog products matching exact name, category, unit, and item details.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateProductImageSvg = generateProductImageSvg;
function generateProductImageSvg(name, catSlug, unit, sku) {
    // Determine color scheme and visual artwork type based on category & item name
    const spec = getSpecForProduct(name, catSlug);
    // Clean strings for SVG safety
    const safeName = escapeSvgText(name);
    const safeUnit = escapeSvgText(unit);
    const safeSku = escapeSvgText(sku);
    const safeBadge = escapeSvgText(spec.badgeText);
    // Wrap long names into 2 lines if needed
    const words = safeName.split(' ');
    let line1 = safeName;
    let line2 = '';
    if (safeName.length > 22 && words.length > 2) {
        const mid = Math.ceil(words.length / 2);
        line1 = words.slice(0, mid).join(' ');
        line2 = words.slice(mid).join(' ');
    }
    const svgContent = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="100%" height="100%">
  <defs>
    <!-- Background Gradient -->
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${spec.bgGradient[0]}" />
      <stop offset="100%" stop-color="${spec.bgGradient[1]}" />
    </linearGradient>

    <!-- Packaging Gradient -->
    <linearGradient id="packGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="${spec.cardGradient[0]}" />
      <stop offset="100%" stop-color="${spec.cardGradient[1]}" />
    </linearGradient>

    <!-- Gloss Highlight -->
    <linearGradient id="glossGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.25" />
      <stop offset="50%" stop-color="#ffffff" stop-opacity="0.05" />
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0" />
    </linearGradient>

    <!-- Drop Shadow Filter -->
    <filter id="shadow" x="-10%" y="-10%" width="130%" height="130%">
      <feDropShadow dx="0" dy="8" stdDeviation="10" flood-color="#0f172a" flood-opacity="0.15" />
    </filter>
  </defs>

  <!-- Background Base -->
  <rect width="500" height="500" rx="0" fill="url(#bgGrad)" />

  <!-- Subtle Subtle Grid / Pattern Accent -->
  <circle cx="250" cy="250" r="210" fill="none" stroke="${spec.accentColor}" stroke-opacity="0.12" stroke-width="2" stroke-dasharray="6,6" />
  <circle cx="250" cy="250" r="170" fill="none" stroke="${spec.accentColor}" stroke-opacity="0.08" stroke-width="1.5" />

  <!-- Header Store Badge -->
  <rect x="25" y="20" width="450" height="32" rx="16" fill="#ffffff" fill-opacity="0.85" />
  <text x="40" y="41" font-family="'Segoe UI', Roboto, sans-serif" font-weight="700" font-size="13" fill="#1e293b" letter-spacing="1">SRI THIRUMURUGAN TRADERS</text>
  <rect x="365" y="24" width="100" height="24" rx="12" fill="${spec.accentColor}" />
  <text x="415" y="40" font-family="'Segoe UI', Roboto, sans-serif" font-weight="700" font-size="11" fill="#ffffff" text-anchor="middle">${safeBadge}</text>

  <!-- Main Product Package Graphic (Centered Container) -->
  <g filter="url(#shadow)">
    ${renderItemGraphic(spec.itemType, spec.accentColor, spec.cardGradient)}
  </g>

  <!-- Product Label Card -->
  <g filter="url(#shadow)">
    <!-- White Inner Label Plate -->
    <rect x="65" y="325" width="370" height="145" rx="14" fill="#ffffff" stroke="#f1f5f9" stroke-width="2" />
    <rect x="65" y="325" width="370" height="6" rx="3" fill="${spec.accentColor}" />

    <!-- Product Name (Line 1 & Line 2) -->
    <text x="250" y="${line2 ? '358' : '368'}" font-family="'Segoe UI', Roboto, sans-serif" font-weight="800" font-size="19" fill="#0f172a" text-anchor="middle">${line1}</text>
    ${line2 ? `<text x="250" y="382" font-family="'Segoe UI', Roboto, sans-serif" font-weight="800" font-size="17" fill="#0f172a" text-anchor="middle">${line2}</text>` : ''}

    <!-- Divider Line -->
    <line x1="90" y1="${line2 ? '396' : '386'}" x2="410" y2="${line2 ? '396' : '386'}" stroke="#e2e8f0" stroke-width="1" />

    <!-- Details Row: Unit Pill & SKU Barcode -->
    <rect x="90" y="${line2 ? '406' : '396'}" width="120" height="28" rx="14" fill="#f8fafc" stroke="${spec.accentColor}" stroke-width="1.5" />
    <text x="150" y="${line2 ? '424' : '414'}" font-family="'Segoe UI', Roboto, sans-serif" font-weight="700" font-size="13" fill="${spec.accentColor}" text-anchor="middle">📦 ${safeUnit}</text>

    <!-- Authenticity Seal / SKU -->
    <text x="410" y="${line2 ? '424' : '414'}" font-family="monospace" font-weight="600" font-size="12" fill="#64748b" text-anchor="end">${safeSku}</text>

    <!-- Quality Guarantee Ribbon -->
    <text x="250" y="455" font-family="'Segoe UI', Roboto, sans-serif" font-weight="600" font-size="11" fill="#94a3b8" text-anchor="middle">100% Genuine Quality Guaranteed • Sri Thirumurugan Direct</text>
  </g>
</svg>
  `.trim();
    // Convert SVG string to data URI
    const encodedSvg = encodeURIComponent(svgContent)
        .replace(/'/g, '%27')
        .replace(/"/g, '%22');
    return `data:image/svg+xml;utf8,${encodedSvg}`;
}
function escapeSvgText(str) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}
function getSpecForProduct(name, catSlug) {
    const lowerName = name.toLowerCase();
    // 1. Rice, Grains & Pulses
    if (catSlug === 'rice-grains-pulses') {
        if (lowerName.includes('rice')) {
            return {
                bgGradient: ['#fef3c7', '#fde68a'],
                cardGradient: ['#f59e0b', '#d97706'],
                accentColor: '#b45309',
                badgeText: 'GRAIN',
                categoryIcon: '🍚',
                itemType: 'rice-sack'
            };
        }
        if (lowerName.includes('dal') || lowerName.includes('payiru') || lowerName.includes('gram') || lowerName.includes('beans') || lowerName.includes('chana') || lowerName.includes('rajma')) {
            return {
                bgGradient: ['#fff7ed', '#ffedd5'],
                cardGradient: ['#ea580c', '#c2410c'],
                accentColor: '#9a3412',
                badgeText: 'PULSE',
                categoryIcon: '🥣',
                itemType: 'dal-bowl'
            };
        }
        return {
            bgGradient: ['#fefce8', '#fef08a'],
            cardGradient: ['#ca8a04', '#a16207'],
            accentColor: '#854d0e',
            badgeText: 'MILLET',
            categoryIcon: '🌾',
            itemType: 'millet-pouch'
        };
    }
    // 2. Atta, Flour & Essentials
    if (catSlug === 'atta-flour-essentials') {
        if (lowerName.includes('atta') || lowerName.includes('flour') || lowerName.includes('maavu') || lowerName.includes('maida') || lowerName.includes('rava') || lowerName.includes('besan') || lowerName.includes('sooji')) {
            return {
                bgGradient: ['#fafaf9', '#f5f5f4'],
                cardGradient: ['#78716c', '#57534e'],
                accentColor: '#44403c',
                badgeText: 'FLOUR',
                categoryIcon: '🌾',
                itemType: 'flour-bag'
            };
        }
        if (lowerName.includes('salt') || lowerName.includes('uppu') || lowerName.includes('sugar') || lowerName.includes('sakkarai') || lowerName.includes('jaggery') || lowerName.includes('vellam') || lowerName.includes('karupatti')) {
            return {
                bgGradient: ['#fffbeb', '#fef3c7'],
                cardGradient: ['#d97706', '#b45309'],
                accentColor: '#78350f',
                badgeText: 'SWEETENER',
                categoryIcon: '🍬',
                itemType: 'sugar-jaggery'
            };
        }
        return {
            bgGradient: ['#f8fafc', '#f1f5f9'],
            cardGradient: ['#475569', '#334155'],
            accentColor: '#1e293b',
            badgeText: 'ESSENTIAL',
            categoryIcon: '🧂',
            itemType: 'essential-pack'
        };
    }
    // 3. Edible Oil & Ghee
    if (catSlug === 'oil-ghee') {
        if (lowerName.includes('ghee') || lowerName.includes('butter')) {
            return {
                bgGradient: ['#fefce8', '#fef08a'],
                cardGradient: ['#eab308', '#ca8a04'],
                accentColor: '#854d0e',
                badgeText: 'PURE GHEE',
                categoryIcon: '🧈',
                itemType: 'ghee-jar'
            };
        }
        if (lowerName.includes('coconut')) {
            return {
                bgGradient: ['#f0fdf4', '#dcfce7'],
                cardGradient: ['#16a34a', '#15803d'],
                accentColor: '#166534',
                badgeText: 'PURE OIL',
                categoryIcon: '🥥',
                itemType: 'coconut-oil'
            };
        }
        return {
            bgGradient: ['#fefce8', '#fef3c7'],
            cardGradient: ['#f59e0b', '#d97706'],
            accentColor: '#b45309',
            badgeText: 'EDIBLE OIL',
            categoryIcon: '🛢️',
            itemType: 'oil-can'
        };
    }
    // 4. Masala & Spices
    if (catSlug === 'masala-spices') {
        if (lowerName.includes('chilli') || lowerName.includes('pepper') || lowerName.includes('chicken') || lowerName.includes('mutton') || lowerName.includes('fish') || lowerName.includes('garam') || lowerName.includes('sambar') || lowerName.includes('rasam')) {
            return {
                bgGradient: ['#fef2f2', '#fee2e2'],
                cardGradient: ['#ef4444', '#dc2626'],
                accentColor: '#991b1b',
                badgeText: 'SPICY',
                categoryIcon: '🌶️',
                itemType: 'masala-pouch'
            };
        }
        if (lowerName.includes('turmeric') || lowerName.includes('manjal') || lowerName.includes('mustard') || lowerName.includes('cumin') || lowerName.includes('jeeragam') || lowerName.includes('coriander')) {
            return {
                bgGradient: ['#fffbeb', '#fef3c7'],
                cardGradient: ['#f59e0b', '#d97706'],
                accentColor: '#78350f',
                badgeText: 'SPICE',
                categoryIcon: '🧄',
                itemType: 'spice-powder'
            };
        }
        return {
            bgGradient: ['#fff7ed', '#ffedd5'],
            cardGradient: ['#ea580c', '#c2410c'],
            accentColor: '#9a3412',
            badgeText: 'WHOLE SPICE',
            categoryIcon: '🌿',
            itemType: 'whole-spice'
        };
    }
    // 5. Podi, Pickles & Thokku
    if (catSlug === 'podi-pickles-thokku') {
        if (lowerName.includes('podi') || lowerName.includes('powder')) {
            return {
                bgGradient: ['#fff7ed', '#ffedd5'],
                cardGradient: ['#d97706', '#b45309'],
                accentColor: '#78350f',
                badgeText: 'RICE PODI',
                categoryIcon: '🥣',
                itemType: 'podi-pack'
            };
        }
        return {
            bgGradient: ['#fef2f2', '#fee2e2'],
            cardGradient: ['#b91c1c', '#991b1b'],
            accentColor: '#7f1d1d',
            badgeText: 'THOKKU/PICKLE',
            categoryIcon: '🫙',
            itemType: 'pickle-jar'
        };
    }
    // 6. Biscuits & Cookies
    if (catSlug === 'biscuits-cookies') {
        return {
            bgGradient: ['#fffbeb', '#fef3c7'],
            cardGradient: ['#d97706', '#b45309'],
            accentColor: '#78350f',
            badgeText: 'CRUNCHY',
            categoryIcon: '🍪',
            itemType: 'biscuit-pack'
        };
    }
    // 7. Snacks & Savouries
    if (catSlug === 'snacks-savouries') {
        if (lowerName.includes('chips') || lowerName.includes('lays') || lowerName.includes('kurkure') || lowerName.includes('bingo')) {
            return {
                bgGradient: ['#fefce8', '#fef08a'],
                cardGradient: ['#eab308', '#ca8a04'],
                accentColor: '#854d0e',
                badgeText: 'CHIPS',
                categoryIcon: '🥔',
                itemType: 'chips-bag'
            };
        }
        return {
            bgGradient: ['#fff7ed', '#ffedd5'],
            cardGradient: ['#ea580c', '#c2410c'],
            accentColor: '#9a3412',
            badgeText: 'SAVOURY',
            categoryIcon: '🥨',
            itemType: 'snack-pack'
        };
    }
    // 8. Sweets
    if (catSlug === 'sweets') {
        return {
            bgGradient: ['#fff1f2', '#ffe4e6'],
            cardGradient: ['#e11d48', '#be123c'],
            accentColor: '#881337',
            badgeText: 'TRADITIONAL SWEET',
            categoryIcon: '🍬',
            itemType: 'sweet-box'
        };
    }
    // 9. Bakery & Cakes
    if (catSlug === 'bakery-cakes') {
        if (lowerName.includes('bread') || lowerName.includes('bun')) {
            return {
                bgGradient: ['#fffbeb', '#fef3c7'],
                cardGradient: ['#b45309', '#78350f'],
                accentColor: '#451a03',
                badgeText: 'FRESH BREAD',
                categoryIcon: '🍞',
                itemType: 'bread-loaf'
            };
        }
        return {
            bgGradient: ['#fdf2f8', '#fce7f3'],
            cardGradient: ['#db2777', '#be185d'],
            accentColor: '#831843',
            badgeText: 'BAKERY FRESH',
            categoryIcon: '🍰',
            itemType: 'cake-slice'
        };
    }
    // 10. Beverages
    if (catSlug === 'beverages') {
        if (lowerName.includes('tea') || lowerName.includes('coffee')) {
            return {
                bgGradient: ['#fff7ed', '#ffedd5'],
                cardGradient: ['#c2410c', '#9a3412'],
                accentColor: '#7c2d12',
                badgeText: 'HOT BEVERAGE',
                categoryIcon: '☕',
                itemType: 'tea-coffee'
            };
        }
        if (lowerName.includes('juice') || lowerName.includes('tetra') || lowerName.includes('drink') || lowerName.includes('soft') || lowerName.includes('coke') || lowerName.includes('sprite')) {
            return {
                bgGradient: ['#f0fdf4', '#dcfce7'],
                cardGradient: ['#16a34a', '#15803d'],
                accentColor: '#14532d',
                badgeText: 'REFRESHING',
                categoryIcon: '🧃',
                itemType: 'juice-bottle'
            };
        }
        return {
            bgGradient: ['#f0f9ff', '#e0f2fe'],
            cardGradient: ['#0284c7', '#0369a1'],
            accentColor: '#0c4a6e',
            badgeText: 'HEALTH DRINK',
            categoryIcon: '🥛',
            itemType: 'beverage-pack'
        };
    }
    // 11. Instant & Ready-to-Cook
    if (catSlug === 'instant-ready-cook') {
        return {
            bgGradient: ['#fff7ed', '#ffedd5'],
            cardGradient: ['#f97316', '#ea580c'],
            accentColor: '#9a3412',
            badgeText: 'READY TO COOK',
            categoryIcon: '🍜',
            itemType: 'instant-box'
        };
    }
    // 12. Personal Care
    if (catSlug === 'personal-care') {
        if (lowerName.includes('soap') || lowerName.includes('bar')) {
            return {
                bgGradient: ['#f0fdfa', '#ccfbf1'],
                cardGradient: ['#0d9488', '#0f766e'],
                accentColor: '#134e4a',
                badgeText: 'BATH SOAP',
                categoryIcon: '🧼',
                itemType: 'soap-bar'
            };
        }
        if (lowerName.includes('shampoo') || lowerName.includes('oil') || lowerName.includes('hair')) {
            return {
                bgGradient: ['#eff6ff', '#dbeafe'],
                cardGradient: ['#2563eb', '#1d4ed8'],
                accentColor: '#1e3a8a',
                badgeText: 'HAIR CARE',
                categoryIcon: '🧴',
                itemType: 'care-bottle'
            };
        }
        return {
            bgGradient: ['#faf5ff', '#f3e8ff'],
            cardGradient: ['#9333ea', '#7e22ce'],
            accentColor: '#581c87',
            badgeText: 'PERSONAL CARE',
            categoryIcon: '✨',
            itemType: 'personal-item'
        };
    }
    // 13. Home Cleaning & Household
    if (catSlug === 'home-cleaning') {
        return {
            bgGradient: ['#f0f9ff', '#e0f2fe'],
            cardGradient: ['#2563eb', '#1d4ed8'],
            accentColor: '#1e3a8a',
            badgeText: 'HOME CLEAN',
            categoryIcon: '🧹',
            itemType: 'cleaning-bottle'
        };
    }
    // Fallback
    return {
        bgGradient: ['#f8fafc', '#f1f5f9'],
        cardGradient: ['#475569', '#334155'],
        accentColor: '#0f172a',
        badgeText: 'PREMIUM',
        categoryIcon: '🛒',
        itemType: 'generic-pack'
    };
}
function renderItemGraphic(itemType, accentColor, gradient) {
    switch (itemType) {
        case 'rice-sack':
        case 'flour-bag':
            return `
        <!-- Sack Body -->
        <path d="M150,110 C150,95 350,95 350,110 L370,285 C370,305 340,315 250,315 C160,315 130,305 130,285 Z" fill="url(#packGrad)" />
        <!-- Sack Top Stitching -->
        <ellipse cx="250" cy="110" rx="100" ry="16" fill="${gradient[0]}" stroke="#ffffff" stroke-width="3" />
        <path d="M150,110 Q250,125 350,110" fill="none" stroke="${accentColor}" stroke-width="3" stroke-dasharray="8,5" />
        <!-- Sack String Ties -->
        <path d="M220,110 Q250,135 240,155 M280,110 Q250,135 260,155" fill="none" stroke="#ffffff" stroke-width="4" stroke-linecap="round" />
        <!-- Grain Motif -->
        <circle cx="250" cy="210" r="42" fill="#ffffff" fill-opacity="0.2" />
        <path d="M250,185 Q265,210 250,235 Q235,210 250,185 Z" fill="#ffffff" />
      `;
        case 'dal-bowl':
        case 'podi-pack':
            return `
        <!-- Bowl -->
        <path d="M140,160 L360,160 C360,260 310,300 250,300 C190,300 140,260 140,160 Z" fill="url(#packGrad)" />
        <ellipse cx="250" cy="160" rx="110" ry="25" fill="#ffffff" stroke="${gradient[0]}" stroke-width="4" />
        <!-- Lentils / Podi Fill -->
        <ellipse cx="250" cy="162" rx="100" ry="20" fill="${accentColor}" fill-opacity="0.8" />
        <circle cx="210" cy="160" r="5" fill="#ffffff" />
        <circle cx="240" cy="165" r="4" fill="#ffffff" />
        <circle cx="270" cy="158" r="6" fill="#ffffff" />
        <circle cx="290" cy="164" r="4" fill="#ffffff" />
      `;
        case 'oil-can':
        case 'coconut-oil':
        case 'care-bottle':
        case 'cleaning-bottle':
            return `
        <!-- Bottle Neck & Cap -->
        <rect x="230" y="80" width="40" height="35" rx="4" fill="${accentColor}" />
        <rect x="220" y="72" width="60" height="14" rx="4" fill="#ffffff" />
        <!-- Bottle Body -->
        <path d="M200,120 L300,120 C320,135 330,170 330,280 C330,300 310,310 250,310 C190,310 170,300 170,280 C170,170 180,135 200,120 Z" fill="url(#packGrad)" />
        <!-- Liquid Level Glass Shine -->
        <path d="M190,140 Q250,150 310,140 L315,280 Q250,295 185,280 Z" fill="url(#glossGrad)" />
        <circle cx="250" cy="215" r="30" fill="#ffffff" fill-opacity="0.3" />
        <!-- Drop Motif -->
        <path d="M250,195 Q265,220 250,230 Q235,220 250,195 Z" fill="#ffffff" />
      `;
        case 'ghee-jar':
        case 'pickle-jar':
            return `
        <!-- Jar Lid -->
        <rect x="200" y="85" width="100" height="30" rx="6" fill="${accentColor}" />
        <line x1="200" y1="100" x2="300" y2="100" stroke="#ffffff" stroke-width="2" />
        <!-- Jar Body -->
        <path d="M170,125 L330,125 C345,150 350,270 330,295 C310,305 190,305 170,295 C150,270 155,150 170,125 Z" fill="url(#packGrad)" />
        <!-- Jar Label Window -->
        <rect x="185" y="150" width="130" height="110" rx="10" fill="#ffffff" fill-opacity="0.25" />
        <circle cx="250" cy="205" r="28" fill="#ffffff" />
        <text x="250" y="212" font-family="'Segoe UI', sans-serif" font-weight="900" font-size="22" fill="${accentColor}" text-anchor="middle">★</text>
      `;
        case 'masala-pouch':
        case 'spice-powder':
        case 'whole-spice':
        case 'millet-pouch':
        case 'essential-pack':
        case 'instant-box':
            return `
        <!-- Sealed Pouch Envelope -->
        <path d="M160,95 L340,95 L360,295 C360,305 340,310 250,310 C160,310 140,305 140,295 Z" fill="url(#packGrad)" />
        <!-- Pouch Crimped Seals Top & Bottom -->
        <path d="M160,95 L340,95" stroke="#ffffff" stroke-width="6" stroke-dasharray="4,4" />
        <path d="M150,305 L350,305" stroke="${accentColor}" stroke-width="6" stroke-dasharray="4,4" />
        <!-- Central Spice Graphic -->
        <polygon points="250,150 285,185 285,235 250,270 215,235 215,185" fill="#ffffff" fill-opacity="0.2" />
        <circle cx="250" cy="210" r="25" fill="#ffffff" />
        <text x="250" y="218" font-family="'Segoe UI', sans-serif" font-weight="900" font-size="24" fill="${accentColor}" text-anchor="middle">✦</text>
      `;
        case 'biscuit-pack':
        case 'chips-bag':
        case 'snack-pack':
            return `
        <!-- Pillow Pack Container -->
        <path d="M140,110 C180,90 320,90 360,110 L370,280 C330,305 170,305 130,280 Z" fill="url(#packGrad)" />
        <!-- Side Serrated Edges -->
        <path d="M140,110 L130,280" stroke="#ffffff" stroke-width="4" stroke-dasharray="6,4" />
        <path d="M360,110 L370,280" stroke="#ffffff" stroke-width="4" stroke-dasharray="6,4" />
        <!-- Product Burst Graphic -->
        <circle cx="250" cy="195" r="45" fill="#ffffff" />
        <text x="250" y="204" font-family="'Segoe UI', sans-serif" font-weight="900" font-size="28" fill="${accentColor}" text-anchor="middle">CRUNCH</text>
      `;
        case 'sweet-box':
            return `
        <!-- Sweet Box Container -->
        <rect x="140" y="120" width="220" height="170" rx="16" fill="url(#packGrad)" />
        <!-- Gold Ribbon Cross -->
        <rect x="235" y="120" width="30" height="170" fill="#f59e0b" />
        <rect x="140" y="190" width="220" height="30" fill="#f59e0b" />
        <circle cx="250" cy="205" r="25" fill="#ffffff" />
        <text x="250" y="213" font-family="'Segoe UI', sans-serif" font-weight="900" font-size="20" fill="${accentColor}" text-anchor="middle">🍬</text>
      `;
        case 'bread-loaf':
        case 'cake-slice':
            return `
        <!-- Bakery Tray / Box -->
        <path d="M140,160 Q250,110 360,160 L350,285 Q250,305 150,285 Z" fill="url(#packGrad)" />
        <ellipse cx="250" cy="160" rx="110" ry="25" fill="#ffffff" fill-opacity="0.3" />
        <circle cx="250" cy="220" r="35" fill="#ffffff" />
        <text x="250" y="228" font-family="'Segoe UI', sans-serif" font-weight="900" font-size="28" fill="${accentColor}" text-anchor="middle">🍞</text>
      `;
        case 'tea-coffee':
        case 'beverage-pack':
            return `
        <!-- Can / Tin Box -->
        <rect x="170" y="110" width="160" height="185" rx="20" fill="url(#packGrad)" />
        <ellipse cx="250" cy="110" rx="80" ry="14" fill="#ffffff" stroke="${accentColor}" stroke-width="3" />
        <circle cx="250" cy="200" r="36" fill="#ffffff" />
        <text x="250" y="208" font-family="'Segoe UI', sans-serif" font-weight="900" font-size="28" fill="${accentColor}" text-anchor="middle">☕</text>
      `;
        case 'juice-bottle':
            return `
        <!-- Carton Box -->
        <polygon points="180,130 250,90 320,130 320,290 180,290" fill="url(#packGrad)" />
        <polygon points="180,130 250,90 250,290 180,290" fill="#ffffff" fill-opacity="0.15" />
        <circle cx="250" cy="200" r="32" fill="#ffffff" />
        <text x="250" y="208" font-family="'Segoe UI', sans-serif" font-weight="900" font-size="26" fill="${accentColor}" text-anchor="middle">🧃</text>
      `;
        case 'soap-bar':
            return `
        <!-- Soap Box -->
        <rect x="150" y="130" width="200" height="150" rx="18" fill="url(#packGrad)" />
        <rect x="170" y="150" width="160" height="110" rx="10" fill="#ffffff" fill-opacity="0.2" />
        <circle cx="250" cy="205" r="30" fill="#ffffff" />
        <text x="250" y="213" font-family="'Segoe UI', sans-serif" font-weight="900" font-size="24" fill="${accentColor}" text-anchor="middle">🧼</text>
      `;
        default:
            return `
        <rect x="160" y="110" width="180" height="180" rx="24" fill="url(#packGrad)" />
        <circle cx="250" cy="200" r="40" fill="#ffffff" />
        <text x="250" y="210" font-family="'Segoe UI', sans-serif" font-weight="900" font-size="32" fill="${accentColor}" text-anchor="middle">📦</text>
      `;
    }
}
