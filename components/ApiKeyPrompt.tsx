import React, { useState, useEffect, useCallback } from 'react';

// Fix: Resolved a TypeScript error related to global type declarations for `window.aistudio`.
// The inline object type was replaced with a named `AIStudio` interface to ensure consistency.
declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }
  interface Window {
    // FIX: Made `aistudio` optional to match runtime checks and resolve potential declaration conflicts.
    aistudio?: AIStudio;
  }
}

interface ApiKeyPromptProps {
  children: React.ReactNode;
}

export const ApiKeyPrompt: React.FC<ApiKeyPromptProps> = ({ children }) => {
  const [isKeySelected, setIsKeySelected] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  const handleApiKeyInvalid = useCallback(() => {
    console.warn("API key is invalid. Prompting user to select a new one.");
    setIsKeySelected(false);
  }, []);

  useEffect(() => {
    const checkKey = async () => {
      if (window.aistudio) {
        try {
          const hasKey = await window.aistudio.hasSelectedApiKey();
          setIsKeySelected(hasKey);
        } catch (error) {
          console.error("Error checking for API key:", error);
          setIsKeySelected(false);
        }
      } else {
        console.warn("window.aistudio not found. Assuming API key is available in dev mode.");
        setIsKeySelected(true);
      }
      setIsChecking(false);
    };

    checkKey();

    window.addEventListener('apiKeyInvalid', handleApiKeyInvalid);

    return () => {
        window.removeEventListener('apiKeyInvalid', handleApiKeyInvalid);
    };
  }, [handleApiKeyInvalid]);

  const handleSelectKey = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      // Optimistically set key as selected to unblock UI immediately.
      setIsKeySelected(true);
    }
  };

  if (isChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900 text-white">
        <div className="text-center">
          <p>Checking API key status...</p>
        </div>
      </div>
    );
  }

  if (!isKeySelected) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900">
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-8 max-w-lg text-center mx-4">
          <h2 className="text-2xl font-bold text-white mb-4">API Key Required</h2>
          <p className="text-slate-400 mb-6">
            To use this application, you need to select an API key. 
            Please be aware that API usage may incur billing charges.
          </p>
          <a
            href="https://ai.google.dev/gemini-api/docs/billing"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 underline transition-colors mb-8 block"
          >
            Learn more about billing
          </a>
          <button
            onClick={handleSelectKey}
            className="w-full px-4 py-3 bg-blue-600 text-white rounded-md font-semibold hover:bg-blue-700 transition-colors"
          >
            Select API Key
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
