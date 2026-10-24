import {randomId} from './client';
export {randomId};
export async function businessApi<T=any>(path:string,method='GET',data?:unknown,extra:Record<string,string>={}):Promise<T>{
  const token=sessionStorage.getItem('admin_token');
  const response=await fetch('/api'+path,{method,headers:{'Content-Type':'application/json',...(path.startsWith('/admin/')&&token?{Authorization:`Bearer ${token}`} : {}),...extra},...(data===undefined?{}:{body:JSON.stringify(data)})});
  if(!response.ok){const error=await response.json().catch(()=>({detail:'No fue posible conectar'}));throw new Error(typeof error.detail==='string'?error.detail:'Revisa los datos enviados');}
  return response.json();
}
export const kindLabels:Record<string,string>={cctv_meeting:'Cámaras y CCTV · 30 min',smart_home_meeting:'Casa inteligente · 1 hora',installation:'Instalación',blocked:'Bloqueo de agenda'};
export const statusLabels:Record<string,string>={pending:'Pendiente',confirmed:'Confirmada',cancelled:'Cancelada',completed:'Completada',no_show:'No asistió',blocked:'Bloqueada',applied:'Aplicada',rejected:'Rechazada'};
export const connectionLabels:Record<string,string>={disconnected:'Desconectado',connecting:'Conectando',qr:'Escanea el QR',authenticated:'Vinculado, preparando sesión',syncing:'Preparando sesión',ready:'Conectado',auth_failed:'Vuelve a vincular',error:'Reintenta la conexión'};
export const deliveryLabels:Record<string,string>={local:'Guardado',processed:'Recibido',processing:'Procesando',pending:'Pendiente de envío',pending_control:'Pendiente de envío',sent:'Enviado',uncertain:'Envío por verificar',failed:'No enviado',cancelled:'Cancelado'};
export function colombiaDate(value:string){return new Intl.DateTimeFormat('es-CO',{timeZone:'America/Bogota',dateStyle:'medium',timeStyle:'short'}).format(new Date(value));}
export function today(){return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Bogota',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());}
