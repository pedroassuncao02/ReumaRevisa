import { createHash, randomUUID } from 'node:crypto';
export const id = () => randomUUID();
export const now = () => new Date().toISOString();
export const AREAS = ['Artrite reumatoide','Espondiloartrites e artrite psoriásica','Lúpus e síndrome antifosfolípide','Síndrome de Sjögren','Esclerose sistêmica','Miopatias inflamatórias','Vasculites','Artrites por cristais','Osteoartrite','Osteoporose e metabolismo ósseo','Reumatologia pediátrica','Doenças autoinflamatórias','Dor musculoesquelética e fibromialgia','Infecções e diagnósticos diferenciais','Farmacologia e terapêutica','Outros temas'];
export class AppError extends Error { constructor(message,status=400,details={}) { super(message);this.status=status;this.details=details; } }
export function assert(ok,message,status=400,details={}) { if(!ok) throw new AppError(message,status,details); }
export function norm(s='') { return s.normalize('NFKC').toLocaleLowerCase('pt-BR').replace(/\s+/g,' ').trim(); }
export function splitQuestion(raw) {
 const m = /(?:^|\n)\s*(?:gabarito|resposta correta|coment[aá]rio|resolu[cç][aã]o)\s*[:\-–]/im.exec(raw);
 return { core: (m?raw.slice(0,m.index):raw).trim(), commentary:m?raw.slice(m.index).trim():'' };
}
export function canonical(raw) {
 const {core}=splitQuestion(raw);
 return norm(core.replace(/^\s*(?:quest[aã]o\s*)?\d+[.)\-:]\s+/i,'').replace(/(^|\s)\s*(?:\([a-eA-E]\)|[a-eA-E][).:]|[1-5][).])\s+/g,'$1').replace(/(^|\n)\s*[a-eA-E]\s*[-–]\s*/g,'$1').replace(/[\*_`]/g,''));
}
export const fingerprint = raw => createHash('sha256').update(canonical(raw)).digest('hex');
export const objectiveKey = o => createHash('sha256').update([o.entity,o.aspect,o.conditions,o.answer].map(norm).join('|')).digest('hex');
export function similarity(a,b) {const x=new Set(norm(a).match(/[\p{L}\p{N}]+/gu)||[]),y=new Set(norm(b).match(/[\p{L}\p{N}]+/gu)||[]);return [...x].filter(t=>y.has(t)).length/Math.max(1,new Set([...x,...y]).size);}
export const fields = ['entity','aspect','conditions','question','answer','evidence','area'];
export function validateObjective(o,raw,areas) {
 assert(o && fields.every(k=>typeof o[k]==='string' && o[k].length<12000),'Objetivo inválido recebido da IA.');
 assert(o.entity.trim()&&o.question.trim()&&o.answer.trim(),'Objetivo incompleto.');
 assert(Array.isArray(o.tags)&&o.tags.every(t=>typeof t==='string'),'Etiquetas inválidas.');
 if(!areas.includes(o.area)) o.area='Outros temas';
 return !o.evidence.trim()||!norm(raw).includes(norm(o.evidence))?['Trecho de evidência ausente na fonte.']:[];
}
export function validateNote(n,o,raw) {
 const alerts=[];
 if(!['basic','cloze'].includes(n.type)||typeof n.front!=='string'||typeof n.back!=='string'||typeof n.explanation!=='string') throw new AppError('Formato de cartão inválido.');
 if(!n.front.trim()||!n.back.trim()) alerts.push('Frente e resposta são obrigatórias.');
 if(!o.evidence.trim()||!norm(raw).includes(norm(o.evidence))) alerts.push('Trecho de evidência ausente na fonte.');
 if(/neste caso|paciente acima|questão acima/i.test(n.front)) alerts.push('O cartão depende da questão original.');
 if(n.type==='cloze') {
  const matches=[...n.front.matchAll(/\{\{c(\d+)::([^{}]*?)\}\}/g)];
  const visible=n.front.replace(/\{\{c\d+::[^{}]*?\}\}/g,'');
  if(matches.length!==1||matches[0]?.[1]!=='1'||visible.includes('{{')||visible.includes('}}')) alerts.push('Use exatamente uma oclusão {{c1::termo}} por nota.');
  const target=matches[0]?.[2]||'';
  if(!target.trim()) alerts.push('Oclusão vazia.');
  if(norm(target)!==norm(o.answer)) alerts.push('A oclusão deve conter a resposta-alvo completa.');
  if(target.split(/\s+/).length>5) alerts.push('Oclusão longa: revise a necessidade de cada palavra.');
  if(target.length/Math.max(1,n.front.length-8)>.4) alerts.push('Proporção oculta elevada.');
  if(visible.trim().split(/\s+/).length<4) alerts.push('Contexto visível insuficiente.');
  if(target && norm(visible).includes(norm(target))) alerts.push('A resposta está repetida no texto visível.');
  if(/^(é|apresenta|porque|pois|e|ou|do|da|um|uma)$/i.test(target)||/^(é |apresenta |é caracterizado por )/i.test(target)) alerts.push('Oculte apenas o termo central.');
 } else if(/\{\{|\}\}/.test(n.front)) alerts.push('Cartão simples não deve conter sintaxe cloze.');
 return [...new Set(alerts)];
}
export function dateKey(date,tz='America/Sao_Paulo') {return new Intl.DateTimeFormat('en-CA',{timeZone:tz,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(date));}
export const slug=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
