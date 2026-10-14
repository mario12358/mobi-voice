import * as Clipboard from 'expo-clipboard';
import { Share } from 'react-native';

import type { ShareSheet } from './types';

export const deviceShareSheet: ShareSheet = {
  copy: async (text) => {
    await Clipboard.setStringAsync(text);
  },
  // Android shows the title in the chooser, iOS passes it on as the subject of an e-mail.
  share: async (title, text) => {
    await Share.share({ title, message: text }, { subject: title, dialogTitle: title });
  },
};
