import {existsSync,lstatSync,readlinkSync,renameSync,readdirSync,readFileSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/** Preserve stale Chromium lock links when a previous container no longer owns them. */
export function recoverBrowserLocks(profile){
  if(process.platform!=='linux')return false;
  const lock=path.join(profile,'SingletonLock');
  if(!existsSync(profile)||!lstatSafe(lock)?.isSymbolicLink())return false;
  const owner=readlinkSync(lock),match=owner.match(/^(.*)-(\d+)$/);
  if(!match)return false;
  // A live process using this exact profile always wins; never touch its lock.
  const active=readdirSync('/proc').filter(id=>/^\d+$/.test(id)).some(id=>{
    try{return readFileSync(`/proc/${id}/cmdline`,'utf8').includes('--user-data-dir='+profile);}catch{return false;}
  });
  if(active)return false;
  if(match[1]===os.hostname()&&existsSync('/proc/'+match[2]))return false;
  const suffix='.stale-'+Date.now();
  for(const name of ['SingletonLock','SingletonCookie','SingletonSocket']){
    const file=path.join(profile,name);
    if(lstatSafe(file)?.isSymbolicLink())renameSync(file,file+suffix);
  }
  return true;
}
function lstatSafe(file){try{return lstatSync(file);}catch(error){if(error.code==='ENOENT')return null;throw error;}}
