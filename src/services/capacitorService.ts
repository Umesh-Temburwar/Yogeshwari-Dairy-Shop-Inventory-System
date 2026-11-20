import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { Keyboard } from '@capacitor/keyboard';
import { Network } from '@capacitor/network';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Camera } from '@capacitor/camera';

export const isNativePlatform = (): boolean => {
  return Capacitor.isNativePlatform();
};

export const getPlatform = (): string => {
  return Capacitor.getPlatform();
};

/**
 * Configure native mobile status bar and splash screen on startup
 */
export const initNativeApp = async (): Promise<void> => {
  if (!isNativePlatform()) return;

  try {
    // 1. Status Bar styling
    await StatusBar.setStyle({ style: Style.Dark });
    if (Capacitor.getPlatform() === 'android') {
      await StatusBar.setBackgroundColor({ color: '#0B1210' });
    }
  } catch (err) {
    console.warn('Native StatusBar init error:', err);
  }

  try {
    // 2. Hide native splash screen smoothly after app bundle loads
    await SplashScreen.hide({ fadeOutDuration: 300 });
  } catch (err) {
    console.warn('Native SplashScreen hide error:', err);
  }
};

/**
 * Request native camera permissions upfront so getUserMedia/ZXing never gets blocked
 */
export const requestNativeCameraPermission = async (): Promise<boolean> => {
  if (!isNativePlatform()) return true;

  try {
    const status = await Camera.checkPermissions();
    if (status.camera === 'granted') {
      return true;
    }
    const req = await Camera.requestPermissions({ permissions: ['camera'] });
    return req.camera === 'granted';
  } catch (err) {
    console.warn('Native camera permission request failed:', err);
    return true; // Fallback to web permissions
  }
};

/**
 * Native file sharing / saving for PDFs and CSVs
 */
export const shareOrSaveFileNative = async (
  filename: string,
  blobOrBase64: Blob | string,
  mimeType: string,
  title: string = 'Export File'
): Promise<boolean> => {
  if (!isNativePlatform()) return false;

  try {
    let base64Data: string;

    if (typeof blobOrBase64 === 'string') {
      base64Data = blobOrBase64.startsWith('data:')
        ? blobOrBase64.split(',')[1] || blobOrBase64
        : blobOrBase64;
    } else {
      base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const res = reader.result as string;
          resolve(res.split(',')[1] || res);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blobOrBase64);
      });
    }

    // Write file to native app cache/documents
    const written = await Filesystem.writeFile({
      path: filename,
      data: base64Data,
      directory: Directory.Cache,
    });

    // Invoke native Android Share sheet
    await Share.share({
      title: title,
      text: `Sharing ${filename} from Yogeshwari Dairy Inventory`,
      url: written.uri,
      dialogTitle: title,
    });

    return true;
  } catch (err) {
    console.warn('Native file share failed:', err);
    return false;
  }
};

export { App, StatusBar, SplashScreen, Keyboard, Network, Camera, Filesystem, Share };
