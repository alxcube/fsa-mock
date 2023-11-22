import { beforeEach, describe, it, expect } from "vitest";
import { DefaultEntryNameValidator } from "../../../src";

describe("DefaultEntryNameValidator class", () => {
  let validator: DefaultEntryNameValidator;

  beforeEach(() => {
    validator = new DefaultEntryNameValidator();
  });

  describe("isValidEntryName() method", () => {
    it("should return false if file or directory name is invalid and true otherwise", () => {
      expect(validator.isValidName(".")).toBe(false);
      expect(validator.isValidName("..")).toBe(false);
      expect(validator.isValidName("nested/name")).toBe(false);
      expect(validator.isValidName("nested\\name")).toBe(false);
      expect(validator.isValidName("asterisk*name")).toBe(false);
      expect(validator.isValidName("name?")).toBe(false);
      expect(validator.isValidName('"name"')).toBe(false);
      expect(validator.isValidName("")).toBe(false);
      expect(validator.isValidName("file.txt")).toBe(true);
      expect(validator.isValidName("directory.with.dots")).toBe(true);
    });
  });
});
