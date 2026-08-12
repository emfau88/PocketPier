type AdKind='midgame'|'rewarded';
type CrazyError={code?:string;message?:string};
type CrazyStorage=Pick<Storage,'getItem'|'setItem'|'removeItem'|'clear'>;
interface CrazySdk {
  init():Promise<void>;
  environment?:string;
  data?:CrazyStorage;
  user?:{systemInfo?:{countryCode?:string;device?:{type?:string};os?:{name?:string};browser?:{name?:string};applicationType?:string;locale?:string}};
  game?:{loadingStart():void;loadingStop():void;gameplayStart():void;gameplayStop():void;happytime?():void;reportGameCompletedPercentage?(value:number):void;setGameContext?(context:Record<string,string>):void;clearGameContext?():void};
  ad?:{requestAd(kind:AdKind,callbacks:{adStarted():void;adFinished():void;adError(error:CrazyError):void}):void};
}

declare global { interface Window { CrazyGames?:{SDK?:CrazySdk} } }

export class PortalBridge {
  private static ready=false;
  private static initPromise?:Promise<void>;
  private static playing=false;
  private static loading=false;
  private static sdk?:CrazySdk;

  static init(){
    if(this.initPromise)return this.initPromise;
    this.initPromise=(async()=>{
      this.sdk=window.CrazyGames?.SDK;
      if(!this.sdk){this.submitAnalyticsEvent('game_boot',{platform:'local'});return;}
      try{
        await this.sdk.init();this.ready=true;this.loadingStart();this.migrateLocalSave();
        this.submitAnalyticsEvent('game_boot',{platform:this.getPlatformName()});
      }catch(error){this.ready=false;console.warn('[PocketPier] CrazyGames SDK unavailable; using local fallback.',error)}
    })();
    return this.initPromise;
  }

  static storage():CrazyStorage{
    const local=window.localStorage,data=this.ready?this.sdk?.data:undefined;
    if(!data)return local;
    return {
      getItem:key=>{try{return data.getItem(key)}catch{return local.getItem(key)}},
      setItem:(key,value)=>{try{data.setItem(key,value)}catch{local.setItem(key,value)}},
      removeItem:key=>{try{data.removeItem(key)}catch{local.removeItem(key)}},
      clear:()=>{try{data.clear()}catch{local.clear()}}
    };
  }
  static loadingStart(){if(!this.ready||this.loading)return;this.sdk?.game?.loadingStart();this.loading=true}
  static loadingStop(){if(!this.ready||!this.loading)return;this.sdk?.game?.loadingStop();this.loading=false}
  static gameplayStart(){if(!this.ready||this.playing)return;this.sdk?.game?.gameplayStart();this.playing=true}
  static gameplayStop(){if(!this.ready||!this.playing)return;this.sdk?.game?.gameplayStop();this.playing=false}
  static requestInterstitial(reason:string){return this.requestAd('midgame',reason)}
  static requestRewarded(reason:string){return this.requestAd('rewarded',reason)}
  static submitAnalyticsEvent(name:string,payload:object={}){if(this.getPlatformName()==='local')console.info('[PocketPier]',name,payload)}
  static celebrate(){try{this.sdk?.game?.happytime?.()}catch{/* optional */}}
  static reportCompletion(value:number){try{this.sdk?.game?.reportGameCompletedPercentage?.(Math.max(0,Math.min(100,Math.round(value))))}catch{/* optional */}}
  static setGameContext(context:Record<string,string>){try{this.sdk?.game?.setGameContext?.(context)}catch{/* optional */}}
  static clearGameContext(){try{this.sdk?.game?.clearGameContext?.()}catch{/* optional */}}
  static isPlatformReady(){return this.ready}
  static getPlatformName(){return this.ready?(this.sdk?.environment??'crazygames'):'local'}
  static systemInfo(){return this.sdk?.user?.systemInfo}

  private static migrateLocalSave(){
    const data=this.sdk?.data;if(!data)return;
    try{const key='pocket-pier-save',cloud=data.getItem(key),local=window.localStorage.getItem(key);if(cloud===null&&local!==null)data.setItem(key,local)}catch(error){console.warn('[PocketPier] Save migration skipped.',error)}
  }

  private static requestAd(kind:AdKind,reason:string):Promise<boolean>{
    this.submitAnalyticsEvent(`${kind}_requested`,{reason});
    if(!this.ready||!this.sdk?.ad)return Promise.resolve(false);
    return new Promise(resolve=>{
      let settled=false;
      const finish=(rewarded:boolean)=>{if(settled)return;settled=true;window.dispatchEvent(new CustomEvent('pocketpier:ad-finished'));resolve(rewarded)};
      try{this.sdk?.ad?.requestAd(kind,{adStarted:()=>window.dispatchEvent(new CustomEvent('pocketpier:ad-started')),adFinished:()=>finish(kind==='rewarded'),adError:(error)=>{this.submitAnalyticsEvent(`${kind}_unavailable`,error);finish(false)}})}catch(error){this.submitAnalyticsEvent(`${kind}_error`,{message:String(error)});finish(false)}
    });
  }
}
