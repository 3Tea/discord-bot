import IORedis from 'ioredis';

import { REDIS } from '../../util/config/index';
import logger from '../../util/log/logger';

interface RedisServiceOptions {
  monitor?: boolean;
}

// ioredis types don't properly expose EventEmitter methods with strict mode
type RedisClient = IORedis & { on(event: string, cb: (...args: any[]) => void): any };

export class RedisService {
  private client: RedisClient;
  private ttl: number;

  constructor(options?: RedisServiceOptions) {
    this.ttl = 120;
    this.client = new IORedis(REDIS.REDIS_URL, {
      retryStrategy(times: number) {
        return Math.min(times * 50, 2000);
      },
    }) as RedisClient;

    this.client.on('error', (err: any) => {
      logger.error('Connect to Redis fail, you need to install or start redis');
      logger.error(String(err));
    });

    this.client.on('connect', () => {
      logger.debug(
        `Connect to Redis success: ${this.client.options.host}:${this.client.options.port}`,
      );
    });

    if (options?.monitor) {
      (this.client as any).monitor((err: any, monitor: any) => {
        if (err || !monitor) return;
        monitor.on('monitor', (time: any, args: any, source: any, database: any) => {
          logger.debug(`${time} ${args} ${source} ${database}`);
        });
      });
    }
  }

  async setJson(key: string, value: any, time?: number): Promise<string> {
    const ttl = time ?? this.ttl;
    return this.client.set(key, JSON.stringify(value), 'EX', ttl);
  }

  async getJson<T = any>(key: string): Promise<T | null> {
    const data = await this.client.get(key);
    if (!data) return null;
    return JSON.parse(data) as T;
  }

  async deleteKey(key: string): Promise<number> {
    return this.client.del(key);
  }

  async flushdb(): Promise<string> {
    return this.client.flushdb();
  }

  async ttlKey(key: string): Promise<number> {
    return this.client.ttl(key);
  }
}

export default new RedisService({ monitor: true });
