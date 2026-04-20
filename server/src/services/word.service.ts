import { prisma } from "../index.js";
import { getEmptyCard } from "./srs.service.js";

export async function getUserWords(userId: string, languageId: number) {
  return prisma.word.findMany({
    where: { userId, languageId },
    include: { review: true },
  });
}

export async function createWord(data: {
  userId: string;
  languageId: number;
  term: string;
  translation?: string;
  status?: number;
  notes?: string;
  contextSentence?: string;
}) {
  const word = await prisma.word.upsert({
    where: {
      userId_languageId_term: {
        userId: data.userId,
        languageId: data.languageId,
        term: data.term,
      },
    },
    update: {
      ...(data.translation !== undefined && { translation: data.translation }),
      ...(data.status !== undefined && { status: data.status }),
      ...(data.notes !== undefined && { notes: data.notes }),
      ...(data.contextSentence !== undefined && { contextSentence: data.contextSentence }),
    },
    create: {
      userId: data.userId,
      languageId: data.languageId,
      term: data.term,
      translation: data.translation ?? null,
      status: data.status ?? 0,
      notes: data.notes ?? null,
      contextSentence: data.contextSentence ?? null,
    },
    include: { review: true },
  });

  // Auto-create review when status transitions to Learning (1+)
  if (word.status >= 1 && word.status <= 4 && !word.review) {
    const card = getEmptyCard();
    await prisma.wordReview.create({
      data: {
        wordId: word.id,
        due: card.due,
        stability: card.stability,
        difficulty: card.difficulty,
        elapsedDays: card.elapsed_days,
        scheduledDays: card.scheduled_days,
        reps: card.reps,
        lapses: card.lapses,
        state: card.state,
        learningSteps: card.learning_steps,
        lastReview: card.last_review ?? null,
      },
    });
  }

  return word;
}

export async function updateWord(
  wordId: string,
  data: {
    translation?: string;
    status?: number;
    notes?: string;
    contextSentence?: string;
  },
) {
  const word = await prisma.word.update({
    where: { id: wordId },
    data: {
      ...(data.translation !== undefined && { translation: data.translation }),
      ...(data.status !== undefined && { status: data.status }),
      ...(data.notes !== undefined && { notes: data.notes }),
      ...(data.contextSentence !== undefined && { contextSentence: data.contextSentence }),
    },
    include: { review: true },
  });

  // Auto-create review when status transitions to Learning (1+)
  if (word.status >= 1 && word.status <= 4 && !word.review) {
    const card = getEmptyCard();
    await prisma.wordReview.create({
      data: {
        wordId: word.id,
        due: card.due,
        stability: card.stability,
        difficulty: card.difficulty,
        elapsedDays: card.elapsed_days,
        scheduledDays: card.scheduled_days,
        reps: card.reps,
        lapses: card.lapses,
        state: card.state,
        learningSteps: card.learning_steps,
        lastReview: card.last_review ?? null,
      },
    });
  }

  return word;
}

export async function batchUpdateStatus(
  userId: string,
  wordIds: string[],
  status: number,
) {
  await prisma.word.updateMany({
    where: { id: { in: wordIds }, userId },
    data: { status },
  });

  // Auto-create reviews for words transitioning to Learning
  if (status >= 1 && status <= 4) {
    const wordsWithoutReview = await prisma.word.findMany({
      where: {
        id: { in: wordIds },
        userId,
        review: null,
      },
      select: { id: true },
    });

    if (wordsWithoutReview.length > 0) {
      const card = getEmptyCard();
      await prisma.wordReview.createMany({
        data: wordsWithoutReview.map((w) => ({
          wordId: w.id,
          due: card.due,
          stability: card.stability,
          difficulty: card.difficulty,
          elapsedDays: card.elapsed_days,
          scheduledDays: card.scheduled_days,
          reps: card.reps,
          lapses: card.lapses,
          state: card.state,
          learningSteps: card.learning_steps,
          lastReview: card.last_review ?? null,
        })),
      });
    }
  }

  return { updated: wordIds.length };
}
