import { Platform, Share } from 'react-native';

export type ShareOutcome = 'shared' | 'copied' | 'cancelled' | 'failed';

type WebNavigator = {
  share?: (data: { text: string }) => Promise<void>;
  clipboard?: { writeText: (text: string) => Promise<void> };
};

function webNavigator(): WebNavigator | undefined {
  return (globalThis as { navigator?: WebNavigator }).navigator;
}

export function canUseWebShareSheet(): boolean {
  return Platform.OS === 'web' && typeof webNavigator()?.share === 'function';
}

/** Copy to the clipboard (web). Native builds use the share sheet, which has Copy. */
export async function copyText(text: string): Promise<ShareOutcome> {
  try {
    await webNavigator()?.clipboard?.writeText(text);
    return webNavigator()?.clipboard ? 'copied' : 'failed';
  } catch {
    return 'failed';
  }
}

/**
 * Share a result. Native: the OS share sheet. Web: the browser share sheet
 * when `preferSheet` and available, otherwise the clipboard.
 */
export async function shareText(text: string, preferSheet = false): Promise<ShareOutcome> {
  if (Platform.OS === 'web') {
    const nav = webNavigator();
    if (preferSheet && nav?.share) {
      try {
        await nav.share({ text });
        return 'shared';
      } catch (error) {
        return (error as { name?: string })?.name === 'AbortError' ? 'cancelled' : copyText(text);
      }
    }
    return copyText(text);
  }
  try {
    const result = await Share.share({ message: text });
    return result.action === Share.dismissedAction ? 'cancelled' : 'shared';
  } catch {
    return 'failed';
  }
}
