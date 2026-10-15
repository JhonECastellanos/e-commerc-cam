import {existsSync,readFileSync,writeFileSync,renameSync,mkdirSync} from 'node:fs';
import path from 'node:path';

// One gateway owns this volume. Atomic replacement survives container restarts.
export class Ledger{
  constructor(directory){mkdirSync(directory,{recursive:true});this.file=path.join(directory,'ledger.json');this.data=existsSync(this.file)?JSON.parse(readFileSync(this.file,'utf8')):{incoming:{},outgoing:{},business:{},enabled:false};for(const value of Object.values(this.data.outgoing))if(value.status==='sending')value.status='uncertain';this.save();}
  save(){const temporary=this.file+'.tmp';writeFileSync(temporary,JSON.stringify(this.data),{mode:0o600});renameSync(temporary,this.file);}
  begin(id){const previous=this.data.outgoing[id];if(previous)return previous;const value={status:'sending',at:Date.now()};this.data.outgoing[id]=value;this.save();return null;}
  finish(id,status){this.data.outgoing[id]={status,at:Date.now()};this.save();}
}
