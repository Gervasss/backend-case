import { BadGatewayException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatDto } from './dto/chat.dto';

@Injectable()
export class AiService {
  constructor(private readonly config: ConfigService) {}

  async chat(userId: string, dto: ChatDto) {
    const baseUrl = this.config.get<string>('AI_SERVICE_URL') ?? 'http://localhost:8000';

    try {
      const response = await fetch(`${baseUrl}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          messages: dto.messages,
          context: dto.context,
        }),
      });

      if (!response.ok) {
        throw new Error(`AI service responded with ${response.status}`);
      }

      return response.json() as Promise<unknown>;
    } catch (error) {
      throw new BadGatewayException({
        message: 'AI service is unavailable.',
        detail: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}
