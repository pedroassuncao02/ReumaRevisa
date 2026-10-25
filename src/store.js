import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { AREAS, id, now, assert } from './domain.js';
export class Store {
 constructor(path) { if(path!==':memory:')mkdirSync(dirname(path),{recursive:true});this.db=new DatabaseSync(path);this.db.exec(`PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=10000;
 CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY,value TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS questions (id TEXT PRIMARY KEY, fingerprint TEXT UNIQUE NOT NULL, data TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS objectives (id TEXT PRIMARY KEY, question_id TEXT NOT NULL REFERENCES questions(id), data TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS notes (id TEXT PRIMARY KEY, objective_id TEXT NOT NULL REFERENCES objectives(id), objective_key TEXT UNIQUE NOT NULL, data TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS cards (id TEXT PRIMARY KEY, note_id TEXT NOT NULL REFERENCES notes(id), data TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS links (id TEXT PRIMARY KEY, question_id TEXT NOT NULL REFERENCES questions(id), note_id TEXT NOT NULL REFERENCES notes(id), data TEXT NOT NULL, UNIQUE(question_id,note_id));
 CREATE TABLE IF NOT EXISTS attempts (id TEXT PRIMARY KEY, question_id TEXT NOT NULL REFERENCES questions(id), data TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS reviews (id TEXT PRIMARY KEY, card_id TEXT NOT NULL REFERENCES cards(id), data TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS versions (id TEXT PRIMARY KEY, note_id TEXT NOT NULL REFERENCES notes(id), data TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS reports (id TEXT PRIMARY KEY, note_id TEXT NOT NULL REFERENCES notes(id), data TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS jobs (id TEXT PRIMARY KEY, data TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS merges (id TEXT PRIMARY KEY, data TEXT NOT NULL);
 `);if(!this.meta('settings'))this.setMeta('settings',{retention:.9,newLimit:20,timezone:'America/Sao_Paulo',leechThreshold:4});if(!this.meta('areas'))this.setMeta('areas',AREAS);this.setMeta('schema',1); }
 meta(key){ const r=this.db.prepare('SELECT value FROM meta WHERE key=?').get(key);return r?JSON.parse(r.value):null; }
 setMeta(key,value){this.db.prepare('INSERT OR REPLACE INTO meta VALUES (?,?)').run(key,JSON.stringify(value));}
 all(table){this.table(table);return this.db.prepare(`SELECT data FROM ${table}`).all().map(x=>JSON.parse(x.data));}
 get(table,key){this.table(table);const row=this.db.prepare(`SELECT data FROM ${table} WHERE id=?`).get(key);return row?JSON.parse(row.data):null;}
 table(t){assert(['questions','objectives','notes','cards','links','attempts','reviews','versions','reports','jobs','merges'].includes(t),'Tabela inválida.');}
 put(table,item,extra={}) {this.table(table);const keys=['id',...Object.keys(extra),'data'];const values=[item.id,...Object.values(extra),JSON.stringify(item)];this.db.prepare(`INSERT INTO ${table} (${keys.join(',')}) VALUES (${keys.map(()=>'?').join(',')}) ON CONFLICT(id) DO UPDATE SET data=excluded.data`).run(...values);return item;}
 update(table,item){this.table(table);if(table==='notes')this.db.prepare('UPDATE notes SET objective_id=?,objective_key=?,data=? WHERE id=?').run(item.objectiveId,item.objectiveKey,JSON.stringify(item),item.id);else this.db.prepare(`UPDATE ${table} SET data=? WHERE id=?`).run(JSON.stringify(item),item.id);return item;}
 tx(fn){this.db.exec('BEGIN IMMEDIATE');try{const value=fn();this.db.exec('COMMIT');return value;}catch(e){this.db.exec('ROLLBACK');throw e;}}
 duplicate(hash){const row=this.db.prepare('SELECT data FROM questions WHERE fingerprint=?').get(hash);return row?JSON.parse(row.data):null;}
 link(q,n,evidence){const old=this.all('links').find(x=>x.questionId===q&&x.noteId===n);if(old)return old;return this.put('links',{id:id(),questionId:q,noteId:n,evidence,createdAt:now()},{question_id:q,note_id:n});}
 snapshot(){return {format:'reuma-revisa-backup',schema:1,exportedAt:now(),settings:this.meta('settings'),areas:this.meta('areas'),tables:Object.fromEntries(['questions','objectives','notes','cards','links','attempts','reviews','versions','reports','merges'].map(t=>[t,this.all(t)]))};}
 restore(b){assert(b?.format==='reuma-revisa-backup'&&b.schema===1&&b.tables,'Backup incompatível.');const tables=['questions','objectives','notes','cards','links','attempts','reviews','versions','reports','merges'];b.tables.merges??=[];for(const t of tables)assert(Array.isArray(b.tables[t])&&b.tables[t].every(x=>x&&typeof x.id==='string'),'Backup inválido: '+t);assert(b.settings&&Array.isArray(b.areas),'Configuração ausente.');return this.tx(()=>{for(const t of [...tables].reverse())this.db.exec(`DELETE FROM ${t}`);this.db.exec('DELETE FROM jobs');for(const t of tables)for(const row of b.tables[t]){let e={};if(t==='questions')e={fingerprint:row.fingerprint};if(t==='objectives')e={question_id:row.questionId};if(t==='notes')e={objective_id:row.objectiveId,objective_key:row.objectiveKey};if(['cards','versions','reports'].includes(t))e={note_id:row.noteId};if(t==='links')e={question_id:row.questionId,note_id:row.noteId};if(t==='attempts')e={question_id:row.questionId};if(t==='reviews')e={card_id:row.cardId};this.put(t,row,e);}this.setMeta('settings',b.settings);this.setMeta('areas',b.areas);return {ok:true};});}
}
