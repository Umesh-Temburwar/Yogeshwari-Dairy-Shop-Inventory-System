export interface AppUpdateInfo {
  versionName: string;
  versionCode: number;
  minVersionCode?: number;
  releaseDate: string;
  apkUrl: string;
  forceUpdate?: boolean;
  title?: string;
  highlights: string[];
}

// Current installed version of Yogeshwari Dairy Application
export const CURRENT_APP_VERSION = '1.0.0';
export const CURRENT_BUILD_NUMBER = 1;

// Public URL on production web host where version.json is fetched
export const UPDATE_MANIFEST_URL = 'https://yogeshwari-dairy-shop.vercel.app/version.json';
export const LOCAL_MANIFEST_URL = '/version.json';
