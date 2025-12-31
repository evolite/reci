import { useState, useEffect } from 'react';
import { getSetting, updateSetting } from '@/lib/api';
import { getErrorMessage } from '@/lib/utils';

export function useSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [openaiModel, setOpenaiModel] = useState('gpt-5-mini');

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError('');
      const setting = await getSetting('openai_model');
      setOpenaiModel(setting.value || 'gpt-5-mini');
    } catch (err) {
      // If setting doesn't exist, use default (don't show error)
      if (err instanceof Error && (err.message.includes('404') || err.message.includes('Setting not found'))) {
        setOpenaiModel('gpt-5-mini');
        setError(''); // Clear any error
      } else {
        setError(getErrorMessage(err, 'Failed to load settings'));
      }
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccess(false);
      
      await updateSetting('openai_model', openaiModel, 'OpenAI model used for recipe analysis');
      
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to save settings'));
    } finally {
      setSaving(false);
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
    openaiModel,
    setOpenaiModel,
    loadSettings,
    saveSettings,
  };
}
