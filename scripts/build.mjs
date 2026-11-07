// Static site: copy site/ to dist/ (Vercel serves dist, functions live in api/).
import { cpSync, rmSync } from 'node:fs';
rmSync('dist', { recursive: true, force: true });
cpSync('site', 'dist', { recursive: true });
console.log('Built dist/');
