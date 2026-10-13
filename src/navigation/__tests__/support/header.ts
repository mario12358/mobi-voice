import { screen } from '@testing-library/react-native';

interface JsonNode {
  type: string;
  props: Record<string, unknown>;
  children: (JsonNode | string)[] | null;
}

// Native-stack titles are props of the native header config, not <Text>; read the visible screen's one.
export function visibleHeaderTitle(): unknown {
  const screens: JsonNode[] = [];
  const walk = (node: JsonNode | string) => {
    if (typeof node === 'string') return;
    if (node.type === 'RNSScreen' && node.props['aria-hidden'] !== true) screens.push(node);
    node.children?.forEach(walk);
  };
  const tree = screen.toJSON() as JsonNode | JsonNode[] | null;
  (Array.isArray(tree) ? tree : tree === null ? [] : [tree]).forEach(walk);
  const header = screens
    .at(-1)
    ?.children?.find(
      (child): child is JsonNode => typeof child !== 'string' && child.type === 'RNSScreenStackHeaderConfig',
    );
  return header?.props.title;
}
