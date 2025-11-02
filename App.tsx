
import React, { useState, useCallback, useEffect } from 'react';
import { Scenario, ChatMessage, Feedback, GamePhase } from './types';
import { getGatekeeperResponse, getPerformanceFeedback } from './services/geminiService';
import { Header } from './components/Header';
import { ScenarioSelector } from './components/ScenarioSelector';
import { ChatWindow } from './components/ChatWindow';
import { FeedbackPanel } from './components/FeedbackPanel';

const App: React.FC = () => {
  const [gamePhase, setGamePhase] = useState<GamePhase>(GamePhase.ScenarioSelection);
  const [currentScenario, setCurrentScenario] = useState<Scenario | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFeedbackLoading, setIsFeedbackLoading] = useState(false);

  const handleSelectScenario = useCallback((scenario: Scenario) => {
    setCurrentScenario(scenario);
    setMessages([{ role: 'model', text: 'Hello, this is the front desk. How can I help you?' }]);
    setGamePhase(GamePhase.InProgress);
  }, []);

  const handleSendMessage = useCallback(async (messageText: string) => {
    if (!currentScenario) return;

    const newMessages: ChatMessage[] = [...messages, { role: 'user', text: messageText }];
    setMessages(newMessages);
    setIsLoading(true);

    const response = await getGatekeeperResponse(currentScenario, newMessages);

    setMessages(prev => [...prev, { role: 'model', text: response }]);
    setIsLoading(false);
  }, [currentScenario, messages]);

  const handleEndSimulation = useCallback(async () => {
    if (!currentScenario || messages.length < 2) return;
    
    setGamePhase(GamePhase.Feedback);
    setIsFeedbackLoading(true);

    const performanceFeedback = await getPerformanceFeedback(currentScenario, messages);
    setFeedback(performanceFeedback);
    setIsFeedbackLoading(false);

  }, [currentScenario, messages]);

  const handleRestart = () => {
    setGamePhase(GamePhase.ScenarioSelection);
    setCurrentScenario(null);
    setMessages([]);
    setFeedback(null);
  };

  const renderContent = () => {
    switch (gamePhase) {
      case GamePhase.ScenarioSelection:
        return <ScenarioSelector onSelectScenario={handleSelectScenario} />;
      case GamePhase.InProgress:
      case GamePhase.Feedback:
        if (!currentScenario) return null;
        return (
          <div className="container mx-auto p-4 md:p-8 flex-grow">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
               <div style={{height: 'calc(100vh - 150px)'}}>
                 <ChatWindow
                    scenario={currentScenario}
                    messages={messages}
                    onSendMessage={handleSendMessage}
                    onEndSimulation={handleEndSimulation}
                    isLoading={isLoading}
                />
               </div>
               <div style={{height: 'calc(100vh - 150px)'}}>
                {gamePhase === GamePhase.Feedback && (
                    <FeedbackPanel feedback={feedback} onRestart={handleRestart} isLoading={isFeedbackLoading} />
                )}
               </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-900">
      <Header />
      <main className="flex-grow">
        {renderContent()}
      </main>
    </div>
  );
};

export default App;