import {readFileSync,writeFileSync,mkdirSync,renameSync,unlinkSync} from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';

// Secrets travel through stdin, never the process arguments or diagnostic text.
export function windowsCrypt(value, decrypt=false){
  if(process.platform!=='win32')throw Error('Windows encryption unavailable');
  const script=`$ErrorActionPreference='Stop'; Add-Type -AssemblyName System.Security; $v=[Console]::In.ReadToEnd(); $scope=[System.Security.Cryptography.DataProtectionScope]::CurrentUser; $entropy=[Text.Encoding]::UTF8.GetBytes('LiveDance.EulerKey.v1'); ${decrypt?"$b=[Security.Cryptography.ProtectedData]::Unprotect([Convert]::FromBase64String($v),$entropy,$scope); [Console]::Out.Write([Text.Encoding]::UTF8.GetString($b))":"$b=[Security.Cryptography.ProtectedData]::Protect([Text.Encoding]::UTF8.GetBytes($v),$entropy,$scope); [Console]::Out.Write([Convert]::ToBase64String($b))"}`;
  const result=spawnSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',script],{input:value,encoding:'utf8',windowsHide:true,timeout:30000,maxBuffer:32768});
  if(result.error||result.status!==0||!result.stdout)throw Error('Windows encryption failed');
  return result.stdout;
}

export class ProviderKey {
  #key=''; #source=null; #path; #crypt; #storageError=false;
  constructor({env={},file=null,crypt=windowsCrypt}={}){
    this.#path=file;this.#crypt=crypt;
    const supplied=env.EULER_SIGN_API_KEY||env.SIGN_API_KEY;
    if(supplied?.trim()){this.#key=supplied.trim();this.#source='environment';return;}
    if(!file)return;
    try{const saved=JSON.parse(readFileSync(file,'utf8'));if(saved.version!==1||typeof saved.encrypted!=='string')throw Error();this.#key=crypt(saved.encrypted,true);this.#source='windows';}
    catch(e){if(e.code!=='ENOENT')this.#storageError=true;}
  }
  value(){return this.#key;}
  snapshot(){return {configured:!!this.#key,source:this.#source,storageError:this.#storageError};}
  save(value){
    if(this.#source==='environment')throw Error('La clave se configuró por variable de entorno. Cambiala allí y reiniciá Live Dance.');
    if(typeof value!=='string'||value.trim().length<8||value.length>4096||/[\s\x00-\x1f\x7f]/.test(value.trim()))throw Error('Pegá una clave API válida de Euler Stream, sin espacios.');
    if(!this.#path)throw Error('El almacenamiento de claves no está habilitado.');
    const key=value.trim();let temporary;
    try{const encrypted=this.#crypt(key);mkdirSync(path.dirname(this.#path),{recursive:true});temporary=this.#path+'.'+randomUUID()+'.tmp';writeFileSync(temporary,JSON.stringify({version:1,encrypted})+'\n',{mode:0o600});renameSync(temporary,this.#path);}
    catch{if(temporary)try{unlinkSync(temporary);}catch{}throw Error('No se pudo guardar la clave con el cifrado de Windows.');}
    this.#key=key;this.#source='windows';this.#storageError=false;
    return this.snapshot();
  }
  clear(){
    if(this.#source==='environment')throw Error('La clave proviene de una variable de entorno; retirala allí y reiniciá Live Dance.');
    if(this.#path)try{unlinkSync(this.#path);}catch(e){if(e.code!=='ENOENT')throw Error('No se pudo quitar la clave guardada.');}
    this.#key='';this.#source=null;this.#storageError=false;return this.snapshot();
  }
}
