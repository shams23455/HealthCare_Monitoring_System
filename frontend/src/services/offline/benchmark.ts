import { offlineDb, LocalObservation } from './offlineDb';
import { compressImage } from './imageCompressor';
import { enqueueObservation, getQueueSummary } from './offlineQueue';

export interface BenchmarkResult {
  iterationCount: number;
  avgInsertLatencyMs: number;
  minInsertLatencyMs: number;
  maxInsertLatencyMs: number;
  imageCompressionTimeMs: number;
  originalImageBytes: number;
  compressedImageBytes: number;
  compressionRatioPercent: number;
  queueRetrieveLatencyMs: number;
  zeroDataLossVerified: boolean;
}

/**
 * Generates a mock canvas image for empirical compression benchmarking.
 */
function createSyntheticImageBlob(width = 2400, height = 1800): Promise<Blob> {
  return new Promise((resolve, reject) => {
    if (typeof document === 'undefined') {
      resolve(new Blob(['synthetic-image-bytes'], { type: 'image/jpeg' }));
      return;
    }
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      reject(new Error('Canvas 2D context unavailable'));
      return;
    }

    // Draw textured patterns to simulate realistic livestock camera noise
    ctx.fillStyle = '#4a7c59';
    ctx.fillRect(0, 0, width, height);
    for (let i = 0; i < 500; i++) {
      ctx.fillStyle = i % 2 === 0 ? '#ffffff' : '#2b4d34';
      ctx.beginPath();
      ctx.arc(
        Math.random() * width,
        Math.random() * height,
        Math.random() * 40 + 5,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }

    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to generate test image blob'));
      },
      'image/jpeg',
      0.95
    );
  });
}

/**
 * Runs an empirical benchmark of the IndexedDB offline queue and client-side compression pipeline.
 */
export async function runOfflineSyncBenchmark(iterations = 25): Promise<BenchmarkResult> {
  const insertTimes: number[] = [];

  // 1. Benchmark IndexedDB insertion latency
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    await enqueueObservation({
      animal_id: `bench-animal-${i}`,
      animal_tag: `TAG-BENCH-${i}`,
      first_symptom_at: new Date().toISOString(),
      observed_at: new Date().toISOString(),
      symptoms_description: ['Fever', 'Coughing'],
      temperature: 39.5,
      appetite_status: 'REDUCED',
      activity_status: 'LETHARGIC',
      farm_location: 'Benchmark Barn',
      notes: `Benchmark synthetic payload #${i}`
    });
    const duration = performance.now() - start;
    insertTimes.push(duration);
  }

  const avgInsertLatencyMs = Number((insertTimes.reduce((a, b) => a + b, 0) / iterations).toFixed(2));
  const minInsertLatencyMs = Number(Math.min(...insertTimes).toFixed(2));
  const maxInsertLatencyMs = Number(Math.max(...insertTimes).toFixed(2));

  // 2. Benchmark Client-Side Image Compression
  let imageCompressionTimeMs = 0;
  let originalImageBytes = 0;
  let compressedImageBytes = 0;
  let compressionRatioPercent = 0;

  try {
    const testBlob = await createSyntheticImageBlob();
    originalImageBytes = testBlob.size;

    const compStart = performance.now();
    const compResult = await compressImage(testBlob, 1280, 1280, 0.75);
    imageCompressionTimeMs = Number((performance.now() - compStart).toFixed(2));
    compressedImageBytes = compResult.blob.size;

    compressionRatioPercent = Number(
      (((originalImageBytes - compressedImageBytes) / originalImageBytes) * 100).toFixed(1)
    );
  } catch (err) {
    console.warn('[Benchmark] Image compression skipped (headless/non-DOM environment):', err);
  }

  // 3. Benchmark Queue Retrieval
  const queueStart = performance.now();
  const summary = await getQueueSummary();
  const queueRetrieveLatencyMs = Number((performance.now() - queueStart).toFixed(2));

  // 4. Data Loss Verification: Verify all enqueued records exist
  const queuedObs = await offlineDb.observations
    .where('notes')
    .startsWith('Benchmark synthetic payload')
    .count();
  const zeroDataLossVerified = queuedObs === iterations;

  // Cleanup benchmark test records
  const toDelete = await offlineDb.observations
    .where('notes')
    .startsWith('Benchmark synthetic payload')
    .primaryKeys();
  await offlineDb.observations.bulkDelete(toDelete);

  return {
    iterationCount: iterations,
    avgInsertLatencyMs,
    minInsertLatencyMs,
    maxInsertLatencyMs,
    imageCompressionTimeMs,
    originalImageBytes,
    compressedImageBytes,
    compressionRatioPercent,
    queueRetrieveLatencyMs,
    zeroDataLossVerified
  };
}
