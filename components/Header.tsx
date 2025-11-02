import React from 'react';

export const Header: React.FC = () => {
    return (
        <header className="bg-slate-900/70 backdrop-blur-md sticky top-0 z-10 p-4 border-b border-slate-700">
            <div className="container mx-auto flex justify-center items-center">
                <h1 className="text-xl md:text-2xl font-bold text-gray-100">
                   Decision-Maker Outreach Trainer
                </h1>
            </div>
        </header>
    );
};