import {
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QdrantClient } from '@qdrant/js-client-rest';

@Injectable()
export class QdrantProvider implements OnModuleInit {
  private readonly logger = new Logger(QdrantProvider.name);

  private readonly client: QdrantClient;
  private readonly collection: string;
  private readonly vectorSize: number;

  constructor(
    private readonly config: ConfigService,
  ) {
    this.collection = this.config.getOrThrow<string>(
      'QDRANT_COLLECTION',
    );

    this.vectorSize = this.config.getOrThrow<number>(
      'QDRANT_VECTOR_SIZE',
    );

    this.client = new QdrantClient({
      url: this.config.getOrThrow<string>('QDRANT_URL'),
      apiKey: this.config.getOrThrow<string>('QDRANT_API_KEY'),
      checkCompatibility: false,
    });
  }

  async onModuleInit(): Promise<void> {
    const healthy = await this.health();

    if (!healthy) {
      this.logger.warn(
        'Qdrant is unavailable. Semantic memory disabled.',
      );
      return;
    }

    await this.ensureCollection();

    this.logger.log('Qdrant initialized successfully.');
  }

  async health(): Promise<boolean> {
    try {
      await this.client.getCollections();
      return true;
    } catch (error) {
      this.logger.error('Qdrant health check failed', error);
      return false;
    }
  }

  async ensureCollection(): Promise<void> {
    const exists = await this.client.collectionExists(
      this.collection,
    );

    if (exists) {
      this.logger.log(
        `Collection "${this.collection}" already exists.`,
      );
      return;
    }

    this.logger.log(
      `Creating collection "${this.collection}"...`,
    );

    await this.client.createCollection(this.collection, {
      vectors: {
        size: this.vectorSize,
        distance: 'Cosine',
      },
    });

    this.logger.log(
      `Collection "${this.collection}" created successfully.`,
    );
  }

  async upsertMemory(
    id: string,
    vector: number[],
    payload: Record<string, unknown>,
  ) {
    return this.client.upsert(this.collection, {
      wait: true,
      points: [
        {
          id,
          vector,
          payload,
        },
      ],
    });
  }

  async searchMemory(
    vector: number[],
    limit = 5,
  ) {
    return this.client.search(this.collection, {
      vector,
      limit,
      with_payload: true,
    });
  }

  async deleteMemory(id: string) {
    return this.client.delete(this.collection, {
      wait: true,
      points: [id],
    });
  }

  async count() {
    return this.client.count(this.collection);
  }

  getClient(): QdrantClient {
    return this.client;
  }
}
