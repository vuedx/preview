const FS = require('fs');
const Path = require('path');
const pkgFile = Path.resolve(__dirname, '../package.json');
const contents = FS.readFileSync(pkgFile, 'utf-8');

FS.writeFileSync(Path.resolve(__dirname, '../package.bak.json'), contents);

const pkg = JSON.parse(contents);

if (process.env.RELEASE_CHANNEL === 'insiders') {
  const today = new Date();
  pkg.name += '-insiders';
  pkg.displayName += ' (Insiders)';
  pkg.version = `${today.getFullYear()}.${today.getMonth() + 1}.${today.getDate()}0${Math.floor(
    today.getTime() % 86400
  )}`;
}

delete pkg.devDependencies;
delete pkg.scripts;

FS.writeFileSync(pkgFile, JSON.stringify(pkg, null, 2));
