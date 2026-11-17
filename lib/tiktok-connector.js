import EulerStreamApiClient from 'tiktok-live-api-sdk';
import {SignConfig,TikTokLiveConnection} from 'tiktok-live-connector';

// The SDK caches its first provider globally. Use an explicit fresh client so a
// saved replacement key actually reaches Euler, without mutating other clients.
export function createTikTokConnector(username,{signApiKey,...options}={}){
 if(!signApiKey)throw Error('Falta configurar la clave API de Euler Stream.');
 const headers=Object.fromEntries(Object.entries(SignConfig.baseOptions?.headers||{}).filter(([name])=>!['x-api-key','x-jwt-key'].includes(name.toLowerCase())));
 const provider=new EulerStreamApiClient({basePath:SignConfig.basePath,apiKey:signApiKey,baseOptions:{...SignConfig.baseOptions,timeout:SignConfig.baseOptions?.timeout??10000,headers}});
 return new TikTokLiveConnection(username,{processInitialData:true,fetchRoomInfoOnConnect:false,enableExtendedGiftInfo:false,...options,eulerApiInstance:provider});
}
