import {
  Injectable,
  ArgumentMetadata,
  BadRequestException,
  ValidationPipe,
} from '@nestjs/common';

@Injectable()
export class ValidateInputPipe extends ValidationPipe {
  async transform(value: any, metadata: ArgumentMetadata) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return await super.transform(value, metadata);
    } catch (e) {
      if (e instanceof BadRequestException) {
        throw new BadRequestException(
          ValidateInputPipe.handleError(e.getResponse()),
        );
      }
    }
  }

  private static handleError(errors: any) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    const mappedErrors = errors.message.map((error: any) => error);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return mappedErrors[0];
  }
}
