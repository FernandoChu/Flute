import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import cors from "cors";
import { PrismaClient } from "../prisma/generated/prisma/client/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import authRoutes from "./routes/auth.js";
import collectionRoutes from "./routes/collections.js";
import lessonRoutes from "./routes/lessons.js";
import languageRoutes from "./routes/languages.js";
import wordRoutes from "./routes/words.js";
import settingsRoutes from "./routes/settings.js";
import translateRoutes from "./routes/translate.js";
import vocabularyRoutes from "./routes/vocabulary.js";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
export const prisma = new PrismaClient({ adapter });

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api/languages", languageRoutes);
app.use("/api/words", wordRoutes);
app.use("/api/collections", collectionRoutes);
app.use("/api", lessonRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/translate", translateRoutes);
app.use("/api/vocabulary", vocabularyRoutes);

// Serve client build in production
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.join(__dirname, "../../client/dist");
app.use(express.static(clientDist));
app.get("*", (_req, res, _next) => {
  res.sendFile(path.join(clientDist, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
