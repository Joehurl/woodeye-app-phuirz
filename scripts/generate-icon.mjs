import sharp from 'sharp';
import fs from 'fs';

const src = 'assets/images/dc9409f7-d8fd-4190-92e1-5e06cb7ce44b.jpeg';

async function generate() {
  const pipeline = sharp(src)
    .resize(1024, 1024, { fit: 'cover' })
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .png({ compressionLevel: 9 });

  const buf = await pipeline.toBuffer();

  fs.writeFileSync('assets/images/icon.png', buf);
  fs.writeFileSync('assets/images/adaptive-icon.png', buf);

  // Verify color type byte at offset 25
  const colorType = buf[25];
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  console.log('icon.png written');
  console.log('  Width:', width, '  Height:', height);
  console.log('  Color type:', colorType, colorType === 2 ? '(RGB - GOOD, no alpha)' : '(WARNING: unexpected)');
  console.log('  File size:', buf.length, 'bytes');
}

generate().catch(err => { console.error(err); process.exit(1); });
