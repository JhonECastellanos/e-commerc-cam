/** Normalize the legacy message-ID field removed by newer WhatsApp beta models. */
export function installMessageCompatibility(){
  const collection=window.require('WAWebCollections').Chat;
  const prototypes=new Set();
  for(const chat of collection.getModelsArray()){
    const ids=[chat.lastReceivedKey,chat.msgs?.getModelsArray?.()[0]?.id];
    for(const id of ids){
      if(!id||typeof id!=='object'||!String(id).includes('_'))continue;
      const prototype=Object.getPrototypeOf(id);
      if(prototype&&prototype.constructor?.name!=='Object'&&Object.isExtensible(prototype)&&!Object.getOwnPropertyDescriptor(prototype,'_serialized'))prototypes.add(prototype);
    }
  }
  for(const prototype of prototypes)Object.defineProperty(prototype,'_serialized',{get(){return String(this);},configurable:true});
  if(!window.WWebJS.__abiMessageCompatibility){
    const original=window.WWebJS.getMessageModel;
    window.WWebJS.getMessageModel=message=>{
      const result=original(message);
      const id=message.id?._serialized||String(message.id);
      if(result.id&&id.includes('_'))result.id={...result.id,_serialized:id};
      return result;
    };
    window.WWebJS.__abiMessageCompatibility=true;
  }
  return {messageIds:true};
}
