import { readFileSync,mkdirSync,writeFileSync,existsSync } from 'node:fs';
import { resolve,join } from 'node:path';
import { assert } from './domain.js';
const [file,destination]=process.argv.slice(2);
assert(file&&destination,'Uso: node src/export-content.js conteudo.json pasta-de-destino');
const content=JSON.parse(readFileSync(resolve(file),'utf8'));
assert(content.format==='reuma-revisa-conteudos'&&content.schema===1,'Use uma exportação de conteúdo, não um backup pessoal.');
const base=resolve(destination);assert(!existsSync(base),'Escolha uma pasta nova para não sobrescrever exportações anteriores.');
mkdirSync(base,{recursive:true});
for(const [slug,records] of Object.entries(content.areas)){assert(/^[a-z0-9-]+$/.test(slug),'Área inválida.');const dir=join(base,slug);mkdirSync(dir,{recursive:true});for(const key of ['questoes','notas','objetivos'])writeFileSync(join(dir,key+'.json'),JSON.stringify(records[key],null,2)+'\n');}
writeFileSync(join(base,'vinculos.json'),JSON.stringify(content.vinculos,null,2)+'\n');
console.log('Conteúdos separados por área. Revise informações pessoais antes de incluir no Git.');
