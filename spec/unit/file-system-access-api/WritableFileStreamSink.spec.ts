import { beforeEach, describe, it, expect, vi } from "vitest";
import {
  FileDescriptor,
  FileSystem,
  SyncAccessHandle,
  WritableFileStreamSink,
  PermissionsManager,
  PermissionsProvider,
  DefaultPermissionsProvider,
} from "../../../src";

describe("WritableFileStreamSink class", () => {
  let fs: FileSystem;
  let permissionsProvider: PermissionsProvider;
  let permissionsManager: PermissionsManager;
  let descriptor: FileDescriptor;
  let syncAccessHandle: SyncAccessHandle;
  let sink: WritableFileStreamSink;

  beforeEach(() => {
    fs = new FileSystem(1000);
    permissionsProvider = new DefaultPermissionsProvider(
      "granted",
      "granted",
      "granted"
    );
    permissionsManager = new PermissionsManager(fs, permissionsProvider);
    descriptor = fs.createFile("file.txt");
    fs.writeFile(descriptor, new ArrayBuffer(10));
    syncAccessHandle = new SyncAccessHandle(descriptor, fs, true);
    sink = new WritableFileStreamSink(
      syncAccessHandle,
      descriptor,
      permissionsManager
    );
  });

  describe("write() method", () => {
    it("should accept ArrayBuffer, DataView, TypedArray, Blob and string chunks", async () => {
      const numbers = [1, 2, 3];
      const string = "Test string";
      const int8 = new Int8Array(numbers);
      const uint8 = new Uint8Array(numbers);
      const uint8clamped = new Uint8ClampedArray(numbers);
      const int16 = new Int16Array(numbers);
      const uint16 = new Uint16Array(numbers);
      const int32 = new Int32Array(numbers);
      const uint32 = new Uint32Array(numbers);
      const float32 = new Float32Array(numbers);
      const float64 = new Float64Array(numbers);
      const numBlob = new Blob([int8]);
      const strBlob = new Blob([string], { type: "text/plain" });
      const buffer = int8.buffer;
      const view = new DataView(buffer);

      const chunks = [
        string,
        int8,
        uint8,
        uint8clamped,
        int16,
        uint16,
        int32,
        uint32,
        float32,
        float64,
        numBlob,
        strBlob,
        buffer,
        view,
      ];

      const dataWritten = new Uint8Array(1000);
      let bytesWritten = 0;

      for (const chunk of chunks) {
        await sink.write(chunk);
        let buffer: ArrayBuffer;
        if (chunk instanceof Blob) {
          buffer = await chunk.arrayBuffer();
        } else if (typeof chunk === "string") {
          buffer = new TextEncoder().encode(chunk).buffer;
        } else if ("buffer" in chunk) {
          buffer = chunk.buffer;
        } else {
          buffer = chunk;
        }
        dataWritten.set(new Uint8Array(buffer), bytesWritten);
        bytesWritten += buffer.byteLength;
      }
      await sink.close();

      const result = fs.readFile(descriptor);
      expect(dataWritten.slice(0, bytesWritten)).toEqual(
        new Uint8Array(result).slice(0, bytesWritten)
      );
    });

    it("should accept 'write' command object and write data in file", async () => {
      const data = new Uint8Array([1, 2, 3]);
      const data2 = new Uint8Array([4, 5, 6]);
      await sink.write({ type: "write", data });
      await sink.write({ type: "write", data: data2 });
      await sink.close();
      const fileContents = new Uint8Array(fs.readFile(descriptor));
      expect(fileContents.slice(0, 3)).toEqual(data);
      expect(fileContents.slice(3, 6)).toEqual(data2);
    });

    it("should accept 'write' command object with 'position' property and write in that position", async () => {
      const data = new Uint8Array([1, 2, 3]);
      const data2 = new Uint8Array([4, 5, 6]);
      await sink.write({ type: "write", data });
      await sink.write({ type: "write", data: data2, position: 0 });
      await sink.close();
      const fileContents = new Uint8Array(fs.readFile(descriptor));
      expect(fileContents.slice(0, 3)).toEqual(data2);
    });

    it("should accept 'seek' command and move cursor to specified position", async () => {
      const data = new Uint8Array([1, 2, 3]);
      const data2 = new Uint8Array([4, 5, 6]);
      await sink.write({ type: "write", data });
      await sink.write({ type: "seek", position: 1 });
      await sink.write({ type: "write", data: data2 });
      await sink.close();
      const fileContents = new Uint8Array(fs.readFile(descriptor));
      expect(fileContents.slice(0, 4)).toEqual(new Uint8Array([1, 4, 5, 6]));
    });

    it("should accept 'truncate' command and change file size to specified size", async () => {
      const data = new Uint8Array([1, 2, 3, 4, 5, 6]);
      await sink.write({ type: "write", data });
      await sink.write({ type: "truncate", size: 3 });
      await sink.close();
      const fileContents = new Uint8Array(fs.readFile(descriptor));
      expect(fileContents.byteLength).toBe(3);
      expect(fileContents).toEqual(new Uint8Array([1, 2, 3]));
    });

    it("should truncate file to larger size when there's not enough memory in file to accept new chunk", async () => {
      await sink.write({ type: "truncate", size: 2 });
      const spy = vi.spyOn(syncAccessHandle, "truncate");
      await sink.write(new Uint8Array([1, 2, 3, 4]));
      expect(spy).toHaveBeenCalledWith(4);
    });

    it("should move internal cursor to the end of file when size after truncation is less than cursor position", async () => {
      await sink.write({ type: "seek", position: 3 });
      await sink.write(new Uint8Array([1, 2]));
      await sink.write({ type: "truncate", size: 4 });
      await sink.write(new Uint8Array([255]));
      await sink.close();
      const fileContent = new Uint8Array(fs.readFile(descriptor));
      expect(fileContent[3]).toBe(1);
      expect(fileContent[4]).toBe(255);
    });

    it("should write stringified data when data is not BufferSource, Blob or string", async () => {
      await sink.write({ type: "truncate", size: 0 });
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      await sink.write({});
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      await sink.write([1, 2, 3]);

      await sink.close();

      const contents = new TextDecoder().decode(fs.readFile(descriptor));
      expect(contents).toBe("[object Object]1,2,3");
    });

    it("should throw 'NotAllowedError' DOMException when permission is not 'granted'", async () => {
      permissionsManager.setState(descriptor.fullPath, "readwrite", "prompt");
      try {
        await sink.write(new ArrayBuffer(2));
        expect.fail("Should throw DOMException");
      } catch (e) {
        expect(e).toBeInstanceOf(DOMException);
        expect((e as DOMException).name).toBe("NotAllowedError");
      }
    });

    it("should throw 'QuotaExceededError` DOMException when there is not enough space on disk", async () => {
      try {
        await sink.write({ type: "truncate", size: 1001 });
        expect.fail("Should throw DOMException");
      } catch (e) {
        expect(e).toBeInstanceOf(DOMException);
        expect((e as DOMException).name).toBe("QuotaExceededError");
      }
    });

    it("should throw TypeError when 'data' prop of 'write' command is undefined or null", () => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      expect(() => sink.write({ type: "write" })).rejects.toThrow(TypeError);
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      expect(() => sink.write({ type: "write", data: null })).rejects.toThrow(
        TypeError
      );
    });

    it("should throw TypeError when 'size' prop of 'truncate' command is undefined or null", () => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      expect(() => sink.write({ type: "truncate" })).rejects.toThrow(TypeError);
      expect(() =>
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        sink.write({ type: "truncate", size: null })
      ).rejects.toThrow(TypeError);
    });

    it("should throw TypeError when 'position' prop of 'seek' command is undefined or null", () => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      expect(() => sink.write({ type: "seek" })).rejects.toThrow(TypeError);

      expect(() =>
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        sink.write({ type: "seek", position: null })
      ).rejects.toThrow(TypeError);
    });

    it("should throw TypeError when object is not Blob and it's 'type' prop is other than 'write', 'seek' or 'truncate'", () => {
      // @ts-expect-error TypeError
      expect(() => sink.write({ type: "something" })).rejects.toThrow(
        TypeError
      );
    });

    it("should throw error on subsequent calls if error occur in previous call", async () => {
      try {
        await sink.write({ type: "seek" });
      } catch (e) {
        // do nothing
      }

      try {
        await sink.write({ type: "seek", position: 1 });
        expect.fail("Error should be thrown");
      } catch (e) {
        expect(e).toBeInstanceOf(TypeError);
      }
    });

    it("should throw TypeError when called after sink is closed", async () => {
      await sink.close();
      expect(() => sink.write({ type: "seek", position: 0 })).rejects.toThrow(
        TypeError
      );
    });
  });

  describe("close() method", () => {
    it("should call close() and flush() methods on sync access handle", async () => {
      const closeSpy = vi.spyOn(syncAccessHandle, "close");
      const flushSpy = vi.spyOn(syncAccessHandle, "flush");
      await sink.close();
      expect(closeSpy).toHaveBeenCalled();
      expect(flushSpy).toHaveBeenCalled();
    });

    it("should throw TypeError when called after sink is closed", async () => {
      await sink.close();
      expect(() => sink.close()).rejects.toThrow(TypeError);
    });
  });

  describe("abort() method", () => {
    it("should put sink into error state", async () => {
      const error = new Error("test sink error");
      await sink.abort(error);
      expect(() => sink.write({ type: "truncate", size: 10 })).rejects.toThrow(
        error
      );
      expect(() => sink.close()).rejects.toThrow(TypeError);
    });
  });
});
