import { NotFoundException } from '@nestjs/common';

export abstract class BaseRepository {
  protected assertFound<T>(value: T | undefined | null, message: string): T {
    if (!value) {
      throw new NotFoundException(message);
    }

    return value;
  }
}
