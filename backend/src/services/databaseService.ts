import { pool } from '../utils/db';
import { Chat as SharedChat, Message as SharedMessage, MessageRole } from '../types/shared';

interface ChatRow {
  id: string;
  title: string | null;
  created_at: Date;
  updated_at: Date;
}

interface MessageRow {
  id: string;
  chat_id: string;
  role: string;
  content: string;
  metadata: Record<string, unknown> | null;
  created_at: Date;
}

export class DatabaseService {
  /**
   * Create a new chat
   */
  async createChat(title?: string): Promise<SharedChat> {
    const result = await pool.query<ChatRow>(
      `INSERT INTO chats (title) VALUES ($1) RETURNING id, title, created_at, updated_at`,
      [title || 'New Chat']
    );
    const chat = result.rows[0];
    return {
      id: chat.id,
      title: chat.title ?? undefined,
      createdAt: chat.created_at,
      updatedAt: chat.updated_at,
      messages: []
    };
  }

  /**
   * Get a chat by ID
   * @param limitMessages - Limit number of messages to load (loads most recent messages). Default: 50. Set to undefined to load all.
   */
  async getChat(chatId: string, limitMessages?: number): Promise<SharedChat | null> {
    const chatResult = await pool.query<ChatRow>(
      `SELECT id, title, created_at, updated_at FROM chats WHERE id = $1`,
      [chatId]
    );
    const chatRow = chatResult.rows[0];
    if (!chatRow) return null;

    let messages: SharedMessage[];
    if (limitMessages !== undefined && limitMessages > 0) {
      const msgResult = await pool.query<MessageRow>(
        `SELECT id, chat_id, role, content, metadata, created_at
         FROM messages WHERE chat_id = $1
         ORDER BY created_at DESC LIMIT $2`,
        [chatId, limitMessages]
      );
      messages = msgResult.rows.reverse().map(row => this.mapRowToMessage(row));
    } else {
      const msgResult = await pool.query<MessageRow>(
        `SELECT id, chat_id, role, content, metadata, created_at
         FROM messages WHERE chat_id = $1 ORDER BY created_at ASC`,
        [chatId]
      );
      messages = msgResult.rows.map(row => this.mapRowToMessage(row));
    }

    return {
      id: chatRow.id,
      title: chatRow.title ?? undefined,
      createdAt: chatRow.created_at,
      updatedAt: chatRow.updated_at,
      messages
    };
  }

  /**
   * Get all chats (with only the last message for preview)
   */
  async getChats(): Promise<SharedChat[]> {
    const chatsResult = await pool.query<ChatRow>(
      `SELECT id, title, created_at, updated_at FROM chats ORDER BY updated_at DESC`
    );
    const chats: SharedChat[] = [];
    for (const chatRow of chatsResult.rows) {
      const lastMsgResult = await pool.query<MessageRow>(
        `SELECT id, chat_id, role, content, metadata, created_at
         FROM messages WHERE chat_id = $1 ORDER BY created_at DESC LIMIT 1`,
        [chatRow.id]
      );
      const lastMessage = lastMsgResult.rows[0];
      chats.push({
        id: chatRow.id,
        title: chatRow.title ?? undefined,
        createdAt: chatRow.created_at,
        updatedAt: chatRow.updated_at,
        messages: lastMessage ? [this.mapRowToMessage(lastMessage)] : []
      });
    }
    return chats;
  }

  /**
   * Add a message to a chat
   */
  async addMessage(chatId: string, role: MessageRole, content: string, metadata?: Record<string, unknown>): Promise<SharedMessage> {
    const roleStr = role as string;
    const result = await pool.query<MessageRow>(
      `INSERT INTO messages (chat_id, role, content, metadata)
       VALUES ($1, $2::message_role, $3, $4)
       RETURNING id, chat_id, role, content, metadata, created_at`,
      [chatId, roleStr, content, metadata ? JSON.stringify(metadata) : null]
    );
    await pool.query(
      `UPDATE chats SET updated_at = NOW() WHERE id = $1`,
      [chatId]
    );
    return this.mapRowToMessage(result.rows[0]);
  }

  /**
   * Get messages for a chat
   */
  async getMessages(chatId: string): Promise<SharedMessage[]> {
    const result = await pool.query<MessageRow>(
      `SELECT id, chat_id, role, content, metadata, created_at
       FROM messages WHERE chat_id = $1 ORDER BY created_at ASC`,
      [chatId]
    );
    return result.rows.map(row => this.mapRowToMessage(row));
  }

  /**
   * Update chat title
   */
  async updateChatTitle(chatId: string, title: string): Promise<void> {
    await pool.query(
      `UPDATE chats SET title = $1, updated_at = NOW() WHERE id = $2`,
      [title, chatId]
    );
  }

  /**
   * Delete a chat and all its messages
   */
  async deleteChat(chatId: string): Promise<void> {
    await pool.query(`DELETE FROM chats WHERE id = $1`, [chatId]);
  }

  private mapRowToMessage(row: MessageRow): SharedMessage {
    return {
      id: row.id,
      chatId: row.chat_id,
      role: row.role as MessageRole,
      content: row.content,
      metadata: row.metadata ?? undefined,
      createdAt: row.created_at
    };
  }

  /**
   * Test database connection
   */
  async testConnection(): Promise<boolean> {
    try {
      await pool.query('SELECT 1');
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
    await pool.end();
  }
}

export const databaseService = new DatabaseService();
