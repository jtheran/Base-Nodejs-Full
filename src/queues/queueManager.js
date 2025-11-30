import Queue from 'bull';
import { createBullBoard } from '@bull-board/api';
import { BullAdapter } from '@bull-board/api/bullAdapter';
import { ExpressAdapter } from '@bull-board/express';

class QueueManager {
  constructor() {
    this.queues = new Map();
    this.setupBullBoard();
  }

  // Crear o obtener una cola
  getQueue(name, options = {}) {
    if (this.queues.has(name)) {
      return this.queues.get(name);
    }

    const queue = new Queue(name, {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        //password: process.env.REDIS_PASSWORD,
      },
      defaultJobOptions: {
        removeOnComplete: 100, // Mantener 100 jobs completados
        removeOnFail: 100,     // Mantener 100 jobs fallados
        attempts: 3,           // Reintentar 3 veces
        backoff: {
          type: 'exponential', // Retry exponencial
          delay: 1000,         // 1s, 2s, 4s, etc.
        },
      },
      ...options
    });

    this.queues.set(name, queue);
    return queue;
  }

  // Configurar panel de monitorización
  setupBullBoard() {
    const serverAdapter = new ExpressAdapter();
    serverAdapter.setBasePath('/queues');

    const queues = Array.from(this.queues.values()).map(q => new BullAdapter(q));
    
    createBullBoard({
      queues: [],
      serverAdapter: serverAdapter,
    });

    this.serverAdapter = serverAdapter;
  }

  // Agregar cola al panel
  addQueueToBoard(queue) {
    const adapter = new BullAdapter(queue);
    this.serverAdapter.addQueue(adapter);
  }
}

export const queueManager = new QueueManager();