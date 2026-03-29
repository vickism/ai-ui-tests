export type SelectorStrategy = 'css' | 'text' | 'role' | 'label' | 'placeholder' | 'testId';

export interface SelectorEntry {
  elementDescription: string;
  selector: string;
  strategy: SelectorStrategy;
  action: string;
  pageUrl: string;
  confidence: number;
  lastUsed: string;
  useCount: number;
}

export interface SelectorMemoryFile {
  version: 1;
  updatedAt: string;
  selectors: SelectorEntry[];
}

export interface MemoryConfig {
  enabled: boolean;
  dir: string;
}
