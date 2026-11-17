import test from 'node:test';import assert from 'node:assert/strict';import {SignConfig,createEulerClient,TikTokLiveConnection} from 'tiktok-live-connector';import {createTikTokConnector} from '../lib/tiktok-connector.js';

test('replacing the saved key reaches a fresh real SDK provider even when an old client is globally cached',()=>{
 const previous={apiKey:SignConfig.apiKey,cached:SignConfig.cachedInstance,baseOptions:SignConfig.baseOptions};
 try{
  SignConfig.apiKey='test-key-before';SignConfig.cachedInstance=undefined;SignConfig.baseOptions={validateStatus:()=>true,headers:{'User-Agent':'rotation-test'}};
  const cached=createEulerClient();assert.equal(cached.configuration.baseOptions.headers['X-Api-Key'],'test-key-before');
  const a=createTikTokConnector('palermotusi',{signApiKey:'test-key-after',processInitialData:true});
  assert(a instanceof TikTokLiveConnection);assert.notEqual(a.apiClient,cached);assert.equal(a.apiClient.configuration.baseOptions.headers['X-Api-Key'],'test-key-after');assert.equal(SignConfig.apiKey,'test-key-before');assert.equal(SignConfig.cachedInstance,cached);
  const b=createTikTokConnector('palermotusi',{signApiKey:'test-key-newer'});
  assert.notEqual(b.apiClient,a.apiClient);assert.equal(b.apiClient.configuration.baseOptions.headers['X-Api-Key'],'test-key-newer');assert.equal(a.apiClient.configuration.baseOptions.headers['X-Api-Key'],'test-key-after');
 }finally{SignConfig.apiKey=previous.apiKey;SignConfig.cachedInstance=previous.cached;SignConfig.baseOptions=previous.baseOptions;}
});
test('provider construction isolates global auth headers and never falls back to a removed credential',()=>{
 const previous=SignConfig.baseOptions;try{SignConfig.baseOptions={headers:{'x-api-key':'obsolete','X-Jwt-Key':'unrelated-token','User-Agent':'test'}};const c=createTikTokConnector('palermotusi',{signApiKey:'fresh-current-key'});assert.equal(c.apiClient.configuration.baseOptions.headers['X-Api-Key'],'fresh-current-key');assert.equal(c.apiClient.configuration.baseOptions.headers['x-api-key'],undefined);assert.equal(c.apiClient.configuration.baseOptions.headers['X-Jwt-Key'],undefined);assert.equal(previous?.headers?.['x-api-key'],undefined);assert.throws(()=>createTikTokConnector('palermotusi',{}));}finally{SignConfig.baseOptions=previous;}
});
