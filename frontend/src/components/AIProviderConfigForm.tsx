import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { AI_PROVIDERS, PROVIDER_MODELS } from '@/lib/constants';
import { Save } from 'lucide-react';
import { CardContent } from '@/components/ui/card';

interface AIProviderConfigFormProps {
  provider: string;
  setProvider: (v: string) => void;
  model: string;
  setModel: (v: string) => void;
  apiKey: string;
  setApiKey: (v: string) => void;
  baseUrl: string;
  setBaseUrl: (v: string) => void;
  saving: boolean;
  onSave: () => void;
}

export function AIProviderConfigForm({
  provider,
  setProvider,
  model,
  setModel,
  apiKey,
  setApiKey,
  baseUrl,
  setBaseUrl,
  saving,
  onSave,
}: AIProviderConfigFormProps) {
  const isCustomProvider = provider === 'custom';
  const providerModels = PROVIDER_MODELS[provider] ?? [];
  const isKnownProvider = !isCustomProvider && providerModels.length > 0;

  return (
    <CardContent className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="ai-provider">Provider</Label>
        <Select value={provider} onValueChange={setProvider}>
          <SelectTrigger id="ai-provider">
            <SelectValue placeholder="Select a provider" />
          </SelectTrigger>
          <SelectContent>
            {AI_PROVIDERS.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="ai-api-key">API Key</Label>
        <Input
          id="ai-api-key"
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="Leave empty to use OPENAI_API_KEY environment variable"
        />
        <p className="text-xs text-muted-foreground">
          Falls back to <code>OPENAI_API_KEY</code> env var if empty.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="ai-base-url">Base URL</Label>
        <Input
          id="ai-base-url"
          type="text"
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
          placeholder="https://api.openai.com/v1"
          readOnly={!isCustomProvider}
          className={isCustomProvider ? '' : 'opacity-60 cursor-not-allowed'}
        />
        {!isCustomProvider && (
          <p className="text-xs text-muted-foreground">
            Auto-configured for the selected provider.
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="ai-model">Model</Label>
        {isKnownProvider ? (
          <Select value={model} onValueChange={setModel}>
            <SelectTrigger id="ai-model">
              <SelectValue placeholder="Select a model" />
            </SelectTrigger>
            <SelectContent>
              {providerModels.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Input
            id="ai-model"
            type="text"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="e.g. llama3, mistral, gpt-4o"
          />
        )}
        <p className="text-xs text-muted-foreground">
          Current model: <strong>{model}</strong>
        </p>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button onClick={onSave} disabled={saving}>
          {saving ? (
            <>
              <Spinner className="w-4 h-4 mr-2" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Settings
            </>
          )}
        </Button>
      </div>
    </CardContent>
  );
}
