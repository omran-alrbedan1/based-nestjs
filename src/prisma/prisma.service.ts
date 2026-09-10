import { Injectable, OnModuleDestroy, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 5;

  constructor(private readonly configService: ConfigService) {
    const connectionString = configService.get<string>('DATABASE_URL');

    if (!connectionString) {
      throw new Error('DATABASE_URL is not configured');
    }

    const adapter = new PrismaPg({
      connectionString,
    });

    super({
      adapter,
      log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
      errorFormat: 'pretty',
    });
  }

  async onModuleInit() {
    await this.connectWithRetry();
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Database disconnected');
  }

  private async connectWithRetry() {
    try {
      await this.$connect();
      this.logger.log('Database connected successfully');
      this.reconnectAttempts = 0;
    } catch {
      this.reconnectAttempts++;
      this.logger.error(
        `Connection failed (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`,
      );

      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000);
        this.logger.log(`Retrying in ${delay / 1000}s...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        await this.connectWithRetry();
      } else {
        this.logger.error('Max reconnect attempts reached');
        throw new Error('Could not connect to database');
      }
    }
  }

  async isConnected(): Promise<boolean> {
    try {
      await this.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }
}
