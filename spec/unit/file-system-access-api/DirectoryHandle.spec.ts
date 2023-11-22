import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  DirectoryDescriptor,
  FileSystem,
  PermissionsManager,
  DirectoryHandle,
  Handle,
  FileHandle,
  DirectoryHandleFactory,
  bootstrap,
} from "../../../src";

describe("DirectoryHandle class", () => {
  let fs: FileSystem;
  let permissionsManager: PermissionsManager;
  let descriptor: DirectoryDescriptor;
  let handle: DirectoryHandle;
  let factory: DirectoryHandleFactory;

  beforeEach(() => {
    ({
      fileSystem: fs,
      directoryHandleFactory: factory,
      permissionsManager,
    } = bootstrap({
      readPermission: "granted",
      readwritePermission: "granted",
      resolveToPermission: "granted",
    }));

    descriptor = fs.getDirectoryDescriptor("")!;
    handle = factory.create(descriptor);

    fs.makeDirectory("dir1/subdir1/sub-subdir", { recursive: true });
    fs.makeDirectory("dir1/subdir2", { recursive: true });
    fs.createFile("dir1/subdir1/text.txt");
    fs.createFile("dir2/file.txt");
    fs.createFile("file-at-root.txt");
  });

  describe("'kind' property", () => {
    it("should be 'directory'", () => {
      expect(handle.kind).toBe("directory");
    });
  });

  describe("'name' property", () => {
    it("should be the last part of directory path", async () => {
      expect(handle.name).toBe(""); // root directory
      const subDir = await handle.getDirectoryHandle("dir1");
      const subDir1 = await subDir.getDirectoryHandle("subdir1");
      expect(subDir.name).toBe("dir1");
      expect(subDir1.name).toBe("subdir1");
    });
  });

  describe("[Symbol.asyncIterator]() method", () => {
    it("should call entries() and return iterable iterator", () => {
      const spy = vi.spyOn(handle, "entries");
      const iterator = handle[Symbol.asyncIterator]();
      expect(spy).toHaveBeenCalled();
      expect(iterator[Symbol.asyncIterator]).toBeTypeOf("function");
      expect(iterator.next).toBeTypeOf("function");
    });
  });

  describe("entries() method", () => {
    it("should return async iterable iterator of directory children entries", async () => {
      const names: string[] = [];
      for await (const [name, fsHandle] of handle.entries()) {
        names.push(name);
        expect(fsHandle).toBeInstanceOf(Handle);
      }
      expect(names.length).toBe(3);
      const expectedNames = ["dir1", "dir2", "file-at-root.txt"];
      expect(names.sort()).toEqual(expectedNames.sort());
    });
  });

  describe("keys() method", () => {
    it("should return async iterable iterator of directory children names", async () => {
      const names: string[] = [];
      for await (const name of handle.keys()) {
        names.push(name);
      }
      expect(names.length).toBe(3);
      const expectedNames = ["dir1", "dir2", "file-at-root.txt"];
      expect(names.sort()).toEqual(expectedNames.sort());
    });
  });

  describe("values() method", () => {
    it("should return async iterable iterator of directory children handles", async () => {
      const expectedKinds = {
        dir1: "directory",
        dir2: "directory",
        "file-at-root.txt": "file",
      };
      for await (const childHandle of handle.values()) {
        expect(childHandle).toBeInstanceOf(Handle);
        expect(childHandle.kind).toBe(
          expectedKinds[childHandle.name as keyof typeof expectedKinds]
        );
      }
    });
  });

  describe("getDirectoryHandle() method", () => {
    it("should return promise of child directory handle", async () => {
      const child = await handle.getDirectoryHandle("dir1");
      expect(child).toBeInstanceOf(DirectoryHandle);
      expect(child.name).toBe("dir1");
    });

    it("should create directory when directory doesn't exist and 'create' option is set to true", async () => {
      expect(fs.exists("dir3")).toBe(false);
      const dir3 = await handle.getDirectoryHandle("dir3", { create: true });
      expect(dir3).toBeInstanceOf(DirectoryHandle);
      expect(fs.isDirectory("dir3")).toBe(true);
    });

    it("should call queryPermission() method with 'read' mode when 'create' option is not true", async () => {
      const spy = vi.spyOn(handle, "queryPermission");
      await handle.getDirectoryHandle("dir1");
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({ mode: "read" })
      );
    });

    it("should call requestPermission() method with 'readwrite' mode when 'create' option is set to true", async () => {
      const spy = vi.spyOn(handle, "requestPermission");
      await handle.getDirectoryHandle("dir1", { create: true });
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({ mode: "readwrite" })
      );
    });

    it("should throw NotAllowedError DOMException when there's no granted 'read' permission and 'create' option is not set", async () => {
      permissionsManager.setState(descriptor.fullPath, "read", "denied");
      try {
        await handle.getDirectoryHandle("dir1");
        expect.fail("Should throw DOMException");
      } catch (e) {
        expect(e).toBeInstanceOf(DOMException);
        expect((e as DOMException).name).toBe("NotAllowedError");
      }
    });

    it("should throw NotAllowedError DOMException when there's no granted 'readwrite' permission and 'create' option is set to true", async () => {
      permissionsManager.setState(descriptor.fullPath, "readwrite", "denied");
      try {
        await handle.getDirectoryHandle("dir1", { create: true });
        expect.fail("Should throw DOMException");
      } catch (e) {
        expect(e).toBeInstanceOf(DOMException);
        expect((e as DOMException).name).toBe("NotAllowedError");
      }
    });

    it("should throw TypeMismatchError DOMException when requested name is file", async () => {
      try {
        await handle.getDirectoryHandle("file-at-root.txt");
        expect.fail("Should throw DOMException");
      } catch (e) {
        expect(e).toBeInstanceOf(DOMException);
        expect((e as DOMException).name).toBe("TypeMismatchError");
      }
    });

    it("should throw NotFoundError DOMException when current entry doesn't exist", async () => {
      const dir1 = await handle.getDirectoryHandle("dir1");
      fs.remove("dir1", { recursive: true });
      try {
        await dir1.getDirectoryHandle("subdir1");
        expect.fail("Should throw DOMException");
      } catch (e) {
        expect(e).toBeInstanceOf(DOMException);
        expect((e as DOMException).name).toBe("NotFoundError");
      }
    });

    it("should throw NotFoundError DOMException when child with given name doesn't exist and 'create' option is not set", async () => {
      try {
        await handle.getDirectoryHandle("dir3");
        expect.fail("Should throw DOMException");
      } catch (e) {
        expect(e).toBeInstanceOf(DOMException);
        expect((e as DOMException).name).toBe("NotFoundError");
      }
    });

    it("should throw TypeError when name contains illegal characters", () => {
      expect(() => handle.getDirectoryHandle("directory?")).rejects.toThrow(
        TypeError
      );
    });
  });

  describe("getFileHandle() method", () => {
    it("should return promise of FileHandle", async () => {
      const fileHandle = await handle.getFileHandle("file-at-root.txt");
      expect(fileHandle).toBeInstanceOf(FileHandle);
      expect(fileHandle.name).toBe("file-at-root.txt");
    });

    it("should create file if file with given name doesn't exist and 'create' option is set to true", async () => {
      const fileName = "New File.txt";
      expect(fs.exists(fileName)).toBe(false);
      const fileHandle = await handle.getFileHandle(fileName, { create: true });
      expect(fileHandle).toBeInstanceOf(FileHandle);
      expect(fileHandle.name).toBe(fileName);
      expect(fs.isFile(fileName)).toBe(true);
    });

    it("should call queryPermission() method with 'read' mode when 'create' option is not true", async () => {
      const spy = vi.spyOn(handle, "queryPermission");
      await handle.getFileHandle("file-at-root.txt");
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({ mode: "read" })
      );
    });

    it("should call requestPermission() method with 'readwrite' mode when 'create' option is set to true", async () => {
      const spy = vi.spyOn(handle, "requestPermission");
      await handle.getFileHandle("file-at-root.txt", { create: true });
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({ mode: "readwrite" })
      );
    });

    it("should throw NotAllowedError DOMException when there's no granted 'read' permission and 'create' option is not set", async () => {
      permissionsManager.setState(descriptor.fullPath, "read", "denied");
      try {
        await handle.getFileHandle("file-at-root.txt");
        expect.fail("Should throw DOMException");
      } catch (e) {
        expect(e).toBeInstanceOf(DOMException);
        expect((e as DOMException).name).toBe("NotAllowedError");
      }
    });

    it("should throw NotAllowedError DOMException when there's no granted 'readwrite' permission and 'create' option is set to true", async () => {
      permissionsManager.setState(descriptor.fullPath, "readwrite", "denied");
      try {
        await handle.getFileHandle("file-at-root.txt", { create: true });
        expect.fail("Should throw DOMException");
      } catch (e) {
        expect(e).toBeInstanceOf(DOMException);
        expect((e as DOMException).name).toBe("NotAllowedError");
      }
    });

    it("should throw TypeMismatchError DOMException when requested name is directory", async () => {
      try {
        await handle.getFileHandle("dir1");
        expect.fail("Should throw DOMException");
      } catch (e) {
        expect(e).toBeInstanceOf(DOMException);
        expect((e as DOMException).name).toBe("TypeMismatchError");
      }
    });

    it("should throw NotFoundError DOMException when current entry doesn't exist", async () => {
      const dir1 = await handle.getDirectoryHandle("dir1");
      fs.remove("dir1", { recursive: true });
      try {
        await dir1.getFileHandle("new-file", { create: true });
        expect.fail("Should throw DOMException");
      } catch (e) {
        expect(e).toBeInstanceOf(DOMException);
        expect((e as DOMException).name).toBe("NotFoundError");
      }
    });

    it("should throw NotFoundError DOMException when file with given name doesn't exist and 'create' option is not set", async () => {
      try {
        await handle.getFileHandle("no-file.txt");
        expect.fail("Should throw DOMException");
      } catch (e) {
        expect(e).toBeInstanceOf(DOMException);
        expect((e as DOMException).name).toBe("NotFoundError");
      }
    });

    it("should throw TypeError when name is invalid", () => {
      expect(() => handle.getFileHandle("")).rejects.toThrow(TypeError);
    });
  });

  describe("removeEntry() method", () => {
    it("should remove file", async () => {
      const fileName = "file-at-root.txt";
      expect(fs.exists(fileName)).toBe(true);
      await handle.removeEntry(fileName);
      expect(fs.exists(fileName)).toBe(false);
    });

    it("should remove directory without children", async () => {
      const dirName = "empty-dir";
      fs.makeDirectory(dirName);
      expect(fs.exists(dirName)).toBe(true);
      await handle.removeEntry(dirName);
      expect(fs.exists(dirName)).toBe(false);
    });

    it("should remove directory recursively if 'recursive' option is set to true", async () => {
      const paths = [
        "dir1",
        "dir1/subdir1",
        "dir1/subdir1/sub-subdir",
        "dir1/subdir1/text.txt",
      ];
      paths.forEach((p) => expect(fs.exists(p)).toBe(true));
      await handle.removeEntry("dir1", { recursive: true });
      paths.forEach((p) => expect(fs.exists(p)).toBe(false));
    });

    it("should call requestPermission() method with 'readwrite' mode", async () => {
      const spy = vi.spyOn(handle, "requestPermission");
      await handle.removeEntry("file-at-root.txt");
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({ mode: "readwrite" })
      );
    });

    it("should throw InvalidModificationError DOMException when trying to remove directory with children without 'recursive' option set to true", async () => {
      try {
        await handle.removeEntry("dir1");
        expect.fail("Should throw DOMException");
      } catch (e) {
        expect(e).toBeInstanceOf(DOMException);
        expect((e as DOMException).name).toBe("InvalidModificationError");
      }
    });

    it("should throw NotAllowedError DOMException when there's no granted 'readwrite' permission", async () => {
      permissionsManager.setState(descriptor.fullPath, "readwrite", "denied");
      try {
        await handle.removeEntry("file-at-root.txt");
        expect.fail("Should throw DOMException");
      } catch (e) {
        expect(e).toBeInstanceOf(DOMException);
        expect((e as DOMException).name).toBe("NotAllowedError");
      }
    });

    it("should throw NotFoundError DOMException when current entry doesn't exist", async () => {
      const dir1 = await handle.getDirectoryHandle("dir1");
      fs.remove("dir1", { recursive: true });
      try {
        await dir1.removeEntry("subdir1", { recursive: true });
        expect.fail("Should throw DOMException");
      } catch (e) {
        expect(e).toBeInstanceOf(DOMException);
        expect((e as DOMException).name).toBe("NotFoundError");
      }
    });

    it("should throw NotFoundError DOMException when entry with given name doesn't exist", async () => {
      try {
        await handle.removeEntry("no-file.txt");
        expect.fail("Should throw DOMException");
      } catch (e) {
        expect(e).toBeInstanceOf(DOMException);
        expect((e as DOMException).name).toBe("NotFoundError");
      }
    });

    it("should throw TypeError when name contains illegal characters", () => {
      expect(() => handle.removeEntry("file/txt")).rejects.toThrow(TypeError);
    });
  });

  describe("resolve() method", () => {
    it("should return array of directory names from the parent handle to the specified child entry, with the name of the child entry as the last array item", async () => {
      const dir1 = await handle.getDirectoryHandle("dir1");
      const subdir1 = await dir1.getDirectoryHandle("subdir1");
      const subSubDir = await subdir1.getDirectoryHandle("sub-subdir");
      const textFile = await subdir1.getFileHandle("text.txt");
      const dir2 = await handle.getDirectoryHandle("dir2");

      expect(await handle.resolve(subSubDir)).toEqual([
        "dir1",
        "subdir1",
        "sub-subdir",
      ]);
      expect(await dir1.resolve(subSubDir)).toEqual(["subdir1", "sub-subdir"]);
      expect(await subdir1.resolve(subSubDir)).toEqual(["sub-subdir"]);
      expect(await subSubDir.resolve(subSubDir)).toEqual([]);
      expect(await subSubDir.resolve(subdir1)).toBe(null);
      expect(await dir2.resolve(subdir1)).toBe(null);
      expect(await subdir1.resolve(textFile)).toEqual(["text.txt"]);
    });
  });
});
