import { beforeEach, describe, it, expect } from "vitest";
import {
  DirectoryHandleFactory,
  DirectoryHandle,
  bootstrap,
  FileSystem,
} from "../../../src";

describe("DirectoryHandleFactory class", () => {
  let fileSystem: FileSystem;
  let directoryHandleFactory: DirectoryHandleFactory;

  beforeEach(() => {
    ({ directoryHandleFactory, fileSystem } = bootstrap());
  });

  describe("create() method", () => {
    it("should return DirectoryHandle instance", () => {
      expect(
        directoryHandleFactory.create(fileSystem.getDirectoryDescriptor(""))
      ).toBeInstanceOf(DirectoryHandle);
    });
  });
});
