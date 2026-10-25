import { fsrs, createEmptyCard } from 'ts-fsrs';
import { id,now,assert,AppError,splitQuestion,fingerprint,objectiveKey,validateObjective,validateNote,similarity,norm,dateKey } from './domain.js';
import { checks } from './ai.js';
export class Service {
 constructor(store,ai){this.s=store;this.ai=ai;this.tail=Promise.resolve();}
 serialize(fn){const p=this.tail.then(fn);this.tail=p.catch(()=>{});return p;}
 duplicate(q){return {duplicate:true,message:'Essa questão já foi enviada. Nenhum novo cartão foi criado.',question:q};}
 async submit(input){return this.serialize(async()=>{
  assert(typeof input.raw==='string'&&input.raw.trim().length>=20&&input.raw.length<=100000,'Cole uma questão com pelo menos 20 caracteres (máximo 100 mil).');
  const hash=fingerprint(input.raw),existing=this.s.duplicate(hash);if(existing)return this.duplicate(existing);
  const all=this.s.all('questions');let similar=all.filter(q=>similarity(q.core,splitQuestion(input.raw).core)>.55).map(q=>q.id);
  if(this.ai.enabled)similar=[...new Set([...similar,...await this.ai.similarQuestion(input.raw,all)])];
  if(similar.length&&!input.confirmDistinct)return {confirmation:true,similar:all.filter(q=>similar.includes(q.id)),message:'Confirme se esta questão é diferente antes de prosseguir.'};
  const q={id:id(),fingerprint:hash,raw:input.raw,...splitQuestion(input.raw),source:input.source||'',institution:input.institution||'',year:input.year||'',area:input.area||'Outros temas',tags:[],doubt:input.doubt||'',createdAt:now(),status:'pending',issues:[],verifiedAt:null};
  const result=this.s.tx(()=>{const dup=this.s.duplicate(hash);if(dup)return this.duplicate(dup);this.s.put('questions',q,{fingerprint:hash});if(input.outcome)this.attempt(q.id,input.outcome);return {question:q};});
  if(result.duplicate)return result;
  if(!this.ai.enabled){q.issues=['API automática desativada. Use o fluxo manual com ChatGPT para analisar esta questão sem cobrança da API.'];this.s.update('questions',q);return {question:q,pending:true};}
  return this.analyze(q.id);
 });}
 attempt(questionId,outcome){assert(this.s.get('questions',questionId),'Questão não encontrada.',404);assert(['secure','doubt','wrong','unanswered'].includes(outcome),'Resultado inválido.');return this.s.put('attempts',{id:id(),questionId,outcome,createdAt:now()},{question_id:questionId});}
 async analyze(qid){const q=this.s.get('questions',qid);assert(q,'Questão não encontrada.',404);q.status='processing';this.s.update('questions',q);try{
  const output=await this.ai.extract(q.raw,q.doubt,this.s.meta('areas'));if(q.area==='Outros temas'&&this.s.meta('areas').includes(output.mainArea))q.area=output.mainArea;q.tags=output.tags;q.issues=output.issues;
  let created=0,covered=0,updates=0;
  for(const candidate of output.objectives){let warnings=validateObjective(candidate,q.raw,this.s.meta('areas'));const o={...candidate,id:id(),questionId:qid,createdAt:now(),warnings};
   const key=objectiveKey(o);const existing=this.s.all('notes').find(n=>n.objectiveKey===key);
   let matches=existing?[{id:existing.id,decision:'same',distinction:''}]:await this.ai.compare(o,this.acervo());
   const same=matches.find(x=>x.decision==='same');
   if(same){this.s.tx(()=>{o.decision='same';this.s.put('objectives',o,{question_id:qid});this.s.link(qid,same.id,o.evidence);});covered++;continue;}
   if(matches.some(x=>x.decision==='improve'))updates++;
   let note,evaluation;for(let attempt=0;attempt<3;attempt++){note=await this.ai.generate(o,warnings);evaluation=await this.ai.evaluate(note,o,q.raw,matches);warnings=[...validateNote(note,o,q.raw),...evaluation.alerts,...checks.filter(k=>!evaluation.checks[k]).map(k=>'Avaliação pendente: '+k)];if(!warnings.length)break;}
   // Recheck the entire current collection immediately before the transactional save.
   matches=await this.ai.compare(o,this.acervo());const coveredNow=matches.find(x=>x.decision==='same');
   this.s.tx(()=>{o.decision=coveredNow?'same':matches[0]?.decision||'distinct';this.s.put('objectives',o,{question_id:qid});if(coveredNow){this.s.link(qid,coveredNow.id,o.evidence);covered++;return;}
    const race=this.s.all('notes').find(n=>n.objectiveKey===key);if(race){this.s.link(qid,race.id,o.evidence);covered++;return;}
    if(matches.some(m=>['conflict','uncertain','improve','partial'].includes(m.decision)))warnings.push('Resolva a comparação com o acervo e justifique a distinção.');
    if(q.issues.length)warnings.push(...q.issues);
    const n={...note,id:id(),objectiveId:o.id,objectiveKey:key,status:'draft',area:o.area,tags:o.tags,evidence:o.evidence,source:q.source,createdAt:now(),updatedAt:now(),alerts:[...new Set(warnings)],evaluation,matches,distinction:matches.map(m=>m.distinction).filter(Boolean).join(' '),dedupComplete:true,verifiedAt:null};this.s.put('notes',n,{objective_id:o.id,objective_key:key});this.s.link(qid,n.id,o.evidence);created++;
   });
  }
  q.status='ready';q.summary={objectives:output.objectives.length,created,covered,updates};this.s.update('questions',q);return {question:q};
 }catch(e){q.status='pending';q.issues=[e.message];this.s.update('questions',q);return {question:q,pending:true,error:e.message};}}

 async manualImport(qid,response){return this.serialize(async()=>{
  const q=this.s.get('questions',qid);assert(q,'Questão não encontrada.',404);
  assert(q.status==='pending','Somente questões pendentes podem receber uma análise manual.');
  assert(typeof response==='string'&&response.trim().length>0&&response.length<=300000,'Cole a resposta JSON completa do ChatGPT.');
  let parsed;try{const clean=response.trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'');parsed=JSON.parse(clean);}catch{throw new Error('Não encontrei um JSON válido. Peça ao ChatGPT para retornar somente o objeto JSON indicado.');}
  assert(parsed&&typeof parsed==='object'&&!Array.isArray(parsed),'A resposta deve ser um objeto JSON.');
  assert(Array.isArray(parsed.candidates)&&parsed.candidates.length<=30,'O JSON deve conter uma lista "candidates" com até 30 propostas. Lista vazia é válida.');
  assert(parsed.issues===undefined||(Array.isArray(parsed.issues)&&parsed.issues.length<=100&&parsed.issues.every(x=>typeof x==='string')),'A lista de pendências é inválida.');
  const areas=this.s.meta('areas');
  const prepared=parsed.candidates.map((candidate,index)=>{
   assert(candidate&&candidate.objective&&candidate.note,'Cada proposta precisa conter objective e note.');
   const objective={...candidate.objective,id:id(),questionId:qid,createdAt:now(),warnings:[]};
   objective.warnings=validateObjective(objective,q.raw,areas);
   const key=objectiveKey(objective),noteData=candidate.note;
   const note={...noteData,id:id(),objectiveId:objective.id,objectiveKey:key,status:'draft',area:objective.area,tags:objective.tags,evidence:objective.evidence,source:q.source,createdAt:now(),updatedAt:now(),alerts:[],matches:[],evaluation:null,distinction:'',dedupComplete:false,manualImport:true,verifiedAt:null};
   const validation=validateNote(note,objective,q.raw);
   note.alerts=[...new Set([...(parsed.issues||[]).map(x=>String(x).slice(0,2000)),...validation,'Comparação semântica e avaliação independente pendentes. Use "Revisar com ChatGPT".'])];
   return {objective,note,index};
  });
  return this.s.tx(()=>{
   let created=0,covered=0;
   for(const item of prepared){
    const existing=this.s.all('notes').find(n=>n.objectiveKey===item.note.objectiveKey);
    item.objective.decision=existing?'same':'manual_pending';
    if(existing)item.objective.existingNoteId=existing.id;
    this.s.put('objectives',item.objective,{question_id:qid});
    if(existing){this.s.link(qid,existing.id,item.objective.evidence);covered++;continue;}
    this.s.put('notes',item.note,{objective_id:item.objective.id,objective_key:item.note.objectiveKey});
    this.s.link(qid,item.note.id,item.objective.evidence);created++;
   }
   q.status='ready';q.analysisMode='manual-chatgpt';q.issues=(parsed.issues||[]).map(x=>String(x).slice(0,2000));
   q.summary={objectives:prepared.length,created,covered,updates:0};q.manualSummary=String(parsed.summary||'').slice(0,2000);this.s.update('questions',q);
   return {question:q,created,covered};
  });
 });}
 manualReview(nid,response){
  const n=this.s.get('notes',nid);assert(n&&n.status==='draft','Somente rascunhos podem receber avaliação manual.',404);
  assert(n.manualImport,'Este cartão não foi importado pelo fluxo manual.');
  assert(typeof response==='string'&&response.trim().length>0&&response.length<=100000,'Cole o JSON da avaliação independente.');
  let review;try{const clean=response.trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'');review=JSON.parse(clean);}catch{throw new Error('Não encontrei um JSON válido para a avaliação.');}
  assert(review&&typeof review==='object'&&!Array.isArray(review),'A avaliação deve ser um objeto JSON.');
  assert(['distinct','same','improve','partial','conflict','uncertain'].includes(review.decision),'Decisão de avaliação inválida.');
  assert(review.checks&&typeof review.checks==='object'&&checks.every(k=>typeof review.checks[k]==='boolean'),'A avaliação deve responder aos oito critérios com true ou false.');
  assert(Array.isArray(review.matches)&&review.matches.length<=100,'Lista de correspondências inválida.');
  assert(review.matches.every(m=>m&&typeof m.id==='string'&&this.s.get('notes',m.id)&&m.id!==nid&&['same','improve','partial','conflict','uncertain'].includes(m.decision)&&typeof m.distinction==='string'),'Correspondência inválida ou fora do acervo.');
  assert(Array.isArray(review.alternatives)&&review.alternatives.every(x=>typeof x==='string'),'Lista de alternativas inválida.');
  assert(Array.isArray(review.alerts)&&review.alerts.every(x=>typeof x==='string'),'Lista de alertas inválida.');
  assert(typeof review.reason==='string'&&typeof (review.distinction||'')==='string','Justificativa inválida.');
  const o=this.s.get('objectives',n.objectiveId),q=this.s.get('questions',o.questionId),failed=checks.filter(k=>!review.checks[k]);
  const unresolved=review.matches.some(m=>['same','improve','conflict','uncertain'].includes(m.decision)||(m.decision==='partial'&&!m.distinction.trim()));
  const complete=review.decision==='distinct'&&!failed.length&&!unresolved&&(!review.matches.some(m=>m.decision==='partial')||String(review.distinction||'').trim().length>0);
  const alerts=[...validateNote(n,o,q.raw),...q.issues,...review.alerts.map(x=>String(x).slice(0,1000)),...failed.map(k=>'Avaliação independente pendente: '+k)];
  if(!complete){alerts.push(review.decision==='same'?'A avaliação encontrou conhecimento já coberto; vincule a um cartão existente.':'A avaliação não confirmou que este cartão é distinto e adequado. Revise e tente novamente.');}
  else alerts.push('Revise o conteúdo e a fonte antes de aprovar individualmente.');
  n.matches=review.matches;n.evaluation={checks:review.checks,alternatives:review.alternatives,alerts:review.alerts,reason:review.reason};n.distinction=String(review.distinction||'').slice(0,2000);n.dedupComplete=complete;n.manualReviewedAt=now();n.alerts=[...new Set(alerts)];
  return this.s.update('notes',n);
 }
 acervo(){return this.s.all('notes').map(n=>({id:n.id,status:n.status,objective:this.s.get('objectives',n.objectiveId),front:n.front,back:n.back,explanation:n.explanation,discardReason:n.discardReason}));}
 version(n,reason){this.s.put('versions',{id:id(),noteId:n.id,snapshot:structuredClone(n),reason,createdAt:now()},{note_id:n.id});}
 async edit(nid,input){return this.serialize(async()=>{let n=this.s.get('notes',nid);assert(n,'Cartão não encontrado.',404);const o=this.s.get('objectives',n.objectiveId),q=this.s.get('questions',o.questionId);this.version(n,'Edição');n={...n,...Object.fromEntries(['front','back','explanation','type','area','tags','distinction'].filter(k=>k in input).map(k=>[k,input[k]])),status:'draft',updatedAt:now()};assert(this.s.meta('areas').includes(n.area)&&Array.isArray(n.tags),'Área ou etiquetas inválidas.');n.alerts=validateNote(n,o,q.raw);n.dedupComplete=false;
  if(this.ai.enabled){try{const matches=await this.ai.compare(o,this.acervo().filter(x=>x.id!==n.id));const ev=await this.ai.evaluate(n,o,q.raw,matches);n.matches=matches;n.evaluation=ev;n.alerts.push(...ev.alerts,...checks.filter(k=>!ev.checks[k]).map(k=>'Avaliação pendente: '+k));if(matches.length)n.alerts.push('Resolva a comparação com o acervo e justifique a distinção.');n.dedupComplete=true;}catch{n.alerts.push('Avaliação e deduplicação indisponíveis.');}}
  else n.alerts.push('Avaliação e deduplicação semântica pendentes.');return this.s.update('notes',n);
 });}
 approve(ids,resolution){return this.s.tx(()=>{assert(Array.isArray(ids)&&ids.length>0,'Selecione cartões.');const notes=ids.map(x=>this.s.get('notes',x));for(const n of notes){assert(n&&n.status==='draft','Somente rascunhos podem ser aprovados.');const o=this.s.get('objectives',n.objectiveId),q=this.s.get('questions',o.questionId);const alerts=validateNote(n,o,q.raw);assert(!alerts.some(x=>/inválid|vazia|exatamente|obrigatórias|ausente|completa|simples não/i.test(x)),'Corrija a estrutura e a evidência antes de aprovar.');assert(n.dedupComplete,'Deduplicação não concluída. Reavalie quando a IA estiver disponível.');if(n.alerts.length||alerts.length){assert(ids.length===1&&typeof resolution==='string'&&resolution.trim().length>=20,'Alertas pendentes: revise individualmente e registre uma justificativa de pelo menos 20 caracteres.');}assert(!this.s.all('notes').some(x=>x.id!==n.id&&x.objectiveKey===n.objectiveKey),'Objetivo já existente.');}
  for(const n of notes){this.version(n,'Aprovação');n.status='approved';n.resolution=resolution||'';n.approvedAt=now();this.s.update('notes',n);if(!this.s.all('cards').some(c=>c.noteId===n.id)){const c={id:id(),noteId:n.id,ordinal:1,state:createEmptyCard(new Date()),revision:0,createdAt:now()};this.s.put('cards',c,{note_id:n.id});}}return {approved:notes.length};});}
 state(nid,status,reason=''){const n=this.s.get('notes',nid);assert(n,'Cartão não encontrado.',404);assert(['suspended','draft','discarded'].includes(status),'Estado inválido.');if(status==='discarded')assert(reason.trim().length>2,'Informe o motivo do descarte.');this.version(n,status);n.status=status;n.discardReason=reason;return this.s.update('notes',n);}
 link(nid,target){return this.s.tx(()=>{const n=this.s.get('notes',nid),t=this.s.get('notes',target);assert(n&&t&&n.id!==t.id,'Vínculo inválido.');assert(n.status==='draft','Vinculação disponível apenas para rascunhos.');for(const l of this.s.all('links').filter(x=>x.noteId===nid))this.s.link(l.questionId,target,l.evidence);this.state(nid,'discarded','Mesmo foco; vinculado a '+target);return {ok:true};});}
 queue(){const settings=this.s.meta('settings'),today=dateKey(now(),settings.timezone);const used=this.s.all('reviews').filter(r=>!r.undone&&r.isNew&&dateKey(r.createdAt,settings.timezone)===today).length;const approved=new Set(this.s.all('notes').filter(n=>n.status==='approved').map(n=>n.id));const cards=this.s.all('cards').filter(c=>approved.has(c.noteId));return [...cards.filter(c=>c.state.reps>0&&new Date(c.state.due)<=new Date()).sort((a,b)=>a.state.due.localeCompare(b.state.due)),...cards.filter(c=>c.state.reps===0).slice(0,Math.max(0,settings.newLimit-used))].map(c=>({...c,note:this.s.get('notes',c.noteId)}));}
 review(input){return this.s.tx(()=>{assert(typeof input.eventId==='string'&&input.eventId.length>=10,'Identificador da avaliação ausente.');const previous=this.s.get('reviews',input.eventId);if(previous)return previous;const c=this.s.get('cards',input.cardId);assert(c&&this.s.get('notes',c.noteId).status==='approved','Cartão indisponível.');assert(c.revision===input.revision,'Esta avaliação já foi registrada ou o cartão mudou. Atualize a fila.',409);assert(this.queue().some(x=>x.id===c.id),'Cartão fora da fila atual.',409);assert([1,2,3,4].includes(input.rating),'Avaliação inválida.');const before=structuredClone(c),time=new Date(),scheduler=fsrs({request_retention:this.s.meta('settings').retention,enable_fuzz:false});const state={...c.state,due:new Date(c.state.due),...(c.state.last_review?{last_review:new Date(c.state.last_review)}:{})};const result=scheduler.next(state,time,input.rating);c.state=result.card;c.revision++;this.s.update('cards',c);const n=this.s.get('notes',c.noteId);const event={id:input.eventId,cardId:c.id,noteId:c.noteId,rating:input.rating,isNew:before.state.reps===0,before,after:structuredClone(c),log:result.log,createdAt:time.toISOString(),area:n.area,tags:n.tags,activeMs:Math.min(300000,Math.max(0,Number(input.activeMs)||0)),undone:false};return this.s.put('reviews',event,{card_id:c.id});});}
 undo(){return this.s.tx(()=>{const r=this.s.all('reviews').filter(r=>!r.undone).sort((a,b)=>b.createdAt.localeCompare(a.createdAt))[0];assert(r,'Nenhuma avaliação para desfazer.');const c=this.s.get('cards',r.cardId);assert(c.revision===r.after.revision,'O cartão mudou após esta avaliação.',409);this.s.update('cards',{...r.before,revision:c.revision+1});r.undone=true;r.undoneAt=now();this.s.update('reviews',r);return {ok:true};});}
 report(nid,type,detail,suspend){const n=this.s.get('notes',nid);assert(n,'Cartão não encontrado.');if(suspend)this.state(nid,'suspended');return this.s.put('reports',{id:id(),noteId:nid,type,detail:detail||'',status:'open',createdAt:now()},{note_id:nid});}
 restoreVersion(vid){const v=this.s.get('versions',vid);assert(v,'Versão não encontrada.');const current=this.s.get('notes',v.noteId);assert(current.objectiveKey===v.snapshot.objectiveKey,'Esta versão cobra outro objetivo. Use Alterar objetivo e escolha explicitamente novo cartão ou reinício.');this.version(current,'Antes da recuperação');const restored={...v.snapshot,status:'draft',updatedAt:now()};this.s.update('notes',restored);return restored;}
 async audit(){const findings=[];const all=this.acervo();for(let i=0;i<all.length;i++){const matches=await this.ai.compare(all[i].objective,all.slice(i+1));for(const m of matches)findings.push({noteId:all[i].id,...m});}return findings;}
 merge(keepId,retireId,reason){return this.s.tx(()=>{const keep=this.s.get('notes',keepId),retire=this.s.get('notes',retireId);assert(keep&&retire&&keepId!==retireId,'Selecione dois cartões diferentes.');assert(reason?.trim().length>=10,'Justifique a união.');assert(!this.s.all('merges').some(m=>!m.undone&&[m.keepId,m.retireId].some(x=>[keepId,retireId].includes(x))),'Desfaça a união anterior antes de unir estes cartões novamente.');const added=[];for(const l of this.s.all('links').filter(x=>x.noteId===retireId)){if(!this.s.all('links').some(x=>x.noteId===keepId&&x.questionId===l.questionId))added.push(this.s.link(l.questionId,keepId,l.evidence).id);}const event={id:id(),keepId,retireId,reason,previousStatus:retire.status,added,createdAt:now(),undone:false};this.version(retire,'União: preservado histórico de '+keepId);retire.status='suspended';retire.mergedInto=keepId;this.s.update('notes',retire);return this.s.put('merges',event);});}
 undoMerge(mid){return this.s.tx(()=>{const m=this.s.get('merges',mid);assert(m&&!m.undone,'União não encontrada.');const n=this.s.get('notes',m.retireId);assert(n.mergedInto===m.keepId&&n.status==='suspended','O cartão foi alterado após a união. Resolva as alterações antes de desfazer.');this.version(n,'Desfazer união');n.status=m.previousStatus;delete n.mergedInto;this.s.update('notes',n);for(const lid of m.added)this.s.db.prepare('DELETE FROM links WHERE id=?').run(lid);m.undone=true;m.undoneAt=now();this.s.update('merges',m);return {ok:true};});}
 async changeObjective(nid,input){return this.serialize(async()=>{const n=this.s.get('notes',nid);assert(n,'Cartão não encontrado.');assert(['new','reset'].includes(input.choice),'Escolha criar novo cartão ou reiniciar explicitamente.');const old=this.s.get('objectives',n.objectiveId),q=this.s.get('questions',old.questionId);const o={...input.objective,id:id(),questionId:q.id,createdAt:now()};const warnings=validateObjective(o,q.raw,this.s.meta('areas'));assert(!warnings.length,'O novo objetivo precisa de evidência literal na fonte original.');assert(objectiveKey(o)!==n.objectiveKey,'O objetivo é o mesmo; use a edição comum para preservar o histórico.');assert(!this.s.all('notes').some(x=>x.objectiveKey===objectiveKey(o)),'Este objetivo já existe. Vincule ao cartão correspondente.');const matches=await this.ai.compare(o,this.acervo().filter(x=>x.id!==nid));assert(!matches.some(x=>x.decision==='same'),'O acervo já contém este objetivo.');const draft=await this.ai.generate(o),evaluation=await this.ai.evaluate(draft,o,q.raw,matches);const alerts=[...validateNote(draft,o,q.raw),...evaluation.alerts,...checks.filter(k=>!evaluation.checks[k]).map(k=>'Avaliação pendente: '+k)];if(matches.length)alerts.push('Resolva a comparação com o acervo e justifique a distinção.');return this.s.tx(()=>{this.version(n,'Mudança explícita de objetivo: '+input.choice);this.s.put('objectives',o,{question_id:q.id});const updated={...n,...draft,id:input.choice==='new'?id():nid,objectiveId:o.id,objectiveKey:objectiveKey(o),area:o.area,tags:o.tags,evidence:o.evidence,status:'draft',alerts,matches,evaluation,dedupComplete:true,updatedAt:now(),createdAt:input.choice==='new'?now():n.createdAt};if(input.choice==='new'){this.s.put('notes',updated,{objective_id:o.id,objective_key:updated.objectiveKey});this.s.link(q.id,updated.id,o.evidence);n.status='suspended';this.s.update('notes',n);}else{this.s.db.prepare('UPDATE notes SET objective_id=?,objective_key=?,data=? WHERE id=?').run(o.id,updated.objectiveKey,JSON.stringify(updated),nid);for(const c of this.s.all('cards').filter(x=>x.noteId===nid)){this.s.put('versions',{id:id(),noteId:nid,snapshot:n,scheduleBefore:structuredClone(c),reason:'Agendamento anterior à reinicialização explícita',createdAt:now()},{note_id:nid});c.state=createEmptyCard(new Date());c.revision++;this.s.update('cards',c);}}return updated;});});}
}
