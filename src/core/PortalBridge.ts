export class PortalBridge {
  private static muted = false;
  static async init() { this.submitAnalyticsEvent('game_boot'); }
  static loadingStart() { this.submitAnalyticsEvent('loading_start'); }
  static loadingStop() { this.submitAnalyticsEvent('loading_stop'); }
  static gameplayStart() { this.submitAnalyticsEvent('gameplay_start'); }
  static gameplayStop() { this.submitAnalyticsEvent('gameplay_stop'); }
  static async requestInterstitial(reason: string) { this.submitAnalyticsEvent('interstitial_requested', { reason }); }
  static async requestRewarded(reason: string) { this.submitAnalyticsEvent('rewarded_offer_shown', { reason }); return window.confirm('Watch a simulated ad for a reward?'); }
  static submitAnalyticsEvent(name: string, payload: object = {}) { console.info('[PocketPier]', name, payload); }
  static isPlatformReady() { return true; }
  static getPlatformName() { return 'local'; }
  static setGameplayMutedByPlatform(value: boolean) { this.muted = value; }
  static isMuted() { return this.muted; }
}
