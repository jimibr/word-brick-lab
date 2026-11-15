import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { Plugin } from 'vite';

export function distributionLicenses(): Plugin {
  return {
    name: 'distribution-licenses',
    apply: 'build',
    generateBundle() {
      const root = resolve(import.meta.dirname, '..');
      const lock = JSON.parse(readFileSync(join(root, 'package-lock.json'), 'utf8')) as {
        packages: Record<string, { dev?: boolean }>;
      };

      for (const fileName of ['LICENSE', 'THIRD_PARTY_NOTICES.md']) {
        this.emitFile({ type: 'asset', fileName, source: readFileSync(join(root, fileName)) });
      }

      for (const [path, entry] of Object.entries(lock.packages)) {
        if (!path.startsWith('node_modules/') || entry.dev) continue;
        const directory = join(root, path);
        if (!existsSync(directory)) continue;

        const notices = readdirSync(directory, { withFileTypes: true }).filter(
          (file) => file.isFile() && /^(licen[cs]e|copying|notice|copyright)([.-]|$)/i.test(file.name),
        );
        for (const { name } of notices) {
          this.emitFile({
            type: 'asset',
            fileName: `licenses/${path}/${name}`,
            source: readFileSync(join(directory, name)),
          });
        }
      }
    },
  };
}
