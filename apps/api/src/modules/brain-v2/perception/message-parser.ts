import { Injectable } from '@nestjs/common';

/**
 * ParsedMessage
 *
 * Structured decomposition of a normalized input string.
 */
export interface ParsedMessage {
  /** The plain-text parts of the message (non-code content). */
  textParts: string[];

  /** Code blocks extracted from the message. */
  codeBlocks: string[];

  /** URLs found in the message. */
  urls: string[];

  /** File path references found in the message (e.g., /path/to/file.ts). */
  filePaths: string[];

  /** Attachment references (file://..., s3://..., etc.). */
  attachmentRefs: string[];
}

/**
 * MessageParser
 *
 * Parses a normalized input string into its structural components.
 * Extracts code blocks, URLs, file paths, and attachment references.
 *
 * Performs ZERO reasoning. Pure syntactic parsing.
 */
@Injectable()
export class MessageParser {
  private readonly CODE_BLOCK_REGEX = /```[\s\S]*?```/g;
  private readonly URL_REGEX = /https?:\/\/[^\s]+/g;
  private readonly FILE_PATH_REGEX = /(?:^|\s)(\/[\w./-]+\.\w+)/g;
  private readonly ATTACHMENT_REF_REGEX = /(?:file|s3|gs):\/\/[^\s]+/g;

  /**
   * Parses a normalized input string.
   *
   * @param normalizedInput - The sanitized input string from InputNormalizer.
   * @returns A ParsedMessage with extracted structural components.
   */
  parse(normalizedInput: string): ParsedMessage {
    const codeBlocks: string[] = [];
    const urls: string[] = [];
    const filePaths: string[] = [];
    const attachmentRefs: string[] = [];

    // Extract and remove code blocks first (to avoid false positives in text parsing).
    let remaining = normalizedInput.replace(
      this.CODE_BLOCK_REGEX,
      (match: string) => {
        codeBlocks.push(match);
        return '';
      },
    );

    // Extract attachment references.
    remaining = remaining.replace(
      this.ATTACHMENT_REF_REGEX,
      (match: string) => {
        attachmentRefs.push(match);
        return '';
      },
    );

    // Extract URLs.
    remaining = remaining.replace(this.URL_REGEX, (match: string) => {
      urls.push(match);
      return '';
    });

    // Extract file paths.
    let fileMatch: RegExpExecArray | null;
    const filePathRegexClone = new RegExp(this.FILE_PATH_REGEX.source, 'g');
    while ((fileMatch = filePathRegexClone.exec(remaining)) !== null) {
      filePaths.push(fileMatch[1]);
    }

    // What remains are the text parts.
    const textParts = remaining
      .split('\n')
      .map((line: string) => line.trim())
      .filter((line: string) => line.length > 0);

    return { textParts, codeBlocks, urls, filePaths, attachmentRefs };
  }
}
