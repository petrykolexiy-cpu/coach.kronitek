import React, { useState, useCallback } from 'react';
import { Scenario, ChatMessage, Feedback } from './types';
import { getGatekeeperResponse, getPerformanceFeedback } from './services/geminiService';
import { Header } from './components/Header';
import { ScenarioSelector } from './components/ScenarioSelector';
import { ChatWindow } from './components/ChatWindow';
import { FeedbackPanel } from './components/FeedbackPanel';
import { ApiKeyPrompt } from './components/ApiKeyPrompt';

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

const App: React.FC = () => {
  const [currentScenario, setCurrentScenario] = useState<Scenario | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [isLoading, setIsLoading] = useState(false); // For chat responses
  const [isFeedbackLoading, setIsFeedbackLoading] = useState(false); // For feedback
  const [isSimulationSuccess, setIsSimulationSuccess] = useState(false);
  
  // FIX: Removed API key check logic. As per guidelines, the API key is assumed to be available
  // via process.env.API_KEY and is handled in geminiService.ts.

  const handleSelectScenario = useCallback((scenario: Scenario) => {
    setCurrentScenario(scenario);
    setMessages([{ role: 'model', text: 'Hello, this is the front desk. How can I help you?' }]);
    setFeedback(null);
  }, []);

  const handleEndSimulation = useCallback(async () => {
    if (!currentScenario || messages.length < 2) return;
    
    setIsFeedbackLoading(true);
    const performanceFeedback = await getPerformanceFeedback(currentScenario, messages, isSimulationSuccess);
    setFeedback(performanceFeedback);
    setIsFeedbackLoading(false);
  }, [currentScenario, messages, isSimulationSuccess]);

  const handleSendMessage = useCallback(async (messageText: string) => {
    if (!currentScenario) return;

    const newMessages: ChatMessage[] = [...messages, { role: 'user', text: messageText }];
    setMessages(newMessages);
    setIsLoading(true);

    const { text: response, connected } = await getGatekeeperResponse(currentScenario, newMessages);

    setMessages(prev => [...prev, { role: 'model', text: response }]);
    
    if (connected) {
      await delay(500);
      setMessages(prev => [...prev, { 
        role: 'model', 
        text: `🎉 Success! You've reached ${currentScenario.decisionMaker}. Click "End & Get Feedback" to see your analysis.` 
      }]);
      setIsSimulationSuccess(true);
      setIsLoading(false);
    } else {
      setIsLoading(false);
    }
  }, [currentScenario, messages]);

  const handleRestart = () => {
    setCurrentScenario(null);
    setMessages([]);
    setFeedback(null);
    setIsLoading(false);
    setIsFeedbackLoading(false);
    setIsSimulationSuccess(false);
  };
  
  const showFeedbackPanel = isFeedbackLoading || !!feedback;
  const isChatReadOnly = isFeedbackLoading || !!feedback || isSimulationSuccess;

  return (
    <div className="min-h-screen flex flex-col bg-slate-900">
      <Header />
      <main className="flex-grow">
        {!currentScenario ? (
          <ScenarioSelector onSelectScenario={handleSelectScenario} />
        ) : (
          <div className="container mx-auto p-4 md:p-8 flex-grow">
             <div className="mb-6">
                <button
                    onClick={handleRestart}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-slate-200 rounded-md font-semibold hover:bg-slate-600 transition-colors"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
                    </svg>
                    Back to Main Menu
                </button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
              <div style={{height: 'calc(100vh - 220px)'}}>
                <ChatWindow
                    scenario={currentScenario}
                    messages={messages}
                    onSendMessage={handleSendMessage}
                    onEndSimulation={handleEndSimulation}
                    isLoading={isLoading}
                    isReadOnly={isChatReadOnly}
                />
              </div>
              <div style={{height: 'calc(100vh - 220px)'}}>
                {showFeedbackPanel && (
                    <FeedbackPanel 
                        feedback={feedback} 
                        onRestart={handleRestart} 
                        isLoading={isFeedbackLoading}
                    />
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;