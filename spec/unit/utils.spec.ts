import { describe, it, expect, beforeEach } from "vitest";
import {
  appendNullBytes,
  basename,
  concatArrayBuffers,
  copyArrayBuffer,
  dirname,
  isChildPath,
  isSubPath,
  pathSegments,
  relativePath,
} from "../../src";

describe("Utility functions", () => {
  describe("pathSegments() function", () => {
    it("should split path into segments by directory separator", () => {
      const path = "path/to/file.txt";
      const segments = pathSegments(path);
      expect(segments.length).toBe(3);
      expect(segments[0]).toBe("path");
      expect(segments[2]).toBe("file.txt");
    });

    it("should split path into segments by backslash", () => {
      const path = "path\\to\\file.txt";
      const segments = pathSegments(path);
      expect(segments.length).toBe(3);
      expect(segments[0]).toBe("path");
      expect(segments[2]).toBe("file.txt");
    });
  });

  describe("basename() function", () => {
    it("should return base name from path", () => {
      expect(basename("path/to/file.txt")).toBe("file.txt");
      expect(basename("path/to/directory")).toBe("directory");
      expect(basename("")).toBe("");
    });
  });

  describe("dirname() function", () => {
    it("should return dir name of path or null if path is empty string", () => {
      expect(dirname("some/long/path")).toBe("some/long");
      expect(dirname("some/long")).toBe("some");
      expect(dirname("some")).toBe("");
      expect(dirname("")).toBe(null);
    });
  });

  describe("isSubPath() function", () => {
    it("should return true if first argument is sub-path of second argument", () => {
      expect(isSubPath("some/long/path", "")).toBe(true);
      expect(isSubPath("some/long/path", "some")).toBe(true);
      expect(isSubPath("some/long/path", "some/long/")).toBe(true);
      expect(isSubPath("some/long/path", "some/long/path")).toBe(false);
      expect(isSubPath("some/long/path", "some/long/path/more")).toBe(false);
      expect(isSubPath("some/long/path", "some/lon")).toBe(false);
    });
  });

  describe("relativePath() function", () => {
    it("should return part of sub-path without parent path", () => {
      expect(relativePath("some/long/path", "some/long")).toBe("path");
      expect(relativePath("some/long/path", "some")).toBe("long/path");
      expect(relativePath("some/long/path", "")).toBe("some/long/path");
    });

    it("should throw error when first argument is not sub-path of second argument", () => {
      expect(() => relativePath("some/long/path", "some/l")).toThrow();
    });
  });

  describe("isChildPath() function", () => {
    it("should return true if path is child path of another path and false otherwise", () => {
      expect(isChildPath("nested/path/deeper", "nested/path")).toBe(true);
      expect(isChildPath("nested/path/deeper", "nested")).toBe(false);
      expect(isChildPath("nested/path/deeper", "")).toBe(false);
      expect(isChildPath("nested", "")).toBe(true);
    });
  });

  describe("copyArrayBuffer() function", () => {
    let target: ArrayBuffer;
    let targetView: DataView;
    beforeEach(() => {
      target = new ArrayBuffer(10);
      targetView = new DataView(target);
    });

    it("should copy data from source buffer to target buffer and return count of copied bytes", () => {
      const writtenBytes = copyArrayBuffer(
        new Uint8Array([1, 2, 3]).buffer,
        target
      );
      expect(writtenBytes).toBe(3);
      expect(targetView.getUint8(0)).toBe(1);
      expect(targetView.getUint8(1)).toBe(2);
      expect(targetView.getUint8(2)).toBe(3);
    });

    it("should copy data from source between given offset", () => {
      const writtenBytes = copyArrayBuffer(
        new Uint8Array([1, 2, 3, 4]).buffer,
        target,
        { sourceStartOffset: 1, sourceEndOffset: 3 }
      );
      expect(writtenBytes).toBe(2);
      expect(targetView.getUint8(0)).toBe(2);
      expect(targetView.getUint8(1)).toBe(3);
      expect(targetView.getUint8(2)).toBe(0);
    });

    it("should copy data to target buffer at specified offset", () => {
      copyArrayBuffer(new Uint8Array([1, 2]).buffer, target, {
        destinationOffset: 8,
      });
      expect(targetView.getUint8(8)).toBe(1);
      expect(targetView.getUint8(9)).toBe(2);
    });

    it("should throw RangeError when 'sourceStartOffset' option is less than 0 or greater than source's byte length", () => {
      expect(() =>
        copyArrayBuffer(new ArrayBuffer(1), target, { sourceStartOffset: -1 })
      ).toThrow(RangeError);
      expect(() =>
        copyArrayBuffer(new ArrayBuffer(1), target, { sourceStartOffset: 2 })
      ).toThrow(RangeError);
    });

    it("should throw RangeError when 'sourceEndOffset' option is less than 'sourceStartOffset' option", () => {
      expect(() =>
        copyArrayBuffer(new ArrayBuffer(10), target, {
          sourceStartOffset: 1,
          sourceEndOffset: 0,
        })
      ).toThrow(RangeError);
    });

    it("should throw RangeError when 'destinationOffsetOption is less than 0 of greater than destination buffer's byte length", () => {
      const source = new ArrayBuffer(1);
      expect(() =>
        copyArrayBuffer(source, target, { destinationOffset: -1 })
      ).toThrow(RangeError);
      expect(() =>
        copyArrayBuffer(source, target, {
          destinationOffset: target.byteLength + 1,
        })
      ).toThrow(RangeError);
    });
  });

  describe("concatArrayBuffers() function", () => {
    it("should concat BufferSource's into single ArrayBuffer", () => {
      const uint8 = new Uint8Array([1, 2, 3]);
      const int8 = new Int8Array([4, 5]);
      const result = concatArrayBuffers([uint8, int8, uint8.buffer]);
      expect(new Uint8Array(result)).toEqual(
        new Uint8Array([1, 2, 3, 4, 5, 1, 2, 3])
      );
    });

    describe("appendNullBytes() function", () => {
      it("should append Null bytes to given ArrayBuffer and return new ArrayBuffer", () => {
        const str = "Test";
        const encodedStr = new TextEncoder().encode(str);
        const appended = appendNullBytes(encodedStr.buffer, 3);
        const decodedStr = new TextDecoder().decode(appended);
        expect(decodedStr).toBe("Test\x00\x00\x00");
      });
    });
  });
});
