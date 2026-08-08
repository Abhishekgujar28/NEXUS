import IORedis from 'ioredis';
import { config } from '../core/config.js';
import { logger } from '../core/logger.js';

/**
 * Redis pub/sub event bridge for research events.
 *
 * Problem: The BullMQ worker runs as a separate Node.js process and has no
 * access to the backend's Socket.IO server instance. Direct `emitToRoom()`
 * calls in the worker are no-ops because `io` is null.
 *
 * Solution: The worker publishes research events to a Redis pub/sub channel.
 * The backend process subscribes to this channel and re-emits events through
 * Socket.IO to the correct project room.
 *
 * Channel: `nexus:research:events`
 * Payload: JSON-encoded `{ event, room, data }`
 */

const CHANNEL = 'nexus:research:events';

export interface ResearchEventEnvelope {
  event: string;
  room: string;
  data: unknown;
}

// ── Publisher (used by the worker / orchestrator) ──────────────────────

let publisher: IORedis | null = null;

/**
 * Get or lazily create the Redis publisher connection.
 * Safe to call from both the backend and worker processes.
 */
function getPublisher(): IORedis {
  if (publisher) return publisher;
  publisher = new IORedis(config.redis.url, { maxRetriesPerRequest: null, lazyConnect: true });
  publisher.on('error', (err) => {
    logger.error('Research event publisher Redis error', { error: err.message });
  });
  publisher.connect().catch(() => {
    // Connection errors are handled by the 'error' event above.
  });
  return publisher;
}

/**
 * Publish a research event via Redis pub/sub. Called from the worker process
 * (ResearchOrchestrator) instead of direct Socket.IO emits.
 */
export async function publishResearchEvent(
  event: string,
  projectId: string,
  data: unknown
): Promise<void> {
  const envelope: ResearchEventEnvelope = {
    event,
    room: `project:${projectId}`,
    data,
  };
  try {
    await getPublisher().publish(CHANNEL, JSON.stringify(envelope));
  } catch (err) {
    logger.warn(`Failed to publish research event [${event}]`, {
      error: (err as Error).message,
    });
  }
}

// ── Subscriber (used by the backend process) ──────────────────────────

let subscriber: IORedis | null = null;

/**
 * Subscribe to research events from the Redis channel and forward them
 * through Socket.IO. Called once during backend startup.
 *
 * @param emitFn - A function that emits to a Socket.IO room. Typically
 *   wraps `io.to(room).emit(event, data)`.
 */
export function subscribeToResearchEvents(
  emitFn: (room: string, event: string, data: unknown) => void
): void {
  if (subscriber) return; // already subscribed

  subscriber = new IORedis(config.redis.url, { maxRetriesPerRequest: null, lazyConnect: true });
  subscriber.on('error', (err) => {
    logger.error('Research event subscriber Redis error', { error: err.message });
  });

  subscriber.connect().then(() => {
    subscriber!.subscribe(CHANNEL).catch((err) => {
      logger.error('Failed to subscribe to research events channel', {
        error: (err as Error).message,
      });
    });
  }).catch(() => {
    // handled by error event
  });

  subscriber.on('message', (_channel: string, message: string) => {
    try {
      const envelope = JSON.parse(message) as ResearchEventEnvelope;
      emitFn(envelope.room, envelope.event, envelope.data);
    } catch (err) {
      logger.warn('Failed to parse research event from Redis', {
        error: (err as Error).message,
      });
    }
  });

  logger.info('Subscribed to research events via Redis pub/sub');
}

/**
 * Clean up publisher/subscriber connections. Called during graceful shutdown.
 */
export async function closeResearchEventConnections(): Promise<void> {
  try {
    if (publisher) { await publisher.quit(); publisher = null; }
    if (subscriber) { await subscriber.quit(); subscriber = null; }
  } catch {
    // best-effort
  }
}
