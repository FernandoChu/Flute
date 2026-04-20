import { fsrs, createEmptyCard, Rating, type Card, type Grade } from "ts-fsrs";

const scheduler = fsrs();

export { Rating };

export function getEmptyCard(): Card {
  return createEmptyCard();
}

export function scheduleReview(card: Card, rating: Grade) {
  const now = new Date();
  const result = scheduler.next(card, now, rating);
  return { card: result.card, log: result.log };
}

export function previewRatings(card: Card) {
  const now = new Date();
  const results = scheduler.repeat(card, now);
  return results;
}

/** Convert a Prisma WordReview row into a ts-fsrs Card object */
export function dbToCard(review: {
  due: Date;
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  reps: number;
  lapses: number;
  state: number;
  learningSteps: number;
  lastReview: Date | null;
}): Card {
  return {
    due: review.due,
    stability: review.stability,
    difficulty: review.difficulty,
    elapsed_days: review.elapsedDays,
    scheduled_days: review.scheduledDays,
    reps: review.reps,
    lapses: review.lapses,
    learning_steps: review.learningSteps,
    state: review.state as Card["state"],
  };
}

/** Convert a ts-fsrs Card into Prisma-compatible data for update/create */
export function cardToDb(card: Card) {
  return {
    due: card.due,
    stability: card.stability,
    difficulty: card.difficulty,
    elapsedDays: card.elapsed_days,
    scheduledDays: card.scheduled_days,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state as number,
    learningSteps: card.learning_steps,
    lastReview: new Date(),
  };
}

/** Format an interval for display (e.g. "< 1m", "10m", "1d", "3.5mo") */
export function formatInterval(due: Date): string {
  const now = new Date();
  const diffMs = due.getTime() - now.getTime();
  if (diffMs < 0) return "now";

  const minutes = diffMs / 60_000;
  if (minutes < 1) return "< 1m";
  if (minutes < 60) return `${Math.round(minutes)}m`;

  const hours = minutes / 60;
  if (hours < 24) return `${Math.round(hours)}h`;

  const days = hours / 24;
  if (days < 30) return `${Math.round(days)}d`;

  const months = days / 30;
  if (months < 12) return `${Number(months.toFixed(1))}mo`;

  const years = days / 365;
  return `${Number(years.toFixed(1))}y`;
}
