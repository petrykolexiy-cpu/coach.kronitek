import React from 'react';

export const ApiKeyPrompt: React.FC = () => {
    return (
        <div className="container mx-auto p-4 md:p-8 flex items-center justify-center" style={{height: 'calc(100vh - 100px)'}}>
            <div className="bg-slate-800 border border-rose-500/50 rounded-lg p-8 max-w-2xl text-center shadow-2xl shadow-rose-500/10">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16 mx-auto text-rose-500 mb-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                </svg>

                <h2 className="text-3xl font-bold text-white mb-3">Action Required: Configure API Key</h2>
                <p className="text-slate-400 mb-6 text-lg">
                    This application requires a Google Gemini API key to function. The simulator is currently disabled because the key has not been provided.
                </p>
                <div className="text-left bg-slate-900 p-4 rounded-md">
                    <p className="text-slate-300 font-semibold mb-2">To fix this, follow these steps:</p>
                    <ol className="list-decimal list-inside text-slate-400 space-y-2">
                        <li>Go to your project settings on the Netlify platform.</li>
                        <li>Navigate to <code className="bg-slate-700 px-1 py-0.5 rounded text-amber-400">Site settings &gt; Build & deploy &gt; Environment</code>.</li>
                        <li>Click "Add a variable" and create a new environment variable:</li>
                        <ul className="list-disc list-inside ml-6 mt-2 bg-slate-800 p-3 rounded">
                           <li><strong>Key:</strong> <code className="bg-slate-700 px-1 py-0.5 rounded text-amber-400">VITE_API_KEY</code></li>
                           <li><strong>Value:</strong> <code className="bg-slate-700 px-1 py-0.5 rounded text-amber-400">[Your Google Gemini API Key]</code></li>
                        </ul>
                         <li className="mt-2">After adding the variable, trigger a new deploy for your site.</li>
                    </ol>
                </div>
                 <p className="text-slate-500 mt-6 text-sm">
                    Once the API key is set correctly, this message will disappear and the application will be fully functional.
                </p>
            </div>
        </div>
    );
};
