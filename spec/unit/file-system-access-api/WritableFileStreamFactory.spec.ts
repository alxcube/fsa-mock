import { beforeEach, describe, it, expect } from "vitest";
import {
  SyncAccessHandleFactory,
  WritableFileStreamSinkFactory,
  WritableFileStreamFactory,
  WritableFileStream,
  FileSystem,
  PermissionsManager,
  DefaultPermissionsProvider,
} from "../../../src";

describe("WritableFileStreamFactory class", () => {
  let fileSystem: FileSystem;
  let syncAccessHandleFactory: SyncAccessHandleFactory;
  let sinkFactory: WritableFileStreamSinkFactory;
  let factory: WritableFileStreamFactory;

  beforeEach(() => {
    fileSystem = new FileSystem();
    const permissionsManager = new PermissionsManager(
      fileSystem,
      new DefaultPermissionsProvider()
    );
    syncAccessHandleFactory = new SyncAccessHandleFactory(fileSystem);
    sinkFactory = new WritableFileStreamSinkFactory(
      syncAccessHandleFactory,
      permissionsManager
    );
    factory = new WritableFileStreamFactory(sinkFactory);
  });

  describe("create() method", () => {
    it("should create WritableFileStreamInstance", () => {
      expect(factory.create(fileSystem.createFile("file"))).toBeInstanceOf(
        WritableFileStream
      );
    });
  });
});
