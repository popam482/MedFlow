import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { npm, root, run } from './workspace-common.ts';

export function androidEnvironment(): NodeJS.ProcessEnv {
  const javaCandidates = [
    process.env.JAVA_HOME,
    process.platform === 'win32' ? 'C:/Program Files/Android/Android Studio/jbr' : undefined,
    process.platform === 'darwin' ? '/Applications/Android Studio.app/Contents/jbr/Contents/Home' : undefined,
    '/opt/android-studio/jbr',
  ];
  const javaHome = javaCandidates.find((path) => path && existsSync(resolve(path, 'bin', process.platform === 'win32' ? 'java.exe' : 'java')));
  const sdkCandidates = [process.env.ANDROID_HOME, process.env.ANDROID_SDK_ROOT,
    process.env.LOCALAPPDATA ? resolve(process.env.LOCALAPPDATA, 'Android/Sdk') : undefined,
    resolve(homedir(), process.platform === 'darwin' ? 'Library/Android/sdk' : 'Android/Sdk')];
  const sdk = sdkCandidates.find((path) => path && existsSync(resolve(path, 'platforms')) && existsSync(resolve(path, 'build-tools')));
  return { ...process.env, ...(javaHome ? { JAVA_HOME: javaHome } : {}), ...(sdk ? { ANDROID_HOME: sdk, ANDROID_SDK_ROOT: sdk } : {}) };
}

export function checkAndroid(): { env: NodeJS.ProcessEnv; issues: string[] } {
  const env = androidEnvironment();
  const java = env.JAVA_HOME ? resolve(env.JAVA_HOME, 'bin', process.platform === 'win32' ? 'java.exe' : 'java') : 'java';
  const result = spawnSync(java, ['-version'], { env, encoding: 'utf8', windowsHide: true });
  const version = `${result.stderr ?? ''}${result.stdout ?? ''}`.match(/version "(\d+)/)?.[1];
  const issues = [
    ...(!version || Number(version) < 21 ? ['JDK 21+ is missing. Install Android Studio and set JAVA_HOME to its Gradle JDK.'] : []),
    ...(!env.ANDROID_HOME || !existsSync(resolve(env.ANDROID_HOME, 'platforms')) || !existsSync(resolve(env.ANDROID_HOME, 'build-tools'))
      ? ['Android SDK is missing/incomplete. Install platform and build-tools in Android Studio; set ANDROID_HOME.'] : []),
  ];
  return { env, issues };
}

export function buildAndroid(frontend: string, args: string[]): void {
  if (args.some((arg) => !['--prepare', '--bundle', '--open'].includes(arg))) throw new Error('android supports --prepare, --bundle, --open.');
  const prepare = args.includes('--prepare');
  const open = args.includes('--open');
  const toolchain = checkAndroid();
  if (!prepare && !open && toolchain.issues.length) throw new Error(`${toolchain.issues.join('\n')}\nRun python Make.py doctor --android. Project preparation: python Make.py android --prepare`);
  npm(['run', 'build'], frontend);
  if (!existsSync(resolve(frontend, 'android'))) npm(['run', 'android:add'], frontend);
  npm(['run', 'android:sync'], frontend);
  if (open) { npm(['run', 'android:open'], frontend); return; }
  if (prepare) { console.log('Android project ready; APK compilation still requires JDK and Android SDK.'); return; }
  const bundle = args.includes('--bundle');
  const android = resolve(frontend, 'android');
  const task = bundle ? 'bundleRelease' : 'assembleDebug';
  if (process.platform === 'win32') run('cmd.exe', ['/d', '/c', 'gradlew.bat', '--no-daemon', task], android, toolchain.env);
  else run('sh', ['./gradlew', '--no-daemon', task], android, toolchain.env);
  const source = resolve(android, bundle ? 'app/build/outputs/bundle/release/app-release.aab' : 'app/build/outputs/apk/debug/app-debug.apk');
  const output = resolve(root, 'artifacts/android', bundle ? 'medflow-release-unsigned.aab' : 'medflow-debug.apk');
  mkdirSync(dirname(output), { recursive: true });
  copyFileSync(source, output);
  console.log(`Artifact: ${output}${bundle ? ' (unsigned; production signing is separate)' : ' (debug-signed, for local testing)'}`);
}
