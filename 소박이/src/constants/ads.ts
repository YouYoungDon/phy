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

// Production rewarded ad group id, registered in the AppsInToss
// developer console (광고 → 광고 그룹 → 보상형). Used by the TV/rest
// reward popup in production builds. The "ait.v2.live." prefix marks
// this as a console-issued live id, distinct from dev/test ids.
const PROD_REST_AD_GROUP_ID = 'ait.v2.live.efe1744acc8343eb';

export const REST_AD_GROUP_ID: string = __DEV__
  ? DEV_REST_AD_GROUP_ID
  : PROD_REST_AD_GROUP_ID;
