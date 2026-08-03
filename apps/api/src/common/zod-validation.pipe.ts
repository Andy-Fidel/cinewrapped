import type { PipeTransform } from '@nestjs/common';
import type { z } from 'zod';

export class ZodValidationPipe<TSchema extends z.ZodType> implements PipeTransform<unknown> {
  public constructor(private readonly schema: TSchema) {}

  public transform(value: unknown): z.output<TSchema> {
    return this.schema.parse(value);
  }
}
