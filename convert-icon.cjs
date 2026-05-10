const { imagesToIco } = require('png-to-ico');
const Jimp = require('jimp');
const fs = require('fs');
const path = require('path');

async function convert() {
  const img = await Jimp.read(path.join(__dirname, 'public/icon.png'));
  await img.resize(256, 256);
  const pngBuf = await img.getBufferAsync(Jimp.MIME_PNG);
  const icoBuf = await imagesToIco([pngBuf]);
  fs.writeFileSync(path.join(__dirname, 'public/icon.ico'), icoBuf);
  console.log('icon.ico created successfully');
}

convert().catch(console.error);
