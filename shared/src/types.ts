export enum WordStatus {
  New = 0,
  Learning1 = 1,
  Learning2 = 2,
  Learning3 = 3,
  Learning4 = 4,
  Known = 5,
  Ignored = 6,
}

export interface User {
  id: string;
  username: string;
  nativeLanguageId: number | null;
  studyLanguageId: number | null;
  createdAt: Date;
}

export interface Language {
  id: number;
  code: string;
  name: string;
}

export interface Collection {
  id: string;
  userId: string;
  title: string;
  sourceLanguageId: number;
  targetLanguageId: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Lesson {
  id: string;
  collectionId: string;
  title: string;
  textContent: string;
  audioUrl: string | null;
  position: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Word {
  id: string;
  userId: string;
  languageId: number;
  term: string;
  translation: string | null;
  status: WordStatus;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface WordReview {
  id: string;
  wordId: string;
  easeFactor: number;
  interval: number;
  repetitions: number;
  nextReview: Date;
  lastReviewed: Date | null;
}
