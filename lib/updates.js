import { Platform, Linking } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from './supabase';

// Resolve the running app's version. Constants.expoConfig.version mirrors
// the `version` field in app.json, which is what we bump every release.
export const getCurrentVersion = () =>
  Constants?.expoConfig?.version ||
  Constants?.manifest?.version ||
  Constants?.manifest2?.extra?.expoClient?.version ||
  '0.0.0';

// Compare two semver-ish strings (e.g. "1.1.2" vs "1.1.10"). Returns
// negative / 0 / positive — same contract as a sort comparator.
const compareVersions = (a, b) => {
  const pa = String(a).split('.').map((x) => Number(x) || 0);
  const pb = String(b).split('.').map((x) => Number(x) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const diff = (pa[i] || 0) - (pb[i] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
};

const platformKey = () => (Platform.OS === 'ios' ? 'ios' : 'android');

export const checkForUpdate = async () => {
  const current = getCurrentVersion();
  const { data, error } = await supabase
    .from('app_versions')
    .select('version_name, version_code, apk_url, release_notes, mandatory, released_at')
    .eq('platform', platformKey())
    .maybeSingle();

  if (error) throw error;
  if (!data) return { hasUpdate: false, current, reason: 'no_row' };

  const hasUpdate = compareVersions(data.version_name, current) > 0;
  return {
    hasUpdate,
    current,
    latest: data.version_name,
    versionCode: data.version_code,
    apkUrl: data.apk_url,
    releaseNotes: data.release_notes,
    mandatory: !!data.mandatory,
    releasedAt: data.released_at,
  };
};

// Hand the URL off to the OS. On Android, the browser auto-downloads the
// APK and surfaces the install prompt via the system download notification —
// the closest we can get to "auto-download + install" without adding an
// IntentLauncher dependency or REQUEST_INSTALL_PACKAGES permission.
export const startUpdateDownload = async (apkUrl) => {
  if (!apkUrl) throw new Error('No download URL configured for this release.');
  const can = await Linking.canOpenURL(apkUrl);
  if (!can) throw new Error('Cannot open the download URL.');
  await Linking.openURL(apkUrl);
};
