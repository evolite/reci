export const AI_PROVIDERS = [
  { value: 'openai', label: 'OpenAI', baseUrl: '' },
  { value: 'anthropic', label: 'Anthropic Claude', baseUrl: 'https://api.anthropic.com/v1' },
  { value: 'google', label: 'Google Gemini', baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai/' },
  { value: 'custom', label: 'Custom / Self-hosted', baseUrl: '' },
] as const;

export const PROVIDER_MODELS: Record<string, { value: string; label: string }[]> = {
  openai: [
    { value: 'gpt-4o', label: 'GPT-4o' },
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
    { value: 'gpt-4.1', label: 'GPT-4.1' },
    { value: 'gpt-4.1-mini', label: 'GPT-4.1 Mini' },
  ],
  anthropic: [
    { value: 'claude-opus-4-5', label: 'Claude Opus 4.5' },
    { value: 'claude-sonnet-4-5', label: 'Claude Sonnet 4.5' },
    { value: 'claude-haiku-4-5', label: 'Claude Haiku 4.5' },
  ],
  google: [
    { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
    { value: 'gemini-2.0-flash-lite', label: 'Gemini 2.0 Flash Lite' },
    { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
    { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
  ],
  custom: [], // free text entry
};

// Compatibility shim — maps to OpenAI models
export const AVAILABLE_MODELS = PROVIDER_MODELS.openai.map(m => ({
  value: m.value,
  label: m.label,
  description: '',
}));
