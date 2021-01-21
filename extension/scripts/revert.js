const FS = require('fs');
const Path = require('path');
const pkgFile = Path.resolve(__dirname, '../package.json');
const bakFile = Path.resolve(__dirname, '../package.bak.json');
const contents = FS.readFileSync(bakFile, 'utf-8');

FS.writeFileSync(pkgFile, contents);
