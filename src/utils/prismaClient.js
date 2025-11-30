// src/utils/prismaClient.js
import { PrismaClient } from '@prisma/client';

class PrismaClientSingleton {
  constructor() {
    if (!PrismaClientSingleton.instance) {
      // Configuración para SQLite
      const prismaConfig = {
        log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['warn', 'error'],
        errorFormat: 'pretty',
        adapter: {
          kind: 'sqlite',
          url: process.env.DATABASE_URL || 'file:./dev.db',
        },
      };

      this.prisma = new PrismaClient(prismaConfig);

      // Middleware para logging de queries
      this.prisma.$use(async (params, next) => {
        const before = Date.now();
        const result = await next(params);
        const after = Date.now();
        
        if (process.env.NODE_ENV === 'development') {
          console.log(`📊 Query ${params.model}.${params.action} took ${after - before}ms`);
        }
        
        return result;
      });

      PrismaClientSingleton.instance = this;
    }
    
    return PrismaClientSingleton.instance;
  }
  
  getClient() {
    return this.prisma;
  }
}

const prismaSingleton = new PrismaClientSingleton();
Object.freeze(prismaSingleton);

export default prismaSingleton.getClient();