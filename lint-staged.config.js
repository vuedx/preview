module.exports = {
  '**/*.{ts,mjs,cjs,js,vue}': ['eslint --quiet --fix --cache', 'prettier --write'],
  '*.{css,md}': ['prettier --write'],
  '**/*.{json,graphql}': ['prettier --write'],
  '.github/**/*.yaml': [
    'node scripts/prepare-workflows.mjs',
    'git add .github/workflows',
    'prettier --write',
  ],
};
