/**
 * Response Helper Utility
 * Standardizes API responses across all controllers
 */

import { Response } from 'express';
import { ApiResponse } from '../types/shared';

export class ResponseHelper {
  /**
   * Send successful response
   */
  static success<T>(
    res: Response<ApiResponse<T>>,
    data: T,
    statusCode: number = 200
  ): Response<ApiResponse<T>> {
    return res.status(statusCode).json({
      success: true,
      data
    });
  }

  /**
   * Send error response
   */
  static error(
    res: Response<ApiResponse>,
    error: string,
    message: string,
    statusCode: number = 500,
    errorType?: string,
    additionalFields?: Record<string, any>
  ): Response<ApiResponse> {
    return res.status(statusCode).json({
      success: false,
      error,
      message,
      ...(errorType && { errorType }),
      ...additionalFields
    });
  }

  /**
   * Send bad request response (400)
   */
  static badRequest(
    res: Response<ApiResponse>,
    message: string,
    errorType?: string
  ): Response<ApiResponse> {
    return this.error(res, 'BAD_REQUEST', message, 400, errorType);
  }

  /**
   * Send service unavailable response (503)
   * Used for external service failures (e.g. LLM)
   */
  static serviceUnavailable(
    res: Response<ApiResponse>,
    message: string,
    errorType?: string,
    retryAfter?: number,
    chatId?: string
  ): Response<ApiResponse> {
    return this.error(
      res,
      'SERVICE_UNAVAILABLE',
      message,
      503,
      errorType,
      {
        ...(retryAfter && { retryAfter }),
        ...(chatId && { chatId })
      }
    );
  }

  /**
   * Send internal server error response (500)
   */
  static internalError(
    res: Response<ApiResponse>,
    message: string = 'Internal server error',
    error: string = 'INTERNAL_ERROR'
  ): Response<ApiResponse> {
    return this.error(res, error, message, 500);
  }
}

