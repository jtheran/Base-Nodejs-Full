import logger from '../logs/logger.js';
import '../queues/emailQueue.js'; // Importar para inicializar la cola

logger.info('[WORKER] Worker de emails iniciado');