import { PrismaClient, Chat, Message } from '@prisma/client';
import { Chat as SharedChat, Message as SharedMessage, MessageRole } from '../types/shared';
import { MessageRoleConverter } from '../utils/messageRoleConverter';

const prisma = new PrismaClient();

export class DatabaseService {
  /**
   * Create a new chat
   */
  async createChat(title?: string): Promise<SharedChat> {
    const chat = await prisma.chat.create({
      data: {
        title: title || 'New Chat',
      },
      include: {
        messages: {
          orderBy: {
            createdAt: 'asc'
          }
        }
      }
    });

    return this.mapChatToShared(chat);
  }

  /**
   * Get a chat by ID
   * @param limitMessages - Limit number of messages to load (loads most recent messages). Default: 50. Set to undefined to load all.
   */
  async getChat(chatId: string, limitMessages?: number): Promise<SharedChat | null> {
    const where = { id: chatId };

    // If limit is specified, we need to get messages separately to get the most recent ones
    if (limitMessages !== undefined && limitMessages > 0) {
      const chat = await prisma.chat.findFirst({
        where,
        // Don't include messages here, we'll load them separately
      });

      if (!chat) {
        return null;
      }

      // Get most recent messages (limitMessages most recent, then reverse to get chronological order)
      const messages = await prisma.message.findMany({
        where: { chatId },
        orderBy: { createdAt: 'desc' },
        take: limitMessages
      });

      // Reverse to get chronological order (oldest first)
      const sortedMessages = messages.reverse();

      return {
        id: chat.id,
        title: chat.title || undefined,
        createdAt: chat.createdAt,
        updatedAt: chat.updatedAt,
        messages: sortedMessages.map(msg => this.mapMessageToShared(msg))
      };
    }

    // Load all messages (original behavior)
    const chat = await prisma.chat.findFirst({
      where,
      include: {
        messages: {
          orderBy: {
            createdAt: 'asc'
          }
        }
      }
    });

    return chat ? this.mapChatToShared(chat) : null;
  }

  /**
   * Get all chats (with only the last message for preview)
   * Optimized: uses a single query with include to get only the last message per chat
   */
  async getChats(): Promise<SharedChat[]> {
    // Get chats with only their last message for preview
    // This is efficient because Prisma optimizes the query with proper indexes
    // We only fetch the most recent message (take: 1) ordered by createdAt desc
    const chats = await prisma.chat.findMany({
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1 // Only get the last message for preview
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });

    // Map to shared format (messages are already in the correct format)
    return chats.map(chat => this.mapChatToShared(chat));
  }

  /**
   * Add a message to a chat
   */
  async addMessage(chatId: string, role: MessageRole, content: string, metadata?: any): Promise<SharedMessage> {
    // Convert shared MessageRole to Prisma MessageRole
    const prismaRole = MessageRoleConverter.toPrisma(role);

    const message = await prisma.message.create({
      data: {
        chatId,
        role: prismaRole,
        content,
        metadata
      }
    });

    // Update chat's updatedAt timestamp
    await prisma.chat.update({
      where: { id: chatId },
      data: { updatedAt: new Date() }
    });

    return this.mapMessageToShared(message);
  }

  /**
   * Get messages for a chat
   */
  async getMessages(chatId: string): Promise<SharedMessage[]> {
    const messages = await prisma.message.findMany({
      where: { chatId },
      orderBy: { createdAt: 'asc' }
    });

    return messages.map(message => this.mapMessageToShared(message));
  }

  /**
   * Update chat title
   */
  async updateChatTitle(chatId: string, title: string): Promise<void> {
    await prisma.chat.update({
      where: { id: chatId },
      data: { title }
    });
  }

  /**
   * Delete a chat and all its messages
   */
  async deleteChat(chatId: string): Promise<void> {
    await prisma.chat.delete({
      where: { id: chatId }
    });
  }

  /**
   * Map Prisma Chat to Shared Chat
   */
  private mapChatToShared(chat: Chat & { messages: Message[] }): SharedChat {
    return {
      id: chat.id,
      title: chat.title || undefined,
      createdAt: chat.createdAt,
      updatedAt: chat.updatedAt,
      messages: chat.messages.map(msg => this.mapMessageToShared(msg))
    };
  }

  /**
   * Map Prisma Message to Shared Message
   */
  private mapMessageToShared(message: Message): SharedMessage {
    // Convert Prisma MessageRole to shared MessageRole
    const role = MessageRoleConverter.toShared(message.role);

    return {
      id: message.id,
      chatId: message.chatId,
      role,
      content: message.content,
      metadata: message.metadata as Record<string, any> | undefined,
      createdAt: message.createdAt
    };
  }

  /**
   * Test database connection
   */
  async testConnection(): Promise<boolean> {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      console.error('Database connection test failed:', error);
      return false;
    }
  }

  /**
   * Close database connection
   */
  async disconnect(): Promise<void> {
    await prisma.$disconnect();
  }
}

// Export singleton instance
export const databaseService = new DatabaseService();
