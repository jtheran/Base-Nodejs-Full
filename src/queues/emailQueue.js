// queues/emailQueue.js
import { queueManager } from './queueManager.js';
import { sendEmail, sendMassiveEmail } from '../services/nodemailer.js';
import logger from '../logs/logger.js';

const emailQueue = queueManager.getQueue('emails');

// Procesador de jobs de email
emailQueue.process('sendEmail', async (job) => {
  const { to, subject, template, data } = job.data;
  
  try {
    const result = await sendEmail({ to, subject, template, data });
    logger.info(`[QUEUE] Email enviado exitosamente a ${to}`);
    return result;
  } catch (error) {
    logger.error(`[QUEUE] Error enviando email a ${to}: ${error.message}`);
    throw error; // Esto activará el reintento automático
  }
});

// Eventos de la cola
emailQueue.on('completed', (job, result) => {
  logger.info(`[QUEUE] Job ${job.id} completado - Email a ${job.data.to}`);
});

emailQueue.on('failed', (job, err) => {
  logger.error(`[QUEUE] Job ${job.id} fallado - Email a ${job.data.to}: ${err.message}`);
});

emailQueue.on('stalled', (job) => {
  logger.warn(`[QUEUE] Job ${job.id} estancado - Reintentando...`);
});

export { emailQueue };