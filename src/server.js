import { createServer } from 'node:http';
import { readFileSync,writeFileSync,mkdirSync } from 'node:fs';
import { resolve,join,dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import { Store } from './store.js';
import { AI } from './ai.js';
import { Service } from './service.js';
import { assert,id,now,slug } from './domain.js';
import { statistics,csv,anki } from './stats.js';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
export function makeApp({store,ai,dataDir=resolve(root,process.env.DATA_DIR||'data')}={}){
 const s=store||new Store(join(dataDir,'reuma.sqlite')),service=new Service(s,ai||new AI()),token=randomBytes(32).toString('hex');
 // Jobs interrupted by a process shutdown are visible and retryable.
 for(const j of s.all('jobs'))if(j.status==='running'){j.status='failed';j.error='Processamento interrompido. Reabra a questão e tente novamente.';s.update('jobs',j);}
 async function handler(req,res){const url=new URL(req.url,'http://localhost'),path=url.pathname;
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
  function send(value,status=200,type='application/json; charset=utf-8'){res.writeHead(status,{'Content-Type':type});res.end(type.startsWith('application/json')?JSON.stringify(value):value);}
  try{
      const requestHost=req.headers.host||'';
   const localHost=/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(requestHost);
   const codespacesHost=process.env.CODESPACES==='true'&&/^[-a-z0-9]+-3210\.(?:app\.github\.dev|githubpreview\.dev)$/i.test(requestHost);
   assert(localHost||codespacesHost,'Acesso permitido somente por localhost ou pelo Codespace privado.',403);
   if(req.method==='GET'&&!path.startsWith('/api/')){const files={'/':'index.html','/app.js':'app.js','/style.css':'style.css'};assert(files[path],'Página não encontrada.',404);return send(readFileSync(join(root,'public',files[path])),200,path.endsWith('.js')?'text/javascript':path.endsWith('.css')?'text/css':'text/html; charset=utf-8');}
   let body={};if(req.method!=='GET'){assert(req.headers['x-csrf-token']===token,'Sessão expirada. Atualize a página.',403);const origin=req.headers.origin;const originAllowed=!origin||process.env.CODESPACES==='true'||origin===`${codespacesHost ? "https" : "http"}://${requestHost}`;assert(originAllowed,'Origem não permitida.',403);let chunks='',size=0;for await(const c of req){size+=c.length;assert(size<25*1024*1024,'Arquivo muito grande.');chunks+=c;}try{body=chunks?JSON.parse(chunks):{};}catch{assert(false,'JSON inválido.');}}
   if(path==='/api/state'&&req.method==='GET')return send({token,ai:{enabled:service.ai.enabled,provider:'OpenAI',model:service.ai.model},areas:s.meta('areas'),settings:s.meta('settings'),questions:s.all('questions'),notes:s.all('notes'),objectives:s.all('objectives'),links:s.all('links'),reports:s.all('reports'),versions:s.all('versions'),merges:s.all('merges'),queue:service.queue(),stats:statistics(s)});
   if(path==='/api/submit'&&req.method==='POST'){
    assert(typeof body.requestId==='string'&&body.requestId.length>=10,'Identificador do envio ausente.');const old=s.get('jobs',body.requestId);if(old)return send(old);
    const job={id:body.requestId,status:'running',createdAt:now()};s.put('jobs',job);
    service.submit(body).then(result=>{job.status='done';job.result=result;s.update('jobs',job);}).catch(e=>{job.status='failed';job.error=e.message;s.update('jobs',job);});return send(job,202);
   }
   if(path.startsWith('/api/jobs/')&&req.method==='GET'){const j=s.get('jobs',path.split('/').pop());assert(j,'Processamento não encontrado.',404);return send(j);}
   if(path==='/api/manual-import'&&req.method==='POST')return send(await service.manualImport(body.id,body.response));
   if(path==='/api/manual-note'&&req.method==='POST')return send(await service.manualNote(body.id,body.candidateId,body.response));
   if(path==='/api/manual-review'&&req.method==='POST')return send(service.manualReview(body.id,body.response));
   if(path==='/api/analyze'&&req.method==='POST')return send(await service.serialize(()=>service.analyze(body.id)));
   if(path==='/api/attempt'&&req.method==='POST')return send(service.attempt(body.id,body.outcome));
   if(path==='/api/edit'&&req.method==='POST')return send(await service.edit(body.id,body));
   if(path==='/api/approve'&&req.method==='POST')return send(service.approve(body.ids,body.resolution));
   if(path==='/api/note-state'&&req.method==='POST')return send(service.state(body.id,body.status,body.reason));
   if(path==='/api/link'&&req.method==='POST')return send(service.link(body.id,body.target));
   if(path==='/api/review'&&req.method==='POST')return send(service.review(body));
   if(path==='/api/undo'&&req.method==='POST')return send(service.undo());
   if(path==='/api/report'&&req.method==='POST')return send(service.report(body.id,body.type,body.detail,body.suspend));
   if(path==='/api/report-resolve'&&req.method==='POST'){const r=s.get('reports',body.id);assert(r,'Relato não encontrado.');r.status='resolved';r.resolution=body.resolution||'';return send(s.update('reports',r));}
   if(path==='/api/version'&&req.method==='POST')return send(service.restoreVersion(body.id));
   if(path==='/api/audit'&&req.method==='POST')return send(await service.serialize(()=>service.audit()));
   if(path==='/api/merge'&&req.method==='POST')return send(service.merge(body.keepId,body.retireId,body.reason));
   if(path==='/api/undo-merge'&&req.method==='POST')return send(service.undoMerge(body.id));
   if(path==='/api/change-objective'&&req.method==='POST')return send(await service.changeObjective(body.id,body));
   if(path==='/api/settings'&&req.method==='POST'){assert(body.retention>=.7&&body.retention<=.97,'Retenção deve ficar entre 70% e 97%.');assert(Number.isInteger(body.newLimit)&&body.newLimit>=0&&body.newLimit<=1000,'Limite diário inválido.');assert(Number.isInteger(body.leechThreshold)&&body.leechThreshold>=2&&body.leechThreshold<=50,'Limiar inválido.');try{new Intl.DateTimeFormat('pt-BR',{timeZone:body.timezone}).format();}catch{assert(false,'Fuso horário inválido.');}s.setMeta('settings',{retention:body.retention,newLimit:body.newLimit,timezone:body.timezone,leechThreshold:body.leechThreshold});return send({ok:true});}
   if(path==='/api/areas'&&req.method==='POST'){assert(typeof body.name==='string'&&body.name.trim(),'Informe uma área.');const areas=s.meta('areas');assert(!areas.includes(body.name),'Área já existente.');if(body.old){assert(body.old!=='Outros temas','A área de fallback não pode ser renomeada.');assert(areas.includes(body.old),'Área ausente.');s.tx(()=>{s.setMeta('areas',areas.map(a=>a===body.old?body.name:a));for(const t of ['questions','notes','objectives'])for(const x of s.all(t))if(x.area===body.old){x.area=body.name;s.update(t,x);}});}else s.setMeta('areas',[...areas,body.name]);return send({ok:true});}
   if(path==='/api/stats'&&req.method==='GET')return send(statistics(s,Object.fromEntries(url.searchParams)));
   if(path==='/api/export/csv'&&req.method==='GET')return send(csv(statistics(s,Object.fromEntries(url.searchParams))),200,'text/csv; charset=utf-8');
   if(path==='/api/export/backup'&&req.method==='GET')return send(s.snapshot());
   if(path==='/api/export/content'&&req.method==='GET'){const areas=s.meta('areas');const content={format:'reuma-revisa-conteudos',schema:1,areas:Object.fromEntries(areas.map(a=>[slug(a),{questoes:s.all('questions').filter(q=>q.area===a).map(({doubt,...q})=>q),notas:s.all('notes').filter(n=>n.area===a),objetivos:s.all('objectives').filter(o=>o.area===a)}])),vinculos:s.all('links')};return send(content);}
   if(path==='/api/export/basic'&&req.method==='GET')return send(anki(s.all('notes'),'basic'),200,'text/tab-separated-values; charset=utf-8');
   if(path==='/api/export/cloze'&&req.method==='GET')return send(anki(s.all('notes'),'cloze'),200,'text/tab-separated-values; charset=utf-8');
   if(path==='/api/restore'&&req.method==='POST'){assert(body.confirm==='RESTAURAR','Confirmação de restauração ausente.');assert(!s.all('jobs').some(j=>j.status==='running'),'Aguarde o processamento dos envios antes de restaurar.',409);return send(await service.serialize(()=>{mkdirSync(join(dataDir,'backups'),{recursive:true});writeFileSync(join(dataDir,'backups',`antes-restauracao-${Date.now()}.json`),JSON.stringify(s.snapshot()));return s.restore(body.backup);}));}
   assert(false,'Operação não encontrada.',404);
  }catch(e){send({error:e.status?e.message:'Ocorreu uma falha ao salvar ou processar. Seus dados anteriores foram preservados.',...e.details},e.status||500);}
 }
 return {handler,store:s,service};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){const app=makeApp();const port=Number(process.env.PORT||3210);const host=process.env.CODESPACES==='true'?'0.0.0.0':'127.0.0.1';createServer(app.handler).listen(port,host,()=>console.log(`Reuma Revisa disponível na porta ${port}`));}

