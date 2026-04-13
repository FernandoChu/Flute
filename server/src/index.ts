import "dotenv/config";
import express from "express";
import cors from "cors";
import { PrismaClient } from "@prisma/client";
import authRoutes from "./routes/auth.js";
import collectionRoutes from "./routes/collections.js";
import lessonRoutes from "./routes/lessons.js";
import languageRoutes from "./routes/languages.js";

export const prisma = new PrismaClient();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api/languages", languageRoutes);
app.use("/api/collections", collectionRoutes);
app.use("/api", lessonRoutes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
