import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const SOURCE = './public/favicon/favicon.png';
const OUTPUT_DIR = './public/favicon';

const sizes = [
    { name: 'pwa-192x192.png', size: 192 },
    { name: 'pwa-512x512.png', size: 512 },
    { name: 'pwa-maskable-192x192.png', size: 192, maskable: true },
    { name: 'pwa-maskable-512x512.png', size: 512, maskable: true },
    { name: 'apple-touch-icon.png', size: 180 },
];

async function generateIcons() {
    console.log('🚀 Generating PWA icons...\n');

    for (const { name, size, maskable } of sizes) {
        const outputPath = path.join(OUTPUT_DIR, name);

        if (maskable) {
            // For maskable icons, add padding (safe zone is 80% of icon)
            const padding = Math.floor(size * 0.1);
            const innerSize = size - padding * 2;

            await sharp(SOURCE)
                .resize(innerSize, innerSize, { fit: 'contain', background: { r: 10, g: 10, b: 15, alpha: 1 } })
                .extend({
                    top: padding,
                    bottom: padding,
                    left: padding,
                    right: padding,
                    background: { r: 10, g: 10, b: 15, alpha: 1 } // #0a0a0f
                })
                .png()
                .toFile(outputPath);
        } else {
            await sharp(SOURCE)
                .resize(size, size, { fit: 'contain', background: { r: 10, g: 10, b: 15, alpha: 1 } })
                .png()
                .toFile(outputPath);
        }

        console.log(`✓ Generated ${name} (${size}x${size})`);
    }

    console.log('\n✅ All PWA icons generated successfully!');
}

generateIcons().catch(console.error);
