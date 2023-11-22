import { describe, it, expect, beforeEach } from "vitest";
import {
  SyncAccessHandleFactory,
  FileSystem,
  SyncAccessHandle,
} from "../../../src";

describe("SyncAccessHandleFactory class", () => {
  let fileSystem: FileSystem;
  let factory: SyncAccessHandleFactory;

  beforeEach(() => {
    fileSystem = new FileSystem();
    factory = new SyncAccessHandleFactory(fileSystem);
  });

  describe("create() method", () => {
    it("should create SyncAccessHandle instance", () => {
      const descriptor = fileSystem.createFile("file");
      const instance = factory.create(descriptor);
      expect(instance).toBeInstanceOf(SyncAccessHandle);
    });
  });
});
