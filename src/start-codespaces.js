import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const server=spawn(process.execPath,["--env-file-if-exists=.env","src/server.js"],{cwd:root,env:process.env,detached:true,stdio:"ignore"});
server.unref();
console.log("Reuma Revisa iniciou na porta 3210; abra a aba Ports se o navegador não abrir automaticamente.");

