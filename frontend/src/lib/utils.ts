import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Extracts error message from unknown error type
 */
export function getErrorMessage(error: unknown, defaultMessage: string = 'Unknown error'): string {
  return error instanceof Error ? error.message : defaultMessage;
}
