import { useCallback } from 'react';

import { useServices } from '../../services/ServicesProvider';

// "Eksportuj" on the topic list and in the conversation: the history as Markdown through the share sheet.
export function useTopicExport(): (topicId: number) => Promise<void> {
  const { exporter, share } = useServices();
  return useCallback(
    async (topicId: number) => {
      const exported = await exporter.export(topicId);
      await share.share(exported.title, exported.markdown);
    },
    [exporter, share],
  );
}
