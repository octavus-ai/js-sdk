import { z } from 'zod';

const ApiErrorResponseSchema = z.object({
  error: z.string().optional(),
  message: z.string().optional(),
  code: z.string().optional(),
});

/**
 * Error thrown when API request fails
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface ParsedApiError {
  message: string;
  code?: string;
}

/**
 * Parse error from API response using Zod
 */
export async function parseApiError(
  response: Response,
  defaultMessage: string,
): Promise<ParsedApiError> {
  const fallbackMessage = `${defaultMessage}: ${response.statusText}`;

  try {
    const json: unknown = await response.json();
    const parsed = ApiErrorResponseSchema.safeParse(json);

    if (parsed.success) {
      return {
        message: parsed.data.error ?? parsed.data.message ?? fallbackMessage,
        code: parsed.data.code,
      };
    }
  } catch {
    // Use default message
  }

  return { message: fallbackMessage };
}

/**
 * Parse error from API response and throw ApiError
 */
export async function throwApiError(response: Response, defaultMessage: string): Promise<never> {
  const { message, code } = await parseApiError(response, defaultMessage);
  throw new ApiError(message, response.status, code);
}
