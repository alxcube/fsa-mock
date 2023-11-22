import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  basename,
  FileDescriptor,
  FileSystem,
  SyncAccessHandle,
  PermissionsManager,
  FileHandle,
  WritableFileStream,
  FileHandleFactory,
  bootstrap,
} from "../../../src";

describe("FileHandle class", () => {
  let fs: FileSystem;
  let permissionsManager: PermissionsManager;
  let descriptor: FileDescriptor;
  let factory: FileHandleFactory;
  let handle: FileHandle;
  const path = "path/to/file.txt";

  beforeEach(() => {
    ({
      fileSystem: fs,
      permissionsManager,
      fileHandleFactory: factory,
    } = bootstrap({
      readPermission: "granted",
      readwritePermission: "granted",
      resolveToPermission: "granted",
    }));

    descriptor = fs.createFile(path);
    fs.writeFile(descriptor, new Uint8Array([1, 2, 3]));
    handle = factory.create(descriptor);
  });

  describe("'kind' property", () => {
    it("should be 'file'", () => {
      expect(handle.kind).toBe("file");
    });
  });

  describe("'name' property", () => {
    it("should be the last segment of path", () => {
      expect(handle.name).toBe(basename(path));
    });
  });

  describe("getFile() method", () => {
    it("should return promise of File", async () => {
      const file = await handle.getFile();
      expect(file).toBeInstanceOf(File);
      expect(file.name).toBe("file.txt");
      expect(file.size).toBe(3);
      const buffer = await file.arrayBuffer();
      expect(new Uint8Array(buffer)).toEqual(new Uint8Array([1, 2, 3]));
    });

    it("should reject with NotAllowedError DOMException when 'read' permission is not 'granted'", async () => {
      permissionsManager.setState(descriptor.fullPath, "read", "prompt");
      try {
        await handle.getFile();
        expect.fail("Should throw DOMException");
      } catch (e) {
        expect(e).toBeInstanceOf(DOMException);
        expect((e as DOMException).name).toBe("NotAllowedError");
      }
    });

    it("should reject with NotFoundError DOMException when file is not found", async () => {
      fs.remove(descriptor.fullPath);
      try {
        await handle.getFile();
        expect.fail("Should throw DOMException");
      } catch (e) {
        expect(e).toBeInstanceOf(DOMException);
        expect((e as DOMException).name).toBe("NotFoundError");
      }
    });
  });

  describe("createSyncAccessHandle() method", () => {
    it("should return instance of SyncAccessHandle", async () => {
      const syncAccessHandle = await handle.createSyncAccessHandle();
      expect(syncAccessHandle).toBeInstanceOf(SyncAccessHandle);
    });

    it("should reject with NotAllowedError DOMException when 'read' permission is not 'granted'", async () => {
      permissionsManager.setState(descriptor.fullPath, "read", "prompt");
      try {
        await handle.createSyncAccessHandle();
        expect.fail("Should throw DOMException");
      } catch (e) {
        expect(e).toBeInstanceOf(DOMException);
        expect((e as DOMException).name).toBe("NotAllowedError");
      }
    });

    it("should reject with NotFoundError DOMException when file is not found", async () => {
      fs.remove(descriptor.fullPath);
      try {
        await handle.createSyncAccessHandle();
        expect.fail("Should throw DOMException");
      } catch (e) {
        expect(e).toBeInstanceOf(DOMException);
        expect((e as DOMException).name).toBe("NotFoundError");
      }
    });
  });

  describe("createWritable() method", () => {
    it("should return promise of instance of WritableFileStream", async () => {
      const writable = await handle.createWritable();
      expect(writable).toBeInstanceOf(WritableFileStream);
    });

    it("should reject with NotAllowedError DOMException when 'read' permission is not 'granted'", async () => {
      permissionsManager.setState(descriptor.fullPath, "read", "prompt");
      try {
        await handle.createWritable();
        expect.fail("Should throw DOMException");
      } catch (e) {
        expect(e).toBeInstanceOf(DOMException);
        expect((e as DOMException).name).toBe("NotAllowedError");
      }
    });

    it("should reject with NotFoundError DOMException when file is not found", async () => {
      fs.remove(descriptor.fullPath);
      try {
        await handle.createWritable();
        expect.fail("Should throw DOMException");
      } catch (e) {
        expect(e).toBeInstanceOf(DOMException);
        expect((e as DOMException).name).toBe("NotFoundError");
      }
    });
  });

  describe("isSameEntry() method", () => {
    it("should return true if handles has same file descriptor", async () => {
      const sameEntry = factory.create(descriptor);
      const differentEntry = factory.create(fs.createFile("other.txt"));
      expect(await handle.isSameEntry(sameEntry)).toBe(true);
      expect(await handle.isSameEntry(differentEntry)).toBe(false);
      expect(await handle.isSameEntry(handle)).toBe(true);
    });
  });

  describe("queryPermission() method", () => {
    it("should return permission state of given handle", async () => {
      expect(await handle.queryPermission()).toBe("granted");
      expect(await handle.queryPermission({ mode: "readwrite" })).toBe(
        "granted"
      );
      permissionsManager.setState(descriptor.fullPath, "readwrite", "prompt");
      expect(await handle.queryPermission({ mode: "readwrite" })).toBe(
        "prompt"
      );
    });

    it("should throw TypeError when 'mode' is other than 'read' of 'readwrite", () => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      expect(() => handle.queryPermission({ mode: "write" })).rejects.toThrow(
        TypeError
      );
    });
  });

  describe("requestPermission() method", () => {
    it("should call permission manager requestPermission() method and return promise of permission state", async () => {
      permissionsManager.setState(descriptor.fullPath, "readwrite", "prompt");
      const spy = vi.spyOn(permissionsManager, "requestPermission");
      permissionsManager.setPromptPermissionProvider(() => "denied");
      expect(await handle.requestPermission({ mode: "readwrite" })).toBe(
        "denied"
      );
      expect(spy).toHaveBeenCalledOnce();
    });
  });

  describe("getDescriptor() method", () => {
    it("should return file descriptor", () => {
      expect(handle.getDescriptor()).toBe(descriptor);
    });
  });
});
