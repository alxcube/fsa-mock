import { beforeEach, describe, it, expect } from "vitest";
import {
  WritableFileStream,
  WritableFileStreamSink,
  FileDescriptor,
  FileSystem,
  SyncAccessHandle,
  PermissionsManager,
  DefaultPermissionsProvider,
} from "../../../src";

describe("WritableFileStream class", () => {
  let stream: WritableFileStream;
  let sink: WritableFileStreamSink;
  let syncAccessHandle: SyncAccessHandle;
  let fs: FileSystem;
  let permissionsManager: PermissionsManager;
  let descriptor: FileDescriptor;
  let permissionsProvider: DefaultPermissionsProvider;
  const DISK_SIZE = 1024;
  const filePath = "path/to/file.txt";

  const getTextContents = () =>
    new TextDecoder().decode(fs.readFile(descriptor));

  beforeEach(() => {
    fs = new FileSystem(DISK_SIZE);
    permissionsProvider = new DefaultPermissionsProvider(
      "granted",
      "granted",
      "granted"
    );
    permissionsManager = new PermissionsManager(fs, permissionsProvider);
    descriptor = fs.createFile(filePath);
    syncAccessHandle = new SyncAccessHandle(descriptor, fs, true);
    sink = new WritableFileStreamSink(
      syncAccessHandle,
      descriptor,
      permissionsManager
    );
    stream = new WritableFileStream(sink);
  });

  describe("write() method", () => {
    it("should write contents to file sequentially", async () => {
      await stream.write("Test text data");
      await stream.write({ type: "write", data: " string" });
      await stream.close();
      expect(getTextContents()).toBe("Test text data string");
    });
  });

  describe("seek() method", () => {
    it("should change internal file cursor position", async () => {
      await stream.write("Replace this content");
      await stream.seek(7);
      await stream.write("d with new content");
      await stream.close();
      expect(getTextContents()).toBe("Replaced with new content");
    });
  });

  describe("truncate() method", () => {
    it("should truncate file content to given length", async () => {
      await stream.write("Trimmed string content");
      await stream.truncate(7);
      await stream.close();
      expect(getTextContents()).toBe("Trimmed");
    });
  });
});
