export interface VerboSettings {
  geminiApiKey: string;
  defaultPrompt: string;
  includeTimestamps: boolean;
  maxTokens: number;
  selectedPromptIndex: number;
  customPrompts: PromptItem[];
  showOriginalTranscript: boolean; // New setting for showing/hiding original transcript
}

export interface PromptItem {
  name: string;
  content: string;
  isDefault?: boolean;
  defaultPath?: string;
}

export interface ProcessedTranscript {
  original: string;
  processed: string;
  videoId: string;
  videoTitle: string | undefined;
}