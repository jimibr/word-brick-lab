import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';

const root=resolve(import.meta.dirname,'..');
const lock=JSON.parse(readFileSync(resolve(root,'package-lock.json'),'utf8'));
const rows=[];

for(const [relative,entry] of Object.entries(lock.packages??{})){
  if(!relative.startsWith('node_modules/')||!entry.version)continue;
  try{
    const metadata=JSON.parse(readFileSync(resolve(root,relative,'package.json'),'utf8'));
    rows.push({name:metadata.name??relative.replace(/^.*node_modules\//,''),version:entry.version,license:typeof metadata.license==='string'?metadata.license:'UNDECLARED',scope:entry.dev?'development':'runtime'});
  }catch{
    // Optional packages for other operating systems are not installed and are omitted.
  }
}

rows.sort((a,b)=>a.scope.localeCompare(b.scope)||a.name.localeCompare(b.name)||a.version.localeCompare(b.version));
const counts=new Map();
for(const row of rows)counts.set(row.license,(counts.get(row.license)??0)+1);
const lines=['# Installed dependency licenses','',`Generated from \`package-lock.json\` on ${new Date().toISOString().slice(0,10)}. Optional packages not installed on this platform are omitted.`,'','## Summary','','| License expression | Packages |','|---|---:|',...[...counts].sort((a,b)=>b[1]-a[1]).map(([license,count])=>`| ${license} | ${count} |`),'','## Packages','','| Scope | Package | Version | Declared license |','|---|---|---:|---|',...rows.map(row=>`| ${row.scope} | ${row.name.replaceAll('|','\\|')} | ${row.version} | ${row.license.replaceAll('|','\\|')} |`),'','The project license and the full notice for bundled MgOpen-derived font data are in `LICENSE` and `THIRD_PARTY_NOTICES.md`.',''];
writeFileSync(resolve(root,'docs/dependency-licenses.md'),lines.join('\n'));
