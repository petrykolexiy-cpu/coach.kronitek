
import React from 'react';
import { Scenario } from '../types';
import { SCENARIOS } from '../constants';

interface ScenarioSelectorProps {
  onSelectScenario: (scenario: Scenario) => void;
}

const ArrowRightIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 8.25 21 12m0 0-3.75 3.75M21 12H3" />
    </svg>
);

const complexityStyles: { [key in Scenario['complexity']]: string } = {
  easy: 'bg-green-500/20 text-green-400 border-green-500/30',
  medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  hard: 'bg-red-500/20 text-red-400 border-red-500/30',
};


export const ScenarioSelector: React.FC<ScenarioSelectorProps> = ({ onSelectScenario }) => {
  return (
    <div className="container mx-auto p-4 md:p-8">
      <h2 className="text-3xl font-bold text-center mb-2 text-white">Choose a Scenario</h2>
      <p className="text-lg text-slate-400 text-center mb-8">Start your training by selecting one of the simulations.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {SCENARIOS.map((scenario) => (
          <div
            key={scenario.id}
            className="bg-slate-800 rounded-lg p-6 flex flex-col justify-between border border-slate-700 hover:border-blue-500 hover:shadow-2xl hover:shadow-blue-500/10 transform hover:-translate-y-1 transition-all duration-300 cursor-pointer"
            onClick={() => onSelectScenario(scenario)}
          >
            <div>
                <div className="flex justify-between items-start mb-2 gap-2">
                    <h3 className="text-xl font-semibold text-blue-400">{scenario.title}</h3>
                    <span className={`flex-shrink-0 px-2 py-0.5 text-xs font-semibold rounded-full border ${complexityStyles[scenario.complexity]}`}>
                        {scenario.complexity.toUpperCase()}
                    </span>
                </div>
                <p className="text-slate-300 mb-4">{scenario.description}</p>
            </div>
            <div className="flex justify-end items-center mt-4">
                <span className="text-blue-500 font-semibold flex items-center gap-2">
                    Start
                    <ArrowRightIcon />
                </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
