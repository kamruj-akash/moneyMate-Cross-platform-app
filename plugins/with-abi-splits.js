// Expo config plugin: inject ABI splits + ARM-only filters into the
// generated android/app/build.gradle so each release build produces
// per-architecture APKs instead of one fat universal one.
//
// Why we need this:
//   The default Expo prebuild produces a "universal" APK that bundles
//   native libraries for all four CPU architectures (arm64-v8a,
//   armeabi-v7a, x86, x86_64). Modern phones only execute one of those
//   sets, so ~70% of the APK is dead weight on every device. Splitting
//   shrinks the arm64 APK from ~95 MB → ~35 MB, with no functionality
//   loss for the user.
//
// What it adds:
//   • splits.abi { include 'arm64-v8a', 'armeabi-v7a'; universalApk = true }
//     - arm64-v8a covers virtually every phone since 2017.
//     - armeabi-v7a covers older / cheaper Android devices.
//     - x86 / x86_64 dropped: only emulators use those, not real phones.
//     - universalApk = true also keeps a fat APK for ad-hoc testing.
//
// After prebuild + ./gradlew assembleRelease you'll get:
//   android/app/build/outputs/apk/release/
//     app-arm64-v8a-release.apk         (~35 MB)  ← share this on GitHub
//     app-armeabi-v7a-release.apk       (~30 MB)  ← for very old devices
//     app-universal-release.apk         (~95 MB)  ← fallback if needed

const { withAppBuildGradle } = require('@expo/config-plugins');

const SPLITS_BLOCK = `
    splits {
        abi {
            enable true
            reset()
            include 'arm64-v8a', 'armeabi-v7a'
            universalApk true
        }
    }`;

module.exports = function withAbiSplits(config) {
  return withAppBuildGradle(config, (cfg) => {
    let gradle = cfg.modResults.contents;

    // Idempotent — don't double-inject if prebuild is run multiple times
    // without --clean.
    if (gradle.includes('splits {') && gradle.includes('arm64-v8a')) {
      return cfg;
    }

    // Insert the splits block as the first child of `android { ... }`.
    // The regex is anchored on the literal `android {` line so we don't
    // accidentally inject into a nested block.
    const androidBlockRe = /(android\s*\{)/m;
    if (androidBlockRe.test(gradle)) {
      gradle = gradle.replace(androidBlockRe, `$1${SPLITS_BLOCK}`);
      cfg.modResults.contents = gradle;
    }
    return cfg;
  });
};
