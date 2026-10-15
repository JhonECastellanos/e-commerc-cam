import {randomId} from './client';
export {randomId};
export async function businessApi<T=any>(path:string,method='GET',data?:unknown,extra:Record<string,string>={}):Promise<T>{
  const token=sessionStorage.getItem('admin_token');
  const response=await fetch('/api'+path,{method,headers:{'Content-Type':'application/json',...(path.startsWith('/admin/')&&token?{Authorization:`Bearer ${token}`} : {}),...extra},...(data===undefined?{}:{body:JSON.stringify(data)})});
  if(!response.ok){const error=await response.json().catch(()=>({detail:'No fue posible conectar'}));throw new Error(typeof error.detail==='string'?error.detail:'Revisa los datos enviados');}
  return response.json();
}
export const kindLabels:Record<string,string>={cctv_meeting:'Cámaras y CCTV · 30 min',smart_home_meeting:'Casa inteligente · 1 hora',installation:'Instalación',blocked:'Bloqueo de agenda'};
export function colombiaDate(value:string){return new Intl.DateTimeFormat('es-CO',{timeZone:'America/Bogota',dateStyle:'medium',timeStyle:'short'}).format(new Date(value));}
export function today(){return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Bogota',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());}
