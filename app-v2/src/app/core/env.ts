// Runtime environment. The same build runs on the web (Netlify) and inside the iOS app (Capacitor).
import { Capacitor } from '@capacitor/core';

export const SB_URL = 'https://oxrqkgbbccstbetxpnsn.supabase.co';
export const SB_KEY = 'sb_publishable_ZZTqt5iEvQBsDIomZCIVQw_bvcaJ5_g';
export const SITE = 'https://3045orderapp.netlify.app/';
export const NATIVE = Capacitor.isNativePlatform();
/** product photos live on the website; inside the app they are fetched from there */
export const IMG_BASE = NATIVE ? SITE + 'img/' : '/img/';
export const STORAGE_BASE = SB_URL + '/storage/v1/object/public/product-images/';
export const STORE_LL = { lat: 32.546806, lng: 35.851194 };
export const PRIVACY_URL = SITE + 'privacy.html';
export const SUPPORT_URL = SITE + 'support.html';
