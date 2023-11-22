import type { EntryNameValidator } from "./EntryNameValidator.ts";

/**
 * Default entry name validator. Forbids ".", ".." and empty string as file or directory names.
 * Uses Regular Expression to test for invalid chars.
 * Default RegExp forbids to use "\", "/", ":", "*", "?", "<", ">", "|" and '"' chars in entry names.
 */
export class DefaultEntryNameValidator implements EntryNameValidator {
  /**
   * DefaultEntryNameValidator constructor.
   *
   * @param invalidCharsRegex Regular Expression for invalid characters check
   */
  constructor(private invalidCharsRegex = /[\\/:*?"<>|]/) {}

  /**
   * {@inheritDoc}
   */
  isValidName(name: string): boolean {
    if (name === "." || name === ".." || !name.length) {
      return false;
    }
    return !this.invalidCharsRegex.test(name);
  }
}
