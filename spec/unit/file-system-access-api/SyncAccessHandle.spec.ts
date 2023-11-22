import { describe, it, expect, beforeEach } from "vitest";
import { FileSystem, FileDescriptor, SyncAccessHandle } from "../../../src";

describe("SyncAccessHandle class", () => {
  let fs: FileSystem;
  let data: Uint8Array;
  let descriptor: FileDescriptor;
  let handle: SyncAccessHandle;

  beforeEach(() => {
    fs = new FileSystem();
    const numbers = Array.from({ length: 255 }, (_, i) => i) as number[];
    data = new Uint8Array(numbers);
    descriptor = fs.createFile("path/to/file.txt", { size: data.length });
    fs.writeFile(descriptor, data.buffer);
    handle = new SyncAccessHandle(descriptor, fs, true);
  });

  describe("close() method", () => {
    it("should close handle for reading and writing operations", () => {
      const read = () => handle.read(new ArrayBuffer(0));
      const getSize = () => handle.getSize();
      const write = () => handle.write(new Uint8Array(2));
      const trunc = () => handle.truncate(0);
      const flush = () => handle.flush();

      expect(read).not.toThrow();
      expect(getSize).not.toThrow();
      expect(write).not.toThrow();
      expect(trunc).not.toThrow();
      expect(flush).not.toThrow();

      handle.close();

      expect(read).toThrow();
      expect(getSize).toThrow();
      expect(write).toThrow();
      expect(trunc).toThrow();
      expect(flush).toThrow();
    });
  });

  describe("flush() method", () => {
    it("should write internal temp file data to file system", () => {
      const getFileData = () =>
        new Uint8Array(fs.readFile(descriptor)).slice(0, 5);
      const data = new Uint8Array([4, 3, 2, 1, 0]);
      handle.write(data);
      expect(getFileData()).not.toEqual(data);
      handle.flush();
      expect(getFileData()).toEqual(data);
    });

    it("should throw InvalidStateError DOMException when handle is closed", () => {
      handle.close();
      try {
        handle.flush();
        expect.fail("DOMException should be thrown");
      } catch (e) {
        expect(e).toBeInstanceOf(DOMException);
        expect((e as DOMException).name).toBe("InvalidStateError");
      }
    });
  });

  describe("getSize() method", () => {
    it("should return associated file size", () => {
      const associatedFile = fs.readFile(descriptor);
      expect(handle.getSize()).toBe(associatedFile.byteLength);
    });

    it("should throw InvalidStateError DOMException when handle is closed", () => {
      handle.close();
      try {
        handle.getSize();
        expect.fail("DOMException should be thrown");
      } catch (e) {
        expect(e).toBeInstanceOf(DOMException);
        expect((e as DOMException).name).toBe("InvalidStateError");
      }
    });
  });

  describe("read() method", () => {
    it("should read data into given buffer and return read bytes number", () => {
      const buffer = new ArrayBuffer(3);
      const readBytes = handle.read(buffer);
      const view = new Uint8Array(buffer);
      expect(view[0]).toBe(0);
      expect(view[1]).toBe(1);
      expect(view[2]).toBe(2);
      expect(readBytes).toBe(3);
    });

    it("should read from given position if 'at' option is set to that position index", () => {
      const view = new Uint8Array(3);
      const at = 5;
      const readBytes = handle.read(view.buffer, { at });
      expect(view[0]).toBe(5);
      expect(view[1]).toBe(6);
      expect(view[2]).toBe(7);
      expect(readBytes).toBe(3);
    });

    it("should read sequentially using internal cursor, if called multiple times without 'at' option set", () => {
      const string = "Test string!";
      const encoder = new TextEncoder();
      const decoder = new TextDecoder();
      fs.writeFile(descriptor, encoder.encode(string).buffer);
      handle = new SyncAccessHandle(descriptor, fs, true);
      let accumulated = "";
      let readBytes;
      do {
        const chunk = new Uint8Array(2);
        readBytes = handle.read(chunk.buffer);
        if (readBytes) {
          accumulated = accumulated.concat(
            decoder.decode(chunk, { stream: true })
          );
        }
      } while (readBytes > 0);

      expect(accumulated).toBe(string);
    });

    it("should throw InvalidStateError DOMException when handle is closed", () => {
      handle.close();
      const buffer = new ArrayBuffer(4);
      try {
        handle.read(buffer);
        expect.fail("DOMException should be thrown");
      } catch (e) {
        expect(e).toBeInstanceOf(DOMException);
        expect((e as DOMException).name).toBe("InvalidStateError");
      }
    });

    it("should throw TypeError when 'at' option is set to negative value", () => {
      expect(() => handle.read(new ArrayBuffer(5), { at: -1 })).toThrow(
        TypeError
      );
    });
  });

  describe("truncate() method", () => {
    it("should change temp file size to given size", () => {
      expect(descriptor.size).toBe(255);
      handle.truncate(10);
      handle.flush();
      expect(descriptor.size).toBe(10);
      handle.truncate(255);
      handle.flush();
      expect(descriptor.size).toBe(255);
    });

    it("should append NUL-bytes to the end of file if new size is larger than old size", () => {
      const string = "test string content";
      const encodedString = new TextEncoder().encode(string);
      const descriptor = fs.createFile("nulls.txt");
      fs.writeFile(descriptor, encodedString.buffer);
      const handle = new SyncAccessHandle(descriptor, fs, true);
      handle.truncate(encodedString.byteLength + 3);
      handle.flush();
      const decodedString = new TextDecoder().decode(fs.readFile(descriptor));
      expect(decodedString).toBe(`${string}\x00\x00\x00`);
    });

    it("should move internal cursor to the end of file if new file size is less than current cursor position", () => {
      handle.write(new Uint8Array([1, 2, 3, 4, 5]));
      handle.truncate(1);
      handle.write(new Uint8Array([6, 7]));
      handle.flush();
      expect(new Uint8Array(fs.readFile(descriptor))).toEqual(
        new Uint8Array([1, 6, 7])
      );
    });

    it("should throw InvalidStateError DOMException when handle is closed", () => {
      handle.close();
      try {
        handle.truncate(0);
        expect.fail("DOMException should be thrown");
      } catch (e) {
        expect(e).toBeInstanceOf(DOMException);
        expect((e as DOMException).name).toBe("InvalidStateError");
      }
    });

    it("should throw QuotaExceededError DOMException when new size is larger than original file size and exceeds fs free space", () => {
      const limitedFs = new FileSystem(100);
      const limitedFsDescriptor = limitedFs.createFile("file");
      const handle = new SyncAccessHandle(limitedFsDescriptor, limitedFs);
      try {
        handle.truncate(101);
        expect.fail("DOMException should be thrown");
      } catch (e) {
        expect(e).toBeInstanceOf(DOMException);
        expect((e as DOMException).name).toBe("QuotaExceededError");
      }
    });

    it("should throw TypeError when negative value is passed", () => {
      expect(() => handle.truncate(-1)).toThrow(TypeError);
    });
  });

  describe("write() method", () => {
    it("should write data into internal temp file and return number of written bytes", () => {
      const data = new Uint8Array([1, 2, 3]);
      const bytesWritten = handle.write(data);
      expect(bytesWritten).toBe(3);
    });

    it("should write from specified position when 'at' option is passed", () => {
      const at = 2;
      const data = new Uint8Array([255, 255]);
      const oldFileData = new Uint8Array(fs.readFile(descriptor));
      expect(oldFileData.slice(1, 5)).toEqual(new Uint8Array([1, 2, 3, 4]));
      handle.write(data, { at });
      handle.flush();
      const newFileData = new Uint8Array(fs.readFile(descriptor));
      expect(newFileData.slice(1, 5)).toEqual(new Uint8Array([1, 255, 255, 4]));
    });

    it("should write data sequentially using internal cursor if called multiple times without 'at' option set", () => {
      const sequence = [10, 20, 30, 40, 50, 60];
      for (const num of sequence) {
        handle.write(new Uint8Array([num]));
      }
      handle.flush();
      const result = new Uint8Array(fs.readFile(descriptor)).slice(
        0,
        sequence.length
      );
      expect(result).toEqual(new Uint8Array(sequence));
    });

    it("should increase file size when write position + data size > current file size", () => {
      handle.truncate(0);
      expect(handle.getSize()).toBe(0);
      handle.write(new ArrayBuffer(1000));
      expect(handle.getSize()).toBe(1000);
    });

    it("should keep old file content at the end of file if new data is written into middle of file", () => {
      handle.truncate(4);
      handle.write(new Uint8Array([255, 255]), { at: 1 });
      handle.flush();
      expect(new Uint8Array(fs.readFile(descriptor))).toEqual(
        new Uint8Array([0, 255, 255, 3])
      );
    });

    it("should throw InvalidStateError DOMException when handle is closed", () => {
      handle.close();
      try {
        handle.write(new ArrayBuffer(1));
        expect.fail("DOMException should be thrown");
      } catch (e) {
        expect(e).toBeInstanceOf(DOMException);
        expect((e as DOMException).name).toBe("InvalidStateError");
      }
    });

    it("should throw TypeError when 'at' value is negative", () => {
      expect(() => handle.write(new ArrayBuffer(1), { at: -1 })).toThrow(
        TypeError
      );
    });
  });
});
