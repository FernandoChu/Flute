import { prisma } from "../index.js";

type Resource = "collection" | "lesson";

export async function assertOwnership(
  userId: string,
  resource: Resource,
  resourceId: string,
): Promise<void> {
  switch (resource) {
    case "collection": {
      const collection = await prisma.collection.findUnique({
        where: { id: resourceId },
        select: { userId: true },
      });
      if (!collection) throw new NotFoundError("Collection not found");
      if (collection.userId !== userId) throw new ForbiddenError();
      break;
    }
    case "lesson": {
      const lesson = await prisma.lesson.findUnique({
        where: { id: resourceId },
        select: { collection: { select: { userId: true } } },
      });
      if (!lesson) throw new NotFoundError("Lesson not found");
      if (lesson.collection.userId !== userId) throw new ForbiddenError();
      break;
    }
  }
}

export class NotFoundError extends Error {
  status = 404;
  constructor(message = "Not found") {
    super(message);
  }
}

export class ForbiddenError extends Error {
  status = 403;
  constructor(message = "Forbidden") {
    super(message);
  }
}
