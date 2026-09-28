'use client';

import React, { useState } from 'react';
import { Bot, Send, X, Sparkles, User } from 'lucide-react';

interface ChatMessage {
  sender: 'ai' | 'user';
  text: string;
}

export default function AILearningAssistant() {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [inputText, setInputText] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      sender: 'ai',
      text: 'Hello! I am your EduVerse AI Tutor. Ask me any question about Biology, Chemistry, Physics, Math, or Computer Science!'
    }
  ]);

  const handleSend = () => {
    if (!inputText.trim()) return;

    const userMsg = inputText.trim();
    setMessages((prev) => [...prev, { sender: 'user', text: userMsg }]);
    setInputText('');

    // Simulated intelligent response
    setTimeout(() => {
      let reply = 'That is a great question! In science and mathematics, understanding core concepts step-by-step is key.';
      if (userMsg.toLowerCase().includes('cell') || userMsg.toLowerCase().includes('mitochondria')) {
        reply = 'Mitochondria are double-membrane bound organelles responsible for producing ATP through cellular respiration!';
      } else if (userMsg.toLowerCase().includes('atom') || userMsg.toLowerCase().includes('proton')) {
        reply = 'Atoms consist of protons (+) and neutrons (0) in the central nucleus, surrounded by orbiting electrons (-).';
      } else if (userMsg.toLowerCase().includes('pendulum') || userMsg.toLowerCase().includes('gravity')) {
        reply = 'A simple pendulum displays Simple Harmonic Motion (SHM). Its time period T = 2π √(L/g).';
      }

      setMessages((prev) => [...prev, { sender: 'ai', text: reply }]);
    }, 600);
  };

  return (
    <>
      {/* Floating Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 bg-gradient-to-r from-sky-600 to-indigo-600 text-white p-3.5 rounded-full shadow-xl shadow-sky-300/50 hover:scale-110 transition-all flex items-center gap-2 font-bold text-xs border border-white/20"
        >
          <Bot className="w-5 h-5 animate-bounce" />
          <span>Ask AI Tutor</span>
        </button>
      )}

      {/* Drawer Container */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-96 max-w-[calc(100vw-2rem)] bg-white border border-sky-100 rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[500px] animate-in fade-in slide-in-from-bottom-5 duration-200">
          {/* Header */}
          <div className="bg-gradient-to-r from-sky-600 to-indigo-600 p-4 text-white flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-cyan-300" />
              <div>
                <h4 className="text-xs font-bold leading-none">EduVerse AI Tutor</h4>
                <span className="text-[10px] text-sky-100">Next.js + TS AI Assistant</span>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="p-1 rounded-full hover:bg-white/20">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-sky-50/30 text-xs">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex gap-2 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {m.sender === 'ai' && (
                  <div className="w-6 h-6 rounded-full bg-sky-600 text-white flex items-center justify-center shrink-0 mt-1">
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                )}
                <div
                  className={`p-3 rounded-2xl max-w-[80%] leading-relaxed ${
                    m.sender === 'user'
                      ? 'bg-sky-600 text-white font-medium rounded-tr-none shadow-xs'
                      : 'bg-white border border-sky-100 text-slate-800 rounded-tl-none shadow-xs'
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
          </div>

          {/* Input Box */}
          <div className="p-3 bg-white border-t border-sky-100 flex gap-2">
            <input
              type="text"
              placeholder="Ask AI a question..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              className="flex-1 px-3.5 py-2 rounded-xl border border-sky-200 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
            <button
              onClick={handleSend}
              className="p-2 rounded-xl bg-sky-600 text-white hover:bg-sky-700 transition-all shadow-xs"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
