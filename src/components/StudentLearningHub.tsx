'use client';

import React, { useEffect, useState } from 'react';
import {
  BookOpen,
  Award,
  Zap,
  Bookmark,
  CheckCircle2,
  Clock,
  Sparkles,
  HelpCircle,
  X,
  FileText,
  Plus,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import confetti from 'canvas-confetti';
import BioCell3DEngine from './engines/BioCell3DEngine';
import ChemistryAtomEngine from './engines/ChemistryAtomEngine';
import PhysicsPendulumEngine from './engines/PhysicsPendulumEngine';
import MathTrigEngine from './engines/MathTrigEngine';
import CSCodeEngine from './engines/CSCodeEngine';
import { Topic, Question, StudentProfile, RevisionNote } from '@/types';

interface HubProps {
  studentProfile: StudentProfile;
  onUpdateProfile: (updated: StudentProfile) => void;
}

const CLASSES_LIST = [
  { id: 6, label: 'Class 6' },
  { id: 7, label: 'Class 7' },
  { id: 8, label: 'Class 8' },
  { id: 9, label: 'Class 9' },
  { id: 10, label: 'Class 10' },
  { id: 11, label: 'Class 11' },
  { id: 12, label: 'Class 12' }
];

const SUBJECTS_LIST = [
  { id: 'bio', name: 'Biology', accentColor: '#10b981' },
  { id: 'chem', name: 'Chemistry', accentColor: '#f59e0b' },
  { id: 'phy', name: 'Physics', accentColor: '#3b82f6' },
  { id: 'math', name: 'Mathematics', accentColor: '#ec4899' },
  { id: 'cs', name: 'Computer Science', accentColor: '#8b5cf6' }
];

export default function StudentLearningHub({ studentProfile, onUpdateProfile }: HubProps) {
  const [activeClassId, setActiveClassId] = useState<number>(9);
  const [activeSubjectId, setActiveSubjectId] = useState<string>('bio');
  const [availableTopics, setAvailableTopics] = useState<Topic[]>([]);
  const [activeTopic, setActiveTopic] = useState<Topic | null>(null);

  const [loadingTopics, setLoadingTopics] = useState<boolean>(true);
  const [bookmarkedTopicIds, setBookmarkedTopicIds] = useState<string[]>([]);
  const [notes, setNotes] = useState<RevisionNote[]>([]);
  const [newNoteText, setNewNoteText] = useState<string>('');

  const [showQuizModal, setShowQuizModal] = useState<boolean>(false);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState<boolean>(false);
  const [earnedXp, setEarnedXp] = useState<number>(0);

  // Fetch topics from Next.js API
  useEffect(() => {
    async function fetchTopics() {
      setLoadingTopics(true);
      try {
        const res = await fetch(`/api/topics?grade=${activeClassId}&subjectId=${activeSubjectId}`);
        const data = await res.json();
        if (data.success) {
          setAvailableTopics(data.topics);
          if (data.topics.length > 0) {
            setActiveTopic(data.topics[0]);
          } else {
            setActiveTopic(null);
          }
        }
      } catch (err) {
        console.error('Failed to fetch topics:', err);
      } finally {
        setLoadingTopics(false);
      }
    }
    fetchTopics();
  }, [activeClassId, activeSubjectId]);

  // Fetch bookmarks & notes
  useEffect(() => {
    if (!activeTopic) return;

    async function loadData() {
      if (!activeTopic) return;
      try {
        const bmRes = await fetch('/api/bookmarks');
        const bmData = await bmRes.json();
        if (bmData.success) setBookmarkedTopicIds(bmData.bookmarks);

        const notesRes = await fetch(`/api/notes?topicId=${activeTopic.id}`);
        const notesData = await notesRes.json();
        if (notesData.success) setNotes(notesData.notes);
      } catch (err) {
        console.error('Failed to load notes/bookmarks:', err);
      }
    }
    loadData();
  }, [activeTopic]);

  const handleToggleBookmark = async () => {
    if (!activeTopic) return;
    try {
      const res = await fetch('/api/bookmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topicId: activeTopic.id })
      });
      const data = await res.json();
      if (data.success) {
        setBookmarkedTopicIds(data.bookmarks);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddNote = async () => {
    if (!newNoteText.trim() || !activeTopic) return;
    try {
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topicId: activeTopic.id, text: newNoteText })
      });
      const data = await res.json();
      if (data.success) {
        setNotes(data.notes);
        setNewNoteText('');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectTopic = (topic: Topic) => {
    setActiveTopic(topic);
    setShowQuizModal(false);
    setQuizSubmitted(false);
    setSelectedAnswers({});
  };

  const handleQuizOptionSelect = (questionId: number, optionIndex: number) => {
    if (quizSubmitted) return;
    setSelectedAnswers((prev) => ({ ...prev, [questionId]: optionIndex }));
  };

  const handleSubmitQuiz = async () => {
    if (!activeTopic) return;

    let score = 0;
    activeTopic.questions.forEach((q) => {
      if (selectedAnswers[q.id] === q.correctIndex) score += 1;
    });

    const xp = score * 50 + 50;
    setEarnedXp(xp);
    setQuizSubmitted(true);

    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });

    try {
      const res = await fetch('/api/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topicId: activeTopic.id,
          score,
          totalQuestions: activeTopic.questions.length,
          xpEarned: xp
        })
      });
      const data = await res.json();
      if (data.success && data.profile) {
        onUpdateProfile(data.profile);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const renderEngine = () => {
    if (!activeTopic) return null;

    switch (activeTopic.engineType) {
      case 'biocell':
        return <BioCell3DEngine topic={activeTopic} />;
      case 'chemistry':
        return <ChemistryAtomEngine topic={activeTopic} />;
      case 'physics':
        return <PhysicsPendulumEngine topic={activeTopic} />;
      case 'math':
        return <MathTrigEngine topic={activeTopic} />;
      case 'cs':
        return <CSCodeEngine topic={activeTopic} />;
      default:
        return <BioCell3DEngine topic={activeTopic} />;
    }
  };

  const isBookmarked = activeTopic ? bookmarkedTopicIds.includes(activeTopic.id) : false;

  return (
    <div className="space-y-6">
      {/* Grade & Subject Selector */}
      <div className="bg-white border border-sky-100 rounded-2xl p-4 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Grade Level</span>
            <div className="flex flex-wrap gap-1.5">
              {CLASSES_LIST.map((cls) => (
                <button
                  key={cls.id}
                  onClick={() => setActiveClassId(cls.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                    activeClassId === cls.id
                      ? 'bg-sky-600 text-white border-sky-600 shadow-md shadow-sky-200'
                      : 'bg-white text-slate-600 border-sky-100 hover:border-sky-300 hover:text-sky-600'
                  }`}
                >
                  {cls.label}
                </button>
              ))}
            </div>
          </div>

          <div className="md:border-l md:pl-4 border-sky-100">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Subject</span>
            <div className="flex flex-wrap gap-2">
              {SUBJECTS_LIST.map((sub) => (
                <button
                  key={sub.id}
                  onClick={() => setActiveSubjectId(sub.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 ${
                    activeSubjectId === sub.id
                      ? 'bg-sky-600 text-white border-sky-600 shadow-md shadow-sky-200'
                      : 'bg-white text-slate-600 border-sky-100 hover:border-sky-300 hover:text-sky-600'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: sub.accentColor }} />
                  {sub.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Topic Navigator */}
        <div className="lg:col-span-3 space-y-3">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-sky-600" />
            Class {activeClassId} Topics
          </h3>

          {loadingTopics ? (
            <div className="bg-white border border-sky-100 rounded-2xl p-6 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-sky-500" /> Loading Topics from PostgreSQL...
            </div>
          ) : availableTopics.length === 0 ? (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-800 flex gap-2 items-start">
              <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <span>No topics available for Class {activeClassId} in this subject.</span>
            </div>
          ) : (
            <div className="space-y-2.5">
              {availableTopics.map((topic) => {
                const isSelected = activeTopic?.id === topic.id;
                return (
                  <div
                    key={topic.id}
                    onClick={() => handleSelectTopic(topic)}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-sky-50/80 border-sky-300 shadow-sm ring-1 ring-sky-300'
                        : 'bg-white border-sky-100 hover:border-sky-200 hover:bg-sky-50/40'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1.5">
                      <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-sky-100 text-sky-700 border border-sky-200">
                        {topic.category}
                      </span>
                      <span className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {topic.estimatedTime}
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-slate-900 mb-1 leading-snug">{topic.title}</h4>
                    <p className="text-[11px] text-slate-500 line-clamp-2">{topic.subtitle}</p>
                    <div className="mt-2 pt-2 border-t border-sky-50 flex items-center justify-between text-[10px]">
                      <span className="text-emerald-600 font-bold flex items-center gap-1">
                        <Zap className="w-3 h-3" /> +{topic.xpReward} XP
                      </span>
                      <span className="text-slate-400 font-mono truncate max-w-[80px]">{topic.badge}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Learning Workspace */}
        <div className="lg:col-span-9 space-y-4">
          {!activeTopic ? (
            <div className="bg-white border border-sky-100 rounded-2xl p-12 text-center shadow-xs">
              <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-slate-800 mb-1">Select a Topic</h3>
            </div>
          ) : (
            <>
              {/* Topic Header */}
              <div className="bg-white border border-sky-100 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-sky-600 uppercase tracking-wider">{activeTopic.category}</span>
                    <span className="text-xs text-slate-300">•</span>
                    <span className="text-xs text-slate-500 font-medium">Class {activeClassId}</span>
                  </div>
                  <h2 className="text-xl md:text-2xl font-black text-slate-900">{activeTopic.title}</h2>
                  <p className="text-xs text-slate-600 mt-1">{activeTopic.subtitle}</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleToggleBookmark}
                    className={`p-2.5 rounded-xl border transition-all ${
                      isBookmarked
                        ? 'bg-amber-50 border-amber-300 text-amber-600'
                        : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-amber-500' : ''}`} />
                  </button>

                  <button
                    onClick={() => setShowQuizModal(true)}
                    className="px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-md shadow-sky-200 flex items-center gap-2 transition-all"
                  >
                    <HelpCircle className="w-4 h-4" /> Start Topic Quiz
                  </button>
                </div>
              </div>

              {/* 3D WebGL Engine View */}
              {renderEngine()}

              {/* Notes & Summary Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Concept Summary */}
                <div className="bg-white border border-sky-100 rounded-2xl p-4 shadow-xs space-y-2">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-sky-600" /> Key Takeaways
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed bg-sky-50/50 p-3 rounded-xl border border-sky-100">
                    {activeTopic.theorySummary}
                  </p>
                </div>

                {/* Revision Notes */}
                <div className="bg-white border border-sky-100 rounded-2xl p-4 shadow-xs space-y-3">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-sky-600" /> My Notes (PostgreSQL Synced)
                  </h4>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Add a revision note..."
                      value={newNoteText}
                      onChange={(e) => setNewNoteText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
                      className="flex-1 px-3 py-1.5 rounded-xl border border-sky-200 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                    <button
                      onClick={handleAddNote}
                      className="px-3 py-1.5 rounded-xl bg-sky-600 text-white font-bold text-xs flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add
                    </button>
                  </div>

                  <div className="space-y-1.5 max-h-28 overflow-y-auto">
                    {notes.length === 0 ? (
                      <span className="text-[11px] text-slate-400 italic">No notes saved for this topic yet.</span>
                    ) : (
                      notes.map((n) => (
                        <div key={n.id} className="text-xs text-slate-700 bg-slate-50 p-2 rounded-lg border border-slate-100">
                          {n.text}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Quiz Modal */}
      {showQuizModal && activeTopic && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-sky-100 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b border-sky-100 pb-3">
              <div>
                <span className="text-xs font-bold text-sky-600 uppercase tracking-wider">Practice Challenge</span>
                <h3 className="text-lg font-black text-slate-900">{activeTopic.title} Quiz</h3>
              </div>
              <button onClick={() => setShowQuizModal(false)} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
              {activeTopic.questions.map((q, idx) => (
                <div key={q.id} className="bg-sky-50/50 border border-sky-100 p-4 rounded-2xl space-y-2.5">
                  <h4 className="text-xs font-bold text-slate-800">
                    Q{idx + 1}: {q.question}
                  </h4>
                  <div className="space-y-1.5">
                    {q.options.map((opt, oIdx) => {
                      const isSelected = selectedAnswers[q.id] === oIdx;
                      const isCorrect = q.correctIndex === oIdx;

                      let btnStyle = 'bg-white border-sky-200 text-slate-700 hover:bg-sky-100/50';
                      if (quizSubmitted) {
                        if (isCorrect) btnStyle = 'bg-emerald-500 text-white border-emerald-600';
                        else if (isSelected) btnStyle = 'bg-rose-500 text-white border-rose-600';
                      } else if (isSelected) {
                        btnStyle = 'bg-sky-600 text-white border-sky-600 shadow-xs';
                      }

                      return (
                        <button
                          key={oIdx}
                          onClick={() => handleQuizOptionSelect(q.id, oIdx)}
                          className={`w-full text-left px-3.5 py-2 rounded-xl text-xs font-medium border transition-all ${btnStyle}`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-sky-100">
              {quizSubmitted ? (
                <div className="flex items-center gap-2 text-emerald-700 font-bold text-xs bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                  <Award className="w-4 h-4 text-emerald-600" /> Completed! +{earnedXp} XP Added to Profile!
                </div>
              ) : (
                <span className="text-xs text-slate-500">Answer all questions to gain XP.</span>
              )}

              {!quizSubmitted ? (
                <button
                  onClick={handleSubmitQuiz}
                  className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-md shadow-sky-200"
                >
                  Submit Answers
                </button>
              ) : (
                <button
                  onClick={() => setShowQuizModal(false)}
                  className="px-5 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs"
                >
                  Close Quiz
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
