import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {Ledger} from '../ledger.js';

test('outbound IDs deduplicate across restarts; interrupted sends remain uncertain',()=>{
  const folder=mkdtempSync(path.join(tmpdir(),'instalacam-ledger-'));
  try{
    const first=new Ledger(folder);
    assert.equal(first.begin('message-0001'),null);
    assert.equal(first.begin('message-0001').status,'sending');
    first.finish('message-0001','sent');
    first.begin('message-0002');
    const restarted=new Ledger(folder);
    assert.equal(restarted.begin('message-0001').status,'sent');
    assert.equal(restarted.begin('message-0002').status,'uncertain');
  }finally{rmSync(folder,{recursive:true,force:true});}
});

test('incoming backlog and business opt-in survive restart without importing personal chats',()=>{
  const folder=mkdtempSync(path.join(tmpdir(),'instalacam-ledger-'));
  try{
    const ledger=new Ledger(folder);
    assert.deepEqual(ledger.data.business,{});
    assert.deepEqual(ledger.data.incoming,{});
    ledger.data.business['573000000001']=true;
    ledger.data.incoming['incoming-0001']={id:'incoming-0001',phone:'573000000001',text:'InstalaCámara'};
    ledger.data.enabled=true;ledger.save();
    const restored=new Ledger(folder);
    assert.equal(restored.data.enabled,true);
    assert.equal(restored.data.incoming['incoming-0001'].text,'InstalaCámara');
    assert.equal(Object.keys(restored.data.business).length,1);
  }finally{rmSync(folder,{recursive:true,force:true});}
});
