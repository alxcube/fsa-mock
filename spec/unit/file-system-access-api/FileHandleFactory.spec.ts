import { beforeEach, describe, it, expect } from "vitest";
import {
  FileHandleFactory,
  FileHandle,
  bootstrap,
  FileSystem,
} from "../../../src";

describe("FileHandleFactory class", () => {
  let factory: FileHandleFactory;
  let fileSystem: FileSystem;

  beforeEach(() => {
    ({ fileHandleFactory: factory, fileSystem } = bootstrap());
  });

  describe("create() method", () => {
    it("should return FileHandle instance", () => {
      expect(factory.create(fileSystem.createFile("file"))).toBeInstanceOf(
        FileHandle
      );
    });
  });
});
