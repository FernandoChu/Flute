import { describe, it, expect } from "vitest";
import { Rating } from "ts-fsrs";
import {
  getEmptyCard,
  scheduleReview,
  previewRatings,
  dbToCard,
  cardToDb,
  formatInterval,
} from "./srs.service";

describe("getEmptyCard", () => {
  it("returns a card with default values", () => {
    const card = getEmptyCard();
    expect(card.stability).toBe(0);
    expect(card.difficulty).toBe(0);
    expect(card.reps).toBe(0);
    expect(card.lapses).toBe(0);
    expect(card.state).toBe(0); // New
    expect(card.due).toBeInstanceOf(Date);
  });
});

describe("scheduleReview", () => {
  it("schedules a Good review and advances the card", () => {
    const card = getEmptyCard();
    const result = scheduleReview(card, Rating.Good);

    expect(result.card.reps).toBeGreaterThan(0);
    expect(result.card.due.getTime()).toBeGreaterThan(Date.now());
    expect(result.log).toBeDefined();
  });

  it("schedules an Again review — due date is very soon", () => {
    const card = getEmptyCard();
    const result = scheduleReview(card, Rating.Again);

    // Again on a new card should result in a very short interval
    const diffMs = result.card.due.getTime() - Date.now();
    expect(diffMs).toBeLessThan(10 * 60 * 1000); // less than 10 minutes
  });

  it("Easy review gives a longer interval than Good", () => {
    const card = getEmptyCard();
    const easyResult = scheduleReview(card, Rating.Easy);
    const goodResult = scheduleReview(card, Rating.Good);

    expect(easyResult.card.due.getTime()).toBeGreaterThan(
      goodResult.card.due.getTime(),
    );
  });
});

describe("previewRatings", () => {
  it("returns results for all four ratings", () => {
    const card = getEmptyCard();
    const results = previewRatings(card);

    expect(results[Rating.Again]).toBeDefined();
    expect(results[Rating.Hard]).toBeDefined();
    expect(results[Rating.Good]).toBeDefined();
    expect(results[Rating.Easy]).toBeDefined();
  });

  it("Easy always has the longest interval", () => {
    const card = getEmptyCard();
    const results = previewRatings(card);

    const easyDue = results[Rating.Easy].card.due.getTime();
    const goodDue = results[Rating.Good].card.due.getTime();
    const hardDue = results[Rating.Hard].card.due.getTime();
    const againDue = results[Rating.Again].card.due.getTime();

    expect(easyDue).toBeGreaterThanOrEqual(goodDue);
    expect(goodDue).toBeGreaterThanOrEqual(hardDue);
    expect(hardDue).toBeGreaterThanOrEqual(againDue);
  });
});

describe("dbToCard / cardToDb", () => {
  it("round-trips a card through db conversion", () => {
    const original = getEmptyCard();
    const dbData = cardToDb(original);
    const restored = dbToCard({
      due: dbData.due,
      stability: dbData.stability,
      difficulty: dbData.difficulty,
      elapsedDays: dbData.elapsedDays,
      scheduledDays: dbData.scheduledDays,
      reps: dbData.reps,
      lapses: dbData.lapses,
      state: dbData.state,
      lastReview: dbData.lastReview,
    });

    expect(restored.stability).toBe(original.stability);
    expect(restored.difficulty).toBe(original.difficulty);
    expect(restored.reps).toBe(original.reps);
    expect(restored.lapses).toBe(original.lapses);
    expect(restored.state).toBe(original.state);
  });
});

describe("formatInterval", () => {
  it("returns 'now' for past dates", () => {
    expect(formatInterval(new Date(Date.now() - 1000))).toBe("now");
  });

  it("returns '< 1m' for very short intervals", () => {
    expect(formatInterval(new Date(Date.now() + 30_000))).toBe("< 1m");
  });

  it("returns minutes for short intervals", () => {
    const result = formatInterval(new Date(Date.now() + 10 * 60_000));
    expect(result).toBe("10m");
  });

  it("returns hours for medium intervals", () => {
    const result = formatInterval(new Date(Date.now() + 3 * 60 * 60_000));
    expect(result).toBe("3h");
  });

  it("returns days for longer intervals", () => {
    const result = formatInterval(new Date(Date.now() + 5 * 24 * 60 * 60_000));
    expect(result).toBe("5d");
  });
});
