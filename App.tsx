import React, { useState, useCallback } from 'react';
import { Scenario, ChatMessage, Feedback } from './types';
import { getPerformanceFeedback } from './services/geminiService';
import { Header } from './components/Header';
import { ScenarioSelector } from './components/ScenarioSelector';
import { ChatWindow } from './components/ChatWindow';
import { FeedbackPanel } from './components/FeedbackPanel';
import { ApiKeyPrompt } from './components/ApiKeyPrompt';

const SUCCESS_MESSAGES: { [key: string]: (name: string) => string } = {
    'en-US': (name) => `🎉 Success! You've been connected with ${name}. Click "End & Get Feedback" to see your analysis.`,
    'ru-RU': (name) => `🎉 Успех! Вы соединились с ${name}. Нажмите "Завершить и получить отзыв", чтобы увидеть анализ.`,
    'uk-UA': (name) => `🎉 Успіх! Вас з'єднали з ${name}. Натисніть "Завершити та отримати відгук", щоб побачити аналіз.`,
    'de-DE': (name) => `🎉 Erfolg! Sie wurden mit ${name} verbunden. Klicken Sie auf "Beenden & Feedback erhalten", um Ihre Analyse zu sehen.`,
    'es-ES': (name) => `🎉 ¡Éxito! Te han conectado con ${name}. Haz clic en "Finalizar y obtener comentarios" para ver tu análisis.`,
    'fr-FR': (name) => `🎉 Succès ! Vous avez été mis en relation avec ${name}. Cliquez sur "Terminer et obtenir un feedback" pour voir votre analyse.`,
    'fil-PH': (name) => `🎉 Tagumpay! Nakakonekta ka na kay ${name}. I-click ang "Tapusin at Kumuha ng Feedback" para makita ang iyong pagsusuri.`,
};

const App: React.FC = () => {
  const [currentScenario, setCurrentScenario] = useState<Scenario | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [isLoadingFeedback, setIsLoadingFeedback] = useState(false);
  const [isSimulationSuccess, setIsSimulationSuccess] = useState(false);
  const [selectedLang, setSelectedLang] = useState('uk-UA');

  const handleSelectScenario = useCallback((scenario: Scenario) => {
    setCurrentScenario(scenario);
    setMessages([]);
    setFeedback(null);
    setIsLoadingFeedback(false);
    setIsSimulationSuccess(false);
  }, []);

  const handleEndSimulation = useCallback(async () => {
    if (!currentScenario || messages.length === 0 || isLoadingFeedback) return;
    
    setIsLoadingFeedback(true);
    
    // This is the correct way to handle state updates before an async call.
    // Create a new variable with the final state of the messages array.
    let updatedMessages = [...messages];

    if (isSimulationSuccess) {
      const successText = SUCCESS_MESSAGES[selectedLang]?.(currentScenario.decisionMaker) || SUCCESS_MESSAGES['en-US'](currentScenario.decisionMaker);
      const successMessage: ChatMessage = { 
          role: 'model', 
          text: successText
      };
      updatedMessages.push(successMessage);
      // Update the UI with the final list of messages.
      setMessages(updatedMessages);
    }

    // Pass the guaranteed up-to-date message list to the feedback function.
    const performanceFeedback = await getPerformanceFeedback(currentScenario, updatedMessages, isSimulationSuccess, selectedLang);
    
    setFeedback(performanceFeedback);
    setIsLoadingFeedback(false);
  }, [currentScenario, messages, isSimulationSuccess, selectedLang, isLoadingFeedback]);

  const handleSuccess = useCallback(() => {
    setIsSimulationSuccess(true);
    // The visual feedback for success is now handled in `handleEndSimulation`
    // to ensure it appears just before the feedback panel.
  }, []);


  const handleRestart = () => {
    setCurrentScenario(null);
    setMessages([]);
    setFeedback(null);
    setIsLoadingFeedback(false);
    setIsSimulationSuccess(false);
  };
  
  const showFeedbackPanel = isLoadingFeedback || !!feedback;
  const isChatReadOnly = isLoadingFeedback || !!feedback || isSimulationSuccess;

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
                    setMessages={setMessages}
                    onEndSimulation={handleEndSimulation}
                    isReadOnly={isChatReadOnly}
                    selectedLang={selectedLang}
                    onLangChange={setSelectedLang}
                    onSuccess={handleSuccess}
                />
                {showFeedbackPanel && (
                    <FeedbackPanel 
                        feedback={feedback} 
                        onRestart={handleRestart} 
                        isLoading={isLoadingFeedback}
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