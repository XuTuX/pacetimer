const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const ASSETS_DIR = path.join(__dirname, '../assets/images');

// Ensure directory exists
if (!fs.existsSync(ASSETS_DIR)) {
  fs.mkdirSync(ASSETS_DIR, { recursive: true });
}

// App theme colors
const PRIMARY = '#6366F1';
const PRIMARY_DARK = '#4F46E5';
const PRIMARY_LIGHT = '#818CF8';
const ACCENT = '#F43F5E';
const ACCENT_LIGHT = '#FB7185';

const SVG_FOREGROUND = `
<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="lineGrad1" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#6366F1;stop-opacity:0.3" />
      <stop offset="50%" style="stop-color:#6366F1;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#6366F1;stop-opacity:0.3" />
    </linearGradient>
    <linearGradient id="lineGrad2" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#F43F5E;stop-opacity:0.3" />
      <stop offset="50%" style="stop-color:#F43F5E;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#F43F5E;stop-opacity:0.3" />
    </linearGradient>
    <linearGradient id="lineGrad3" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#818CF8;stop-opacity:0.2" />
      <stop offset="50%" style="stop-color:#818CF8;stop-opacity:0.8" />
      <stop offset="100%" style="stop-color:#818CF8;stop-opacity:0.2" />
    </linearGradient>
  </defs>
  
  <g transform="translate(512, 512)">
    <!-- Dynamic flowing lines representing pace/rhythm -->
    
    <!-- Top wave curve (primary) -->
    <path d="M -350,-180 Q -250,-200 -150,-180 T 50,-180 T 250,-180 T 350,-160" 
          fill="none" stroke="url(#lineGrad1)" stroke-width="28" stroke-linecap="round" opacity="0.9"/>
    
    <!-- Middle accent wave (accent color) -->
    <path d="M -380,-40 Q -280,-10 -180,-40 T 20,-40 T 220,-40 T 380,-20" 
          fill="none" stroke="url(#lineGrad2)" stroke-width="32" stroke-linecap="round" opacity="0.95"/>
    
    <!-- Lower supporting wave -->
    <path d="M -350,100 Q -250,80 -150,100 T 50,100 T 250,100 T 350,120" 
          fill="none" stroke="url(#lineGrad3)" stroke-width="24" stroke-linecap="round" opacity="0.7"/>
    
    <!-- Geometric accent elements -->
    <!-- Left accent bars -->
    <g opacity="0.85">
      <rect x="-360" y="-90" width="8" height="120" rx="4" fill="${PRIMARY}"/>
      <rect x="-340" y="-70" width="6" height="80" rx="3" fill="${PRIMARY_LIGHT}" opacity="0.6"/>
    </g>
    
    <!-- Right accent bars -->
    <g opacity="0.85">
      <rect x="352" y="-70" width="8" height="120" rx="4" fill="${ACCENT}"/>
      <rect x="334" y="-50" width="6" height="80" rx="3" fill="${ACCENT_LIGHT}" opacity="0.6"/>
    </g>
    
    <!-- Central focal point - abstract "P" shape -->
    <g>
      <!-- Vertical stem -->
      <rect x="-22" y="-150" width="44" height="320" rx="22" fill="white" opacity="0.95"/>
      
      <!-- Circular top (P shape) -->
      <circle cx="0" cy="-90" r="90" fill="white" opacity="0.95"/>
      
      <!-- Inner cut to form P -->
      <circle cx="0" cy="-90" r="50" fill="${PRIMARY}"/>
      <circle cx="0" cy="-90" r="32" fill="white" opacity="0.9"/>
      
      <!-- Accent dot -->
      <circle cx="0" cy="-90" r="14" fill="${ACCENT}"/>
    </g>
    
    <!-- Subtle connecting dots -->
    <g fill="${PRIMARY}" opacity="0.4">
      <circle cx="-250" cy="-180" r="6"/>
      <circle cx="-50" cy="-180" r="6"/>
      <circle cx="150" cy="-180" r="6"/>
      
      <circle cx="-280" cy="-40" r="7"/>
      <circle cx="-80" cy="-40" r="7"/>
      <circle cx="120" cy="-40" r="7"/>
      
      <circle cx="-250" cy="100" r="5"/>
      <circle cx="-50" cy="100" r="5"/>
      <circle cx="150" cy="100" r="5"/>
    </g>
    
    <!-- Bottom subtle baseline -->
    <line x1="-300" y1="200" x2="300" y2="200" stroke="white" stroke-width="4" opacity="0.3" stroke-linecap="round"/>
  </g>
</svg>
`;

const SVG_BACKGROUND = `
<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#5B5FC0;stop-opacity:1" />
      <stop offset="50%" style="stop-color:#6366F1;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#7C7FFF;stop-opacity:1" />
    </linearGradient>
    <radialGradient id="centerGlow" cx="50%" cy="45%">
      <stop offset="0%" style="stop-color:#FFFFFF;stop-opacity:0.25" />
      <stop offset="50%" style="stop-color:#FFFFFF;stop-opacity:0.1" />
      <stop offset="100%" style="stop-color:#FFFFFF;stop-opacity:0" />
    </radialGradient>
    <radialGradient id="accentGlow" cx="75%" cy="75%">
      <stop offset="0%" style="stop-color:#F43F5E;stop-opacity:0.12" />
      <stop offset="100%" style="stop-color:#F43F5E;stop-opacity:0" />
    </radialGradient>
  </defs>
  
  <rect width="1024" height="1024" fill="url(#bgGrad)" />
  <circle cx="512" cy="460" r="450" fill="url(#centerGlow)" />
  <circle cx="768" cy="768" r="300" fill="url(#accentGlow)" />
</svg>
`;

// Composite for Main Icon
const SVG_COMPOSITE = `
<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#5B5FC0;stop-opacity:1" />
      <stop offset="50%" style="stop-color:#6366F1;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#7C7FFF;stop-opacity:1" />
    </linearGradient>
    <radialGradient id="centerGlow" cx="50%" cy="45%">
      <stop offset="0%" style="stop-color:#FFFFFF;stop-opacity:0.25" />
      <stop offset="50%" style="stop-color:#FFFFFF;stop-opacity:0.1" />
      <stop offset="100%" style="stop-color:#FFFFFF;stop-opacity:0" />
    </radialGradient>
    <radialGradient id="accentGlow" cx="75%" cy="75%">
      <stop offset="0%" style="stop-color:#F43F5E;stop-opacity:0.12" />
      <stop offset="100%" style="stop-color:#F43F5E;stop-opacity:0" />
    </radialGradient>
    <linearGradient id="lineGrad1" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#6366F1;stop-opacity:0.3" />
      <stop offset="50%" style="stop-color:#6366F1;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#6366F1;stop-opacity:0.3" />
    </linearGradient>
    <linearGradient id="lineGrad2" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#F43F5E;stop-opacity:0.3" />
      <stop offset="50%" style="stop-color:#F43F5E;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#F43F5E;stop-opacity:0.3" />
    </linearGradient>
    <linearGradient id="lineGrad3" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#818CF8;stop-opacity:0.2" />
      <stop offset="50%" style="stop-color:#818CF8;stop-opacity:0.8" />
      <stop offset="100%" style="stop-color:#818CF8;stop-opacity:0.2" />
    </linearGradient>
  </defs>
  
  <!-- Background -->
  <rect width="1024" height="1024" fill="url(#bgGrad)" />
  <circle cx="512" cy="460" r="450" fill="url(#centerGlow)" />
  <circle cx="768" cy="768" r="300" fill="url(#accentGlow)" />
  
  <!-- Foreground -->
  <g transform="translate(512, 512)">
    <!-- Dynamic flowing lines -->
    <path d="M -350,-180 Q -250,-200 -150,-180 T 50,-180 T 250,-180 T 350,-160" 
          fill="none" stroke="url(#lineGrad1)" stroke-width="28" stroke-linecap="round" opacity="0.9"/>
    <path d="M -380,-40 Q -280,-10 -180,-40 T 20,-40 T 220,-40 T 380,-20" 
          fill="none" stroke="url(#lineGrad2)" stroke-width="32" stroke-linecap="round" opacity="0.95"/>
    <path d="M -350,100 Q -250,80 -150,100 T 50,100 T 250,100 T 350,120" 
          fill="none" stroke="url(#lineGrad3)" stroke-width="24" stroke-linecap="round" opacity="0.7"/>
    
    <!-- Accent bars -->
    <g opacity="0.85">
      <rect x="-360" y="-90" width="8" height="120" rx="4" fill="${PRIMARY}"/>
      <rect x="-340" y="-70" width="6" height="80" rx="3" fill="${PRIMARY_LIGHT}" opacity="0.6"/>
    </g>
    <g opacity="0.85">
      <rect x="352" y="-70" width="8" height="120" rx="4" fill="${ACCENT}"/>
      <rect x="334" y="-50" width="6" height="80" rx="3" fill="${ACCENT_LIGHT}" opacity="0.6"/>
    </g>
    
    <!-- Central P shape -->
    <g>
      <rect x="-22" y="-150" width="44" height="320" rx="22" fill="white" opacity="0.95"/>
      <circle cx="0" cy="-90" r="90" fill="white" opacity="0.95"/>
      <circle cx="0" cy="-90" r="50" fill="${PRIMARY}"/>
      <circle cx="0" cy="-90" r="32" fill="white" opacity="0.9"/>
      <circle cx="0" cy="-90" r="14" fill="${ACCENT}"/>
    </g>
    
    <!-- Connecting dots -->
    <g fill="${PRIMARY}" opacity="0.4">
      <circle cx="-250" cy="-180" r="6"/>
      <circle cx="-50" cy="-180" r="6"/>
      <circle cx="150" cy="-180" r="6"/>
      <circle cx="-280" cy="-40" r="7"/>
      <circle cx="-80" cy="-40" r="7"/>
      <circle cx="120" cy="-40" r="7"/>
      <circle cx="-250" cy="100" r="5"/>
      <circle cx="-50" cy="100" r="5"/>
      <circle cx="150" cy="100" r="5"/>
    </g>
    
    <!-- Baseline -->
    <line x1="-300" y1="200" x2="300" y2="200" stroke="white" stroke-width="4" opacity="0.3" stroke-linecap="round"/>
  </g>
</svg>
`;

async function generate() {
  console.log('🎨 Creating abstract line-based icon...');

  await sharp(Buffer.from(SVG_COMPOSITE))
    .png()
    .resize(1024, 1024)
    .toFile(path.join(ASSETS_DIR, 'icon.png'));
  console.log('✅ icon.png');

  await sharp(Buffer.from(SVG_FOREGROUND))
    .png()
    .resize(1024, 1024)
    .toFile(path.join(ASSETS_DIR, 'android-icon-foreground.png'));
  console.log('✅ android-icon-foreground.png');

  await sharp(Buffer.from(SVG_BACKGROUND))
    .png()
    .resize(1024, 1024)
    .toFile(path.join(ASSETS_DIR, 'android-icon-background.png'));
  console.log('✅ android-icon-background.png');

  await sharp(Buffer.from(SVG_FOREGROUND))
    .png()
    .resize(1024, 1024)
    .toFile(path.join(ASSETS_DIR, 'android-icon-monochrome.png'));
  console.log('✅ android-icon-monochrome.png');

  await sharp(Buffer.from(SVG_COMPOSITE))
    .png()
    .resize(48, 48)
    .toFile(path.join(ASSETS_DIR, 'favicon.png'));
  console.log('✅ favicon.png');

  console.log('\n✨ Abstract rhythm-based icon complete!');
}

generate().catch(err => console.error(err));
