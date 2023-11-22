import { beforeEach, describe, it, expect } from "vitest";
import {
  WritableFileStreamSinkFactory,
  SyncAccessHandleFactory,
  WritableFileStreamSink,
  PermissionsManager,
  DefaultPermissionsProvider,
  FileSystem,
} from "../../../src";

describe("WritableFileStreamSinkFactory class", () => {
  let fileSystem: FileSystem;
  let syncAccessHandleFactory: SyncAccessHandleFactory;
  let factory: WritableFileStreamSinkFactory;

  beforeEach(() => {
    fileSystem = new FileSystem();
    syncAccessHandleFactory = new SyncAccessHandleFactory(fileSystem);
    factory = new WritableFileStreamSinkFactory(
      syncAccessHandleFactory,
      new PermissionsManager(fileSystem, new DefaultPermissionsProvider())
    );
  });

  describe("create() method", () => {
    it("should create WritableFileStreamSink instance", () => {
      expect(factory.create(fileSystem.createFile("file"))).toBeInstanceOf(
        WritableFileStreamSink
      );
    });
  });
});
