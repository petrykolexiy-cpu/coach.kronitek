import React, { useState, useCallback } from 'react';
import { Scenario, ChatMessage, Feedback } from './types';
import { getInitialGreeting, getGatekeeperResponse, getPerformanceFeedback } from './services/geminiService';
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
  const [isLoading, setIsLoading] = useState(false);
  const [isFeedbackLoading, setIsFeedbackLoading] = useState(false);
  const [isSimulationSuccess, setIsSimulationSuccess] = useState(false);
  const [selectedLang, setSelectedLang] = useState('en-US');

  const handleSelectScenario = useCallback(async (scenario: Scenario) => {
    setCurrentScenario(scenario);
    setMessages([]);
    setFeedback(null);
    setIsLoading(true);

    const greeting = await getInitialGreeting(scenario, selectedLang);
    setMessages([{ role: 'model', text: greeting }]);
    
    setIsLoading(false);
  }, [selectedLang]);

  const handleEndSimulation = useCallback(async () => {
    if (!currentScenario || messages.length < 2) return;
    
    setIsFeedbackLoading(true);
    const performanceFeedback = await getPerformanceFeedback(currentScenario, messages, isSimulationSuccess, selectedLang);
    setFeedback(performanceFeedback);
    setIsFeedbackLoading(false);
  }, [currentScenario, messages, isSimulationSuccess, selectedLang]);

  const handleSendMessage = useCallback(async (messageText: string) => {
    if (!currentScenario) return;

    const userMessage: ChatMessage = { role: 'user', text: messageText };
    
    // Create the definitive history for this turn's API call *before* any state updates.
    const historyForApi = [...messages, userMessage];

    // Optimistically update the UI with the user's message.
    setMessages(historyForApi); 
    setIsLoading(true);

    const { text: response, connected } = await getGatekeeperResponse(currentScenario, historyForApi, selectedLang);

    // After the API call, prepare all new messages from the model.
    const modelMessages: ChatMessage[] = [{ role: 'model', text: response }];

    if (connected) {
        await delay(500);
        modelMessages.push({ 
            role: 'model', 
            text: `🎉 Success! You've reached ${currentScenario.decisionMaker}. Click "End & Get Feedback" to see your analysis.` 
        });
    }

    // Append all model messages in a single, atomic update.
    setMessages(prev => [...prev, ...modelMessages]);
    
    if (connected) {
        setIsSimulationSuccess(true);
    }
    
    setIsLoading(false);
  }, [currentScenario, messages, selectedLang]);


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
    <ApiKeyPrompt>
      <div className="min-h-screen flex flex-col bg-slate-900">
        <Header />
        <main className="flex-grow flex flex-col">
          {!currentScenario ? (
            <ScenarioSelector onSelectScenario={handleSelectScenario} />
          ) : (
            <div className="container mx-auto p-4 md:p-8 flex-grow flex flex-col">
               <div className="mb-6 flex-shrink-0">
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
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 flex-grow">
                <ChatWindow
                    scenario={currentScenario}
                    messages={messages}
                    onSendMessage={handleSendMessage}
                    onEndSimulation={handleEndSimulation}
                    isLoading={isLoading}
                    isReadOnly={isChatReadOnly}
                    selectedLang={selectedLang}
                    onLangChange={setSelectedLang}
                />
                {showFeedbackPanel && (
                    <FeedbackPanel 
                        feedback={feedback} 
                        onRestart={handleRestart} 
                        isLoading={isFeedbackLoading}
                    />
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </ApiKeyPrompt>
  );
};

export default App;