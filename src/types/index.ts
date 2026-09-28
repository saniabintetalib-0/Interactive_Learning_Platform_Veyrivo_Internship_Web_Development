export interface Question {
  id: number;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface Topic {
  id: string;
  grade: number;
  subjectId: string;
  subjectName: string;
  category: string;
  title: string;
  subtitle: string;
  xpReward: number;
  estimatedTime: string;
  badge: string;
  theorySummary: string;
  engineType: 'biocell' | 'chemistry' | 'physics' | 'math' | 'cs';
  questions: Question[];
}

export interface StudentProfile {
  name: string;
  grade: number;
  avatar: string;
  level: number;
  totalXp: number;
  streakDays: number;
  topicsCompletedCount: number;
  quizAccuracy: number;
}

export interface Bookmark {
  id: string;
  createdAt: string;
}

export interface RevisionNote {
  id: string;
  topicId: string;
  text: string;
  createdAt: string;
}

export interface QuizSubmission {
  topicId: string;
  score: number;
  totalQuestions: number;
  xpEarned: number;
}
