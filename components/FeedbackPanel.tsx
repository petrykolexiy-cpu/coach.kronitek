
import React from 'react';
import { Feedback } from '../types';

interface FeedbackPanelProps {
  feedback: Feedback | null;
  onRestart: () => void;
  isLoading: boolean;
}

const CheckIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-green-400">
        <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.052-.143Z" clipRule="evenodd" />
    </svg>
);

const ImprovementIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-yellow-400">
        <path fillRule="evenodd" d="M15.988 3.012A10 10 0 1 1 4.012 15.988 10 10 0 0 1 15.988 3.012ZM10 15.25a.75.75 0 0 1-.75-.75V8.5a.75.75 0 0 1 1.5 0v6a.75.75 0 0 1-.75.75ZM9.25 6a.75.75 0 0 0 0 1.5h.008a.75.75 0 0 0 0-1.5H9.25Z" clipRule="evenodd" />
    </svg>
);


const LoadingSpinner: React.FC = () => (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <svg className="animate-spin -ml-1 mr-3 h-10 w-10 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <h3 className="text-xl font-semibold mt-4 text-white">Analyzing your dialogue...</h3>
        <p className="text-slate-400 mt-1">The AI coach is preparing personalized recommendations.</p>
    </div>
);


export const FeedbackPanel: React.FC<FeedbackPanelProps> = ({ feedback, onRestart, isLoading }) => {
  if (isLoading) {
      return (
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-6 flex items-center justify-center h-full">
            <LoadingSpinner />
        </div>
      );
  }
  
  if (!feedback) return null;

  const scoreColor = feedback.overallScore >= 8 ? 'text-green-400' : feedback.overallScore >= 5 ? 'text-yellow-400' : 'text-red-400';

  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700 p-6 h-full flex flex-col">
      <h2 className="text-2xl font-bold mb-4 text-center text-white">Feedback</h2>
      <div className="flex-grow overflow-y-auto pr-2">
        <div className="text-center mb-6">
            <p className="text-slate-400">Overall Score</p>
            <p className={`text-6xl font-bold ${scoreColor}`}>{feedback.overallScore}<span className="text-3xl text-slate-500">/10</span></p>
        </div>

        <div className="bg-slate-900/50 p-4 rounded-lg mb-6">
            <h4 className="font-semibold text-lg mb-2 text-slate-300">Summary</h4>
            <p className="text-slate-400">{feedback.summary}</p>
        </div>

        <div>
          <h4 className="font-semibold text-lg mb-3 text-green-400">Strengths</h4>
          <ul className="space-y-2 mb-6">
            {feedback.strengths.map((item, index) => (
              <li key={index} className="flex items-start gap-3">
                <CheckIcon />
                <span className="text-slate-300">{item}</span>
              </li>
            ))}
          </ul>

          <h4 className="font-semibold text-lg mb-3 text-yellow-400">Areas for Improvement</h4>
          <ul className="space-y-2">
            {feedback.improvements.map((item, index) => (
              <li key={index} className="flex items-start gap-3">
                <ImprovementIcon />
                <span className="text-slate-300">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="mt-6 flex-shrink-0">
         <button
            onClick={onRestart}
            className="w-full px-4 py-3 bg-blue-600 text-white rounded-md font-semibold hover:bg-blue-700 transition-colors"
          >
            Start New Simulation
        </button>
      </div>
    </div>
  );
};