export const AVAILABLE_MODELS = [
  { value: 'gpt-5-mini', label: 'GPT-5 Mini ($0.25/$2.00)', description: 'Cheapest option' },
  { value: 'gpt-5', label: 'GPT-5 ($1.25/$10.00)', description: 'Balanced performance' },
  { value: 'gpt-5.1', label: 'GPT-5.1 ($1.25/$10.00)', description: 'Latest GPT-5 variant' },
  { value: 'gpt-5.2', label: 'GPT-5.2 ($1.75/$14.00)', description: 'Higher performance' },
  { value: 'gpt-4.1', label: 'GPT-4.1 ($2.00/$8.00)', description: 'Good balance' },
  { value: 'gpt-4.1-mini', label: 'GPT-4.1 Mini ($0.40/$1.60)', description: 'Budget GPT-4' },
  { value: 'gpt-4o', label: 'GPT-4o ($2.50/$10.00)', description: 'Original GPT-4o' },
] as const;
