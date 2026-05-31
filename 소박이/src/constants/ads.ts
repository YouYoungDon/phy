// Rewarded ad group IDs for the rest/TV feature.
//
// API docs: https://developers-apps-in-toss.toss.im/bedrock/reference/framework/광고/IntegratedAd.md
// Policy:   "개발 단계에서는 반드시 테스트용 광고 ID를 사용해요. 실제 광고
//            ID로 테스트하면 정책 위반으로 간주해 불이익을 받을 수 있어요."
//            — https://developers-apps-in-toss.toss.im/ads/intro.md
//
// The runtime split below mirrors the URL-presence safety pattern used in
// letterService: dev and prod IDs live in separate constants, and the
// exported id is selected by __DEV__. A production build with an unfilled
// PROD slot resolves to '', which useRestedAd treats as 'unsupported' —
// the TV surface degrades gracefully (no fetch, no error toast).

declare const __DEV__: boolean;

// Dev rewarded ad group registered for this app in the AppsInToss console.
// Keep this as a console-issued TEST id — never paste the production id
// here, and never reuse the production id during dev/QA.
const DEV_REST_AD_GROUP_ID = 'ait.dev.43daa14da3ae487b';

// Fill this with the production rewarded ad group id from the AppsInToss
// developer console (광고 → 광고 그룹 → 보상형) before submitting a build
// that exposes the rest/TV feature. Empty string = subsystem intentionally
// dormant in this build.
const PROD_REST_AD_GROUP_ID = '';

export const REST_AD_GROUP_ID: string = __DEV__
  ? DEV_REST_AD_GROUP_ID
  : PROD_REST_AD_GROUP_ID;
