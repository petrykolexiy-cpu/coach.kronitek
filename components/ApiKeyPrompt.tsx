import React, { useState, useEffect, useCallback } from 'react';

// FIX: Add type definition for import.meta.env to fix TypeScript errors
// related to Vite environment variables when 'vite/client' types are not available.
declare global {
    interface ImportMeta {
        readonly env: {
            readonly VITE_API_KEY: string;
        };
    }
}

declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }
  interface Window {
    aistudio?: AIStudio;
  }
}

interface ApiKeyPromptProps {
  children: React.ReactNode;
}

const VercelInstructions = () => (
    <div className="flex items-center justify-center min-h-screen bg-slate-900">
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-8 max-w-2xl text-center mx-4">
            <h2 className="text-2xl font-bold text-white mb-4">Configuration Required for Vercel</h2>
            <p className="text-slate-400 mb-6">
                The Gemini API key is missing. To run this application on Vercel or locally, you must set an environment variable.
            </p>
            <div className="text-left bg-slate-900 p-4 rounded-lg border border-slate-600">
                <h3 className="font-semibold text-lg text-white mb-3">Follow these steps:</h3>
                <ol className="list-decimal list-inside space-y-2 text-slate-300">
                    <li>Go to your project settings on Vercel.</li>
                    <li>Navigate to the "Environment Variables" section.</li>
                    <li>Create a new variable with the name <code className="bg-slate-700 text-amber-400 px-1 py-0.5 rounded text-sm">VITE_API_KEY</code>.</li>
                    <li>Paste your Gemini API key into the value field.</li>
                    <li>Re-deploy your application for the changes to take effect.</li>
                </ol>
            </div>
             <p className="text-slate-500 mt-4 text-sm">
                For local development, create a <code className="bg-slate-700 text-amber-400 px-1 py-0.5 rounded text-sm">.env</code> file in the project root with the same variable.
            </p>
        </div>
    </div>
);


export const ApiKeyPrompt: React.FC<ApiKeyPromptProps> = ({ children }) => {
  const [isKeySelected, setIsKeySelected] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [isVercelEnv, setIsVercelEnv] = useState(false);

  const handleApiKeyInvalid = useCallback(() => {
    console.warn("API key is invalid. Prompting user to select a new one.");
    setIsKeySelected(false);
  }, []);

  useEffect(() => {
    const checkKey = async () => {
      if (window.aistudio) {
        setIsVercelEnv(false);
        try {
          const hasKey = await window.aistudio.hasSelectedApiKey();
          setIsKeySelected(hasKey);
        } catch (error) {
          console.error("Error checking for API key in AI Studio:", error);
          setIsKeySelected(false);
        }
      } else {
        // This is a Vercel or local dev environment
        setIsVercelEnv(true);
        if (import.meta.env.VITE_API_KEY) {
          setIsKeySelected(true);
        } else {
          setIsKeySelected(false);
        }
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
    if (isVercelEnv) {
        return <VercelInstructions />;
    }

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