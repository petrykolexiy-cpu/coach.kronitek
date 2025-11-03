
import React, { useState, useCallback } from 'react';
import { Scenario, ChatMessage, Feedback } from './types';
import { getGatekeeperResponse, getPerformanceFeedback } from './services/geminiService';
import { Header } from './components/Header';
import { ScenarioSelector } from './components/ScenarioSelector';
import { ChatWindow } from './components/ChatWindow';
import { FeedbackPanel } from './components/FeedbackPanel';

// A simple utility for delays
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

const App: React.FC = () => {
  const [currentScenario, setCurrentScenario] = useState<Scenario | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [isLoading, setIsLoading] = useState(false); // For chat responses
  const [isFeedbackLoading, setIsFeedbackLoading] = useState(false); // For feedback

  const handleSelectScenario = useCallback((scenario: Scenario) => {
    setCurrentScenario(scenario);
    setMessages([{ role: 'model', text: 'Hello, this is the front desk. How can I help you?' }]);
    setFeedback(null);
  }, []);

  const handleEndSimulation = useCallback(async (success: boolean = false) => {
    if (!currentScenario || messages.length < 2) return;
    
    setIsFeedbackLoading(true);
    const performanceFeedback = await getPerformanceFeedback(currentScenario, messages, success);
    setFeedback(performanceFeedback);
    setIsFeedbackLoading(false);
  }, [currentScenario, messages]);

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
        text: `🎉 Success! You've reached ${currentScenario.decisionMaker}. Generating feedback...` 
      }]);
      setIsLoading(false); // Stop chat loading indicator
      await delay(1500);
      await handleEndSimulation(true);
    } else {
      setIsLoading(false);
    }
  }, [currentScenario, messages, handleEndSimulation]);

  const handleRestart = () => {
    setCurrentScenario(null);
    setMessages([]);
    setFeedback(null);
    setIsLoading(false);
    setIsFeedbackLoading(false);
  };
  
  const showFeedbackPanel = isFeedbackLoading || !!feedback;
  const isChatReadOnly = isFeedbackLoading || !!feedback;

  return (
    <div className="min-h-screen flex flex-col bg-slate-900">
      <Header />
      <main className="flex-grow">
        {!currentScenario ? (
          <ScenarioSelector onSelectScenario={handleSelectScenario} />
        ) : (
          <div className="container mx-auto p-4 md:p-8 flex-grow">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
              <div style={{height: 'calc(100vh - 150px)'}}>
                <ChatWindow
                    scenario={currentScenario}
                    messages={messages}
                    onSendMessage={handleSendMessage}
                    onEndSimulation={() => handleEndSimulation(false)}
                    isLoading={isLoading}
                    isReadOnly={isChatReadOnly}
                />
              </div>
              <div style={{height: 'calc(100vh - 150px)'}}>
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
