import fs from 'fs';

const buf = fs.readFileSync('assets/images/icon.png');
const width = buf.readUInt32BE(16);
const height = buf.readUInt32BE(20);
const bitDepth = buf[24];
const colorType = buf[25];
console.log('Width:', width);
console.log('Height:', height);
console.log('Bit depth:', bitDepth);
console.log('Color type:', colorType, '(2=RGB no-alpha = GOOD, 6=RGBA = BAD)');
console.log('File size:', buf.length, 'bytes');
