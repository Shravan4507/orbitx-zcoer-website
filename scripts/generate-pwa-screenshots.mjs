import sharp from 'sharp';
import path from 'path';

const OUTPUT_DIR = './public/favicon';

// Create gradient screenshots for PWA install prompt
async function generateScreenshots() {
    console.log('🖼️ Generating PWA screenshots...\n');

    // Wide screenshot (1280x720)
    const wideWidth = 1280;
    const wideHeight = 720;

    // Create a gradient background with OrbitX branding
    const wideGradient = Buffer.from(`
    <svg width="${wideWidth}" height="${wideHeight}">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#0a0a0f"/>
          <stop offset="50%" style="stop-color:#1a1a2e"/>
          <stop offset="100%" style="stop-color:#0a0a0f"/>
        </linearGradient>
        <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" style="stop-color:#a94eff"/>
          <stop offset="100%" style="stop-color:#3b82f6"/>
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#bg)"/>
      <circle cx="640" cy="200" r="80" fill="url(#accent)" opacity="0.3"/>
      <text x="640" y="380" font-family="Arial, sans-serif" font-size="72" font-weight="bold" fill="url(#accent)" text-anchor="middle">OrbitX</text>
      <text x="640" y="450" font-family="Arial, sans-serif" font-size="24" fill="#ffffff" opacity="0.7" text-anchor="middle">Space &amp; Astronomy Club</text>
      <text x="640" y="550" font-family="Arial, sans-serif" font-size="18" fill="#ffffff" opacity="0.5" text-anchor="middle">Explore • Innovate • Learn</text>
    </svg>
  `);

    await sharp(wideGradient)
        .png()
        .toFile(path.join(OUTPUT_DIR, 'screenshot-wide.png'));

    console.log('✓ Generated screenshot-wide.png (1280x720)');

    // Narrow screenshot (720x1280)
    const narrowWidth = 720;
    const narrowHeight = 1280;

    const narrowGradient = Buffer.from(`
    <svg width="${narrowWidth}" height="${narrowHeight}">
      <defs>
        <linearGradient id="bg2" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#0a0a0f"/>
          <stop offset="50%" style="stop-color:#1a1a2e"/>
          <stop offset="100%" style="stop-color:#0a0a0f"/>
        </linearGradient>
        <linearGradient id="accent2" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" style="stop-color:#a94eff"/>
          <stop offset="100%" style="stop-color:#3b82f6"/>
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#bg2)"/>
      <circle cx="360" cy="400" r="100" fill="url(#accent2)" opacity="0.3"/>
      <text x="360" y="620" font-family="Arial, sans-serif" font-size="64" font-weight="bold" fill="url(#accent2)" text-anchor="middle">OrbitX</text>
      <text x="360" y="700" font-family="Arial, sans-serif" font-size="22" fill="#ffffff" opacity="0.7" text-anchor="middle">Space &amp; Astronomy Club</text>
      <text x="360" y="800" font-family="Arial, sans-serif" font-size="16" fill="#ffffff" opacity="0.5" text-anchor="middle">Explore • Innovate • Learn</text>
    </svg>
  `);

    await sharp(narrowGradient)
        .png()
        .toFile(path.join(OUTPUT_DIR, 'screenshot-narrow.png'));

    console.log('✓ Generated screenshot-narrow.png (720x1280)');

    console.log('\n✅ All PWA screenshots generated successfully!');
}

generateScreenshots().catch(console.error);
