import { fetch as streamingFetch } from 'expo/fetch';

import type { FetchLike } from './CloudHttpClient';

// expo/fetch streams response bodies (React Native's built-in fetch does not), which live answers need.
export const expoFetch: FetchLike = (url, init) => streamingFetch(url, init) as ReturnType<FetchLike>;
