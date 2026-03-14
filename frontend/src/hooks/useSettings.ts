import { useState, useEffect } from 'react';
import { getSetting, updateSetting } from '@/lib/api';
import { getErrorMessage } from '@/lib/utils';
import { AI_PROVIDERS, PROVIDER_MODELS } from '@/lib/constants';

export function useSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [provider, setProvider] = useState('openai');
  const [model, setModel] = useState('gpt-4o-mini');
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError('');

      const results = await Promise.allSettled([
        getSetting('ai_provider'),
        getSetting('ai_model'),
        getSetting('ai_api_key'),
        getSetting('ai_base_url'),
        getSetting('openai_model'), // fallback
      ]);

      const [providerResult, modelResult, apiKeyResult, baseUrlResult, legacyModelResult] = results;

      const loadedProvider =
        providerResult.status === 'fulfilled' ? providerResult.value.value || 'openai' : 'openai';
      setProvider(loadedProvider);

      if (modelResult.status === 'fulfilled' && modelResult.value.value) {
        setModel(modelResult.value.value);
      } else if (legacyModelResult.status === 'fulfilled' && legacyModelResult.value.value) {
        setModel(legacyModelResult.value.value);
      } else {
        setModel('gpt-4o-mini');
      }

      setApiKey(apiKeyResult.status === 'fulfilled' ? apiKeyResult.value.value || '' : '');

      // For base URL: if the loaded provider has a known URL and no custom URL is saved, pre-fill it
      const savedBaseUrl = baseUrlResult.status === 'fulfilled' ? baseUrlResult.value.value || '' : '';
      if (savedBaseUrl) {
        setBaseUrl(savedBaseUrl);
      } else {
        const providerDef = AI_PROVIDERS.find(p => p.value === loadedProvider);
        setBaseUrl(providerDef?.baseUrl ?? '');
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load settings'));
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccess(false);

      await Promise.all([
        updateSetting('ai_provider', provider, 'AI provider'),
        updateSetting('ai_model', model, 'AI model used for recipe analysis'),
        updateSetting('ai_api_key', apiKey, 'AI API key'),
        updateSetting('ai_base_url', baseUrl, 'AI base URL (custom/self-hosted)'),
      ]);

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to save settings'));
    } finally {
      setSaving(false);
    }
  };

  // When provider changes, update base URL and reset model to first option for that provider
  const handleProviderChange = (newProvider: string) => {
    setProvider(newProvider);
    const providerDef = AI_PROVIDERS.find(p => p.value === newProvider);
    setBaseUrl(providerDef?.baseUrl ?? '');
    const models = PROVIDER_MODELS[newProvider] ?? [];
    if (models.length > 0) {
      setModel(models[0].value);
    } else {
      setModel('');
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  return {
    loading,
    saving,
    error,
    success,
    provider,
    setProvider: handleProviderChange,
    model,
    setModel,
    apiKey,
    setApiKey,
    baseUrl,
    setBaseUrl,
    loadSettings,
    saveSettings,
    // Backward-compat aliases
    openaiModel: model,
    setOpenaiModel: setModel,
  };
}
