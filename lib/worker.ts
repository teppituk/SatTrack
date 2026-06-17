/**
 * BullMQ Worker for processing OCR jobs
 * Run with: npm run worker (or tsx lib/worker.ts)
 */

import { Worker, Job } from "bullmq";
import IORedis from "ioredis";
import { parseSlipFromUrl } from "./gemini";
import { prisma } from "./prisma";

const connection = new IORedis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

interface OcrJobData {
  imageUrl: string;
  userId: string;
  fileName: string;
  contentType: string;
}

const worker = new Worker<OcrJobData>(
  "ocr-jobs",
  async (job: Job<OcrJobData>) => {
    console.log(`Processing OCR job ${job.id} for user ${job.data.userId}`);

    const { imageUrl, userId } = job.data;

    try {
      // Parse the slip image using Claude Vision
      const parsedData = await parseSlipFromUrl(imageUrl);

      // Store OCR result in a cache or notify via job result
      // The user will retrieve this when they poll for job status
      await job.updateProgress(100);

      // Get or create coin
      const coin = await prisma.coin.upsert({
        where: { symbol: parsedData.coinSymbol.toUpperCase() },
        update: {},
        create: {
          symbol: parsedData.coinSymbol.toUpperCase(),
          name: parsedData.coinSymbol,
        },
      });

      console.log(`OCR job ${job.id} completed: ${parsedData.type} ${parsedData.amount} ${parsedData.coinSymbol}`);

      return {
        ...parsedData,
        coinId: coin.id,
        imageUrl,
        userId,
      };
    } catch (error) {
      console.error(`OCR job ${job.id} failed:`, error);
      throw error;
    }
  },
  {
    connection,
    concurrency: 5,
    limiter: {
      max: 10,
      duration: 60000, // 10 OCR calls per minute
    },
  }
);

worker.on("completed", (job) => {
  console.log(`Job ${job.id} completed successfully`);
});

worker.on("failed", (job, err) => {
  console.error(`Job ${job?.id} failed:`, err.message);
});

worker.on("error", (err) => {
  console.error("Worker error:", err);
});

console.log("OCR Worker started, listening for jobs...");

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("Shutting down worker...");
  await worker.close();
  await connection.quit();
  process.exit(0);
});
