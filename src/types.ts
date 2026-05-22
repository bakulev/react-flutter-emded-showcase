export interface BridgeLog {
  id: string;
  sender: 'react' | 'flutter';
  event: string;
  payload: Record<string, any>;
  timestamp: string;
}

export interface InspectorNode {
  id: string;
  name: string;
  type: 'widget' | 'layout' | 'render';
  depth: number;
  info?: string;
  children?: InspectorNode[];
}

export interface SlideData {
  id: number;
  title: string;
  subtitle: string;
  category: 'intro' | 'tech' | 'embed' | 'bridge' | 'summary';
  contentMarkdown: string;
  codeSnippet: string;
  codeLanguage: string;
  demoType: 'none' | 'smarthome' | 'financial' | 'painter' | 'playground';
}
