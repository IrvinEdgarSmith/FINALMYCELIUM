export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  createdAt: number;
}

export class MessageEntity implements Message {
  constructor(
    public id: string = crypto.randomUUID(),
    public content: string,
    public role: 'user' | 'assistant',
    public createdAt: number = Date.now()
  ) {}

  static createUserMessage(content: string): MessageEntity {
    return new MessageEntity(crypto.randomUUID(), content, 'user');
  }

  static createAssistantMessage(content: string): MessageEntity {
    return new MessageEntity(crypto.randomUUID(), content, 'assistant');
  }
}
