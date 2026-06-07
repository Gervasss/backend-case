declare module '@nestjs/swagger' {
  export function ApiBearerAuth(): ClassDecorator & MethodDecorator;
  export function ApiProperty(options?: Record<string, unknown>): PropertyDecorator;
  export function ApiTags(...tags: string[]): ClassDecorator;

  export class DocumentBuilder {
    setTitle(title: string): this;
    setDescription(description: string): this;
    setVersion(version: string): this;
    addBearerAuth(): this;
    build(): Record<string, unknown>;
  }

  export class SwaggerModule {
    static createDocument(app: unknown, config: Record<string, unknown>): Record<string, unknown>;
    static setup(path: string, app: unknown, document: Record<string, unknown>): void;
  }
}

declare module 'class-transformer' {
  export function Type(typeFunction: () => new (...args: unknown[]) => unknown): PropertyDecorator;
}
