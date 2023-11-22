import { beforeEach, describe, expect, it } from "vitest";
import { FileSystem, FileDescriptor } from "../../../src";

describe("FileSystem class", () => {
  let fs: FileSystem;
  let limitedFs: FileSystem;
  const DISK_SIZE_LIMIT = 512;

  beforeEach(() => {
    fs = new FileSystem();
    limitedFs = new FileSystem(DISK_SIZE_LIMIT);
  });

  describe("exists() method", () => {
    it("should check existence of path in file system", () => {
      const directoryPath = "dir";
      const filePath = "file.txt";
      expect(fs.exists(directoryPath)).toBe(false);
      expect(fs.exists(filePath)).toBe(false);
      fs.makeDirectory(directoryPath);
      expect(fs.exists(directoryPath)).toBe(true);
      fs.createFile(filePath);
      expect(fs.exists(filePath)).toBe(true);
    });
  });

  describe("isFile() method", () => {
    it("should return true if given path exists and is file path and false otherwise", () => {
      const directoryPath = "dir";
      const filePath = "file.txt";
      const emptyPath = "empty.txt";
      fs.makeDirectory(directoryPath);
      fs.createFile(filePath);
      expect(fs.isFile(filePath)).toBe(true);
      expect(fs.isFile(directoryPath)).toBe(false);
      expect(fs.isFile(emptyPath)).toBe(false);
    });
  });

  describe("isDirectory() method", () => {
    it("should return true if given path exists and is directory path and false otherwise", () => {
      const directoryPath = "dir";
      const filePath = "file.txt";
      const emptyPath = "empty.txt";
      fs.makeDirectory(directoryPath);
      fs.createFile(filePath);
      expect(fs.isDirectory(filePath)).toBe(false);
      expect(fs.isDirectory(directoryPath)).toBe(true);
      expect(fs.isDirectory(emptyPath)).toBe(false);
    });
  });

  describe("makeDirectory() method", () => {
    it("should create directory and return directory descriptor", () => {
      const path = "myDocuments";
      const descriptor = fs.makeDirectory(path);
      expect(fs.exists(path)).toBe(true);
      expect(fs.isDirectory(path)).toBe(true);
      expect(descriptor.type).toBe("dir");
      expect(descriptor.fullPath).toBe(path);
    });

    it("should create directories in existing directories", () => {
      fs.makeDirectory("some");
      fs.makeDirectory("some/nested");
      fs.makeDirectory("some/nested/path");
      expect(fs.isDirectory("some"));
      expect(fs.isDirectory("some/nested"));
      expect(fs.isDirectory("some/nested/path"));
    });

    it("should create directories recursively when path is nested and 'recursive' option is set to true", () => {
      const descriptor = fs.makeDirectory("some/nested/dir", {
        recursive: true,
      });
      expect(descriptor.fullPath).toBe("some/nested/dir");
      expect(fs.isDirectory("some")).toBe(true);
      expect(fs.isDirectory("some/nested")).toBe(true);
      expect(fs.isDirectory("some/nested/dir")).toBe(true);
    });

    it("should throw error when path already exists", () => {
      const path = "downloads";
      fs.makeDirectory(path);
      expect(() => fs.makeDirectory(path)).toThrow();
    });

    it("should throw error when path is nested and 'recursive' option is not set to true", () => {
      expect(() => fs.makeDirectory("nested/path")).toThrow();
    });

    it("should throw error when there is file path in the middle of given path", () => {
      fs.makeDirectory("some");
      fs.createFile("some/file");
      expect(() => fs.makeDirectory("some/file/dir")).toThrow();
    });

    it("should throw error when path is empty string", () => {
      expect(() => {
        fs.makeDirectory("");
      }).toThrow();
    });
  });

  describe("getDirectoryDescriptor() method", () => {
    it("should return directory descriptor", () => {
      fs.makeDirectory("test");
      const descriptor = fs.getDirectoryDescriptor("test");
      expect(descriptor?.type).toBe("dir");
      expect(descriptor?.fullPath).toBe("test");
    });

    it("should return undefined when directory doesn't exist", () => {
      expect(fs.getDirectoryDescriptor("path")).toBeUndefined();
    });

    it("should create directories recursively when given path doesn't exist and 'create' option is set to true", () => {
      const path = "some/nested/path";
      const descriptor = fs.getDirectoryDescriptor(path, { create: true });
      expect(descriptor).toBeDefined();
    });

    it("should return root directory when path is empty string", () => {
      const descriptor = fs.getDirectoryDescriptor("");
      expect(descriptor?.type).toBe("dir");
      expect(descriptor?.fullPath).toBe("");
    });

    it("should throw error when given path is file path", () => {
      fs.createFile("path");
      expect(() => {
        fs.getDirectoryDescriptor("path");
      }).toThrow();
    });
  });

  describe("createFile() method", () => {
    it("should create file in file system and return it's descriptor", () => {
      const descriptor = fs.createFile("file.txt");
      expect(descriptor.type).toBe("file");
      expect(descriptor.fullPath).toBe("file.txt");
      expect(descriptor.size).toBeTypeOf("number");
    });

    it("should create file of given size when 'size' option is set", () => {
      const size = 10;
      const descriptor = fs.createFile("test", { size });
      expect(descriptor.size).toBe(size);
      const buffer = fs.readFile(descriptor);
      expect(buffer.byteLength).toBe(size);
    });

    it("should create file of 0 bytes size when size option is not given", () => {
      const descriptor = fs.createFile("test");
      expect(descriptor.size).toBe(0);
      const buffer = fs.readFile(descriptor);
      expect(buffer.byteLength).toBe(0);
    });

    it("should throw RangeError when requested size is larger than free disk space", () => {
      expect(() =>
        limitedFs.createFile("test", { size: DISK_SIZE_LIMIT + 1 })
      ).toThrow(RangeError);
    });

    it("should create directories recursively when path is nested", () => {
      const path = "path/to/file.txt";
      fs.createFile(path);
      expect(fs.isDirectory("path")).toBe(true);
      expect(fs.isDirectory("path/to")).toBe(true);
      expect(fs.isFile("path/to/file.txt")).toBe(true);
    });
  });

  describe("getFileDescriptor() method", () => {
    it("should return file descriptor by given path", () => {
      const path = "file.txt";
      fs.createFile(path);
      const descriptor = fs.getFileDescriptor(path);
      expect(descriptor?.type).toBe("file");
      expect(descriptor?.fullPath).toBe(path);
      expect(descriptor?.size).toBeTypeOf("number");
    });

    it("should return undefined when given path doesn't exist", () => {
      expect(fs.getFileDescriptor("path")).toBeUndefined();
    });

    it("should create file and directories recursively when given path doesn't exist and 'create' option is set to true", () => {
      const path = "path/to/test.txt";
      const descriptor = fs.getFileDescriptor(path, { create: true });
      expect(descriptor).toBeDefined();
      expect(fs.isFile(path)).toBe(true);
    });

    it("should throw 'TypeMismatchError' DOMException when given is directory path", () => {
      const path = "test";
      fs.makeDirectory(path);
      try {
        fs.getFileDescriptor(path);
      } catch (e) {
        expect(e).toBeInstanceOf(DOMException);
        expect((e as DOMException).name).toBe("TypeMismatchError");
      }
    });
  });

  describe("readFile() method", () => {
    const filePath = "path/to/file.txt";
    let descriptor: FileDescriptor;
    beforeEach(() => {
      descriptor = fs.createFile(filePath, { size: 1024 });
    });

    it("should return ArrayBuffer of file content", () => {
      const buffer = fs.readFile(descriptor);
      expect(buffer).toBeInstanceOf(ArrayBuffer);
    });

    it("should throw error when file for given descriptor is invalid", () => {
      const fakeDescriptor: FileDescriptor = {
        ...descriptor,
      };
      expect(fakeDescriptor).toEqual(descriptor);
      expect(() => fs.readFile(fakeDescriptor)).toThrow();
      expect(() => fs.readFile(descriptor)).not.toThrow();
    });
  });

  describe("writeFile() method", () => {
    let descriptor: FileDescriptor;
    let limitedFsDescriptor: FileDescriptor;
    let data: ArrayBuffer;
    let view: Uint8Array;
    const path = "file.txt";
    const size = 1024;

    beforeEach(() => {
      descriptor = fs.createFile(path, { size });
      limitedFsDescriptor = limitedFs.createFile(path);
      data = new ArrayBuffer(size);
      view = new Uint8Array(data);
      view[size - 1] = 255;
    });

    it("should save given ArrayBuffer in file system", () => {
      let existingData = new Uint8Array(fs.readFile(descriptor));
      expect(existingData[size - 1]).toBe(0);
      fs.writeFile(descriptor, data);
      existingData = new Uint8Array(fs.readFile(descriptor));
      expect(existingData[size - 1]).toBe(255);
    });

    it("should update size property of file descriptor", () => {
      expect(descriptor.size).toBe(1024);
      const newData = new Uint8Array(10);
      fs.writeFile(descriptor, newData);
      expect(descriptor.size).toBe(10);
    });

    it("should throw RangeError when buffer size is larger than free space", () => {
      const buffer = new ArrayBuffer(DISK_SIZE_LIMIT + 1);
      expect(() => limitedFs.writeFile(limitedFsDescriptor, buffer)).toThrow(
        RangeError
      );
    });

    it("should NotFoundError DOMException when file descriptor is invalid", () => {
      try {
        fs.writeFile({ ...descriptor }, data);
        expect.fail("Should throw DOMException");
      } catch (e) {
        expect(e).toBeInstanceOf(DOMException);
        expect((e as DOMException).name).toBe("NotFoundError");
      }
    });
  });

  describe("getFileSize() method", () => {
    it("should return file size in bytes or undefined if file doesn't exist or given path is directory path", () => {
      const filePath = "file";
      expect(fs.getFileSize(filePath)).toBeUndefined();
      const descriptor = fs.createFile("file");
      expect(fs.getFileSize(filePath)).toBe(0);
      fs.writeFile(descriptor, new ArrayBuffer(50));
      expect(fs.getFileSize(filePath)).toBe(50);
      fs.remove(filePath);
      expect(fs.getFileSize(filePath)).toBeUndefined();
      fs.makeDirectory(filePath);
      expect(fs.getFileSize(filePath)).toBeUndefined();
    });
  });

  describe("remove() method", () => {
    const filePath = "path/to/file.txt";
    const leafDirPath = "path/to/directory";
    beforeEach(() => {
      fs.makeDirectory(leafDirPath, { recursive: true });
      fs.createFile(filePath);
    });

    it("should remove file", () => {
      expect(fs.isFile(filePath)).toBe(true);
      fs.remove(filePath);
      expect(fs.exists(filePath)).toBe(false);
    });

    it("should remove leaf directory", () => {
      expect(fs.isDirectory(leafDirPath)).toBe(true);
      fs.remove(leafDirPath);
      expect(fs.exists(leafDirPath)).toBe(false);
    });

    it("should recursively remove files and directories when parent directory path is given and 'recursive' option is set to true", () => {
      expect(fs.exists("path/to/file.txt")).toBe(true);
      expect(fs.exists("path/to/directory")).toBe(true);
      expect(fs.exists("path/to")).toBe(true);
      expect(fs.exists("path")).toBe(true);

      fs.remove("path", { recursive: true });

      expect(fs.exists("path/to/file.txt")).toBe(false);
      expect(fs.exists("path/to/directory")).toBe(false);
      expect(fs.exists("path/to")).toBe(false);
      expect(fs.exists("path")).toBe(false);
    });

    it("should throw InvalidModificationError DOMException when trying to remove parent directory without 'recursive' option set to true", () => {
      try {
        fs.remove("path");
        expect.fail("Method should throw");
      } catch (e) {
        expect(e).toBeInstanceOf(DOMException);
        expect((e as DOMException).name).toBe("InvalidModificationError");
      }
    });

    it("should throw error when empty string was passed as path", () => {
      expect(() => fs.remove("", { recursive: true })).toThrow();
    });
  });

  describe("getDescriptor() method", () => {
    it("should return file or directory descriptor, or undefined when given path doesn't exist", () => {
      fs.makeDirectory("directory");
      fs.createFile("file.txt");
      const directoryDescriptor = fs.getDescriptor("directory");
      const fileDescriptor = fs.getDescriptor("file.txt");
      const rootDescriptor = fs.getDescriptor("");
      const noDescriptor = fs.getDescriptor("empty");
      expect(directoryDescriptor?.type).toBe("dir");
      expect(fileDescriptor?.type).toBe("file");
      expect(rootDescriptor?.type).toBe("dir");
      expect(noDescriptor).toBeUndefined();
    });
  });

  describe("getDescendantPaths() method", () => {
    beforeEach(() => {
      fs.createFile("some/deep/nested/file.txt");
      fs.makeDirectory("some/deep/directory", { recursive: true });
    });

    it("should return descendant paths of given path", () => {
      const path = "some";
      const expectedPaths = [
        "some/deep/nested/file.txt",
        "some/deep/nested",
        "some/deep",
        "some/deep/directory",
      ];
      const descendantPaths = fs.getDescendantPaths(path);
      descendantPaths.sort();
      expectedPaths.sort();
      expect(descendantPaths.length).toBe(4);
      expect(descendantPaths).toEqual(expectedPaths);

      expect(fs.getDescendantPaths("some/deep/nested")).toEqual([
        "some/deep/nested/file.txt",
      ]);
    });

    it("should return empty array when there's no descendant paths", () => {
      const descendantPaths = fs.getDescendantPaths("some/deep/directory");
      expect(descendantPaths.length).toBe(0);
    });
  });

  describe("getChildPaths() method", () => {
    beforeEach(() => {
      fs.makeDirectory("1/2/3/4/5", { recursive: true });
      fs.createFile("1/2.txt");
    });

    it("should return child paths of given path", () => {
      const expectedPaths = ["1/2", "1/2.txt"];
      const childPaths = fs.getChildPaths("1");
      expectedPaths.sort();
      childPaths.sort();
      expect(childPaths).toEqual(expectedPaths);
    });

    it("should return empty array when there's no child paths", () => {
      const childPaths = fs.getChildPaths("1/2/3/4/5");
      expect(childPaths.length).toBe(0);
    });
  });

  describe("getChildEntries() method", () => {
    it("should return child entries in format [string, DirectoryDescriptor | FileDescriptor][]", () => {
      fs.createFile("0/0");
      fs.makeDirectory("0/1");
      fs.makeDirectory("1");

      const rootEntries = fs.getChildEntries("");
      expect(rootEntries.length).toBe(2);
      expect(rootEntries[0][0]).toBe("0");
      expect(rootEntries[0][1].type).toBe("dir");
      expect(rootEntries[1][0]).toBe("1");
      expect(rootEntries[1][1].type).toBe("dir");

      const deeperEntries = fs.getChildEntries("0");
      expect(deeperEntries.length).toBe(2);
      expect(deeperEntries[0][0]).toBe("0/0");
      expect(deeperEntries[0][1].type).toBe("file");
      expect(deeperEntries[1][0]).toBe("0/1");
      expect(deeperEntries[1][1].type).toBe("dir");

      const noEntries = fs.getChildEntries("1");
      expect(noEntries.length).toBe(0);
    });
  });

  describe("isValidDescriptor", () => {
    it("should return true if descriptor belongs to file system and is valid", () => {
      const fileDescriptor = fs.createFile("0/1");
      const directoryDescriptor = fs.getDirectoryDescriptor("0");
      expect(fs.isValidDescriptor(fileDescriptor)).toBe(true);
      expect(fs.isValidDescriptor({ ...fileDescriptor })).toBe(false);
      expect(fs.isValidDescriptor(directoryDescriptor!)).toBe(true);
      expect(fs.isValidDescriptor({ ...directoryDescriptor! })).toBe(false);
    });
  });

  describe("getTotalDiskSpace() method", () => {
    it("should return total disk space, passed to constructor (Infinity by default)", () => {
      expect(fs.getTotalDiskSpace()).toBe(Infinity);
      expect(limitedFs.getTotalDiskSpace()).toBe(DISK_SIZE_LIMIT);
    });
  });

  describe("setTotalDiskSpace() method", () => {
    it("should set disk size", () => {
      fs.setTotalDiskSpace(DISK_SIZE_LIMIT);
      fs.writeFile(fs.createFile("file"), new ArrayBuffer(100));
      expect(fs.getTotalDiskSpace()).toBe(DISK_SIZE_LIMIT);
      expect(fs.getFreeDiskSpace()).toBe(DISK_SIZE_LIMIT - 100);
      fs.setTotalDiskSpace(DISK_SIZE_LIMIT / 2);
      expect(fs.getTotalDiskSpace()).toBe(DISK_SIZE_LIMIT / 2);
      expect(fs.getFreeDiskSpace()).toBe(DISK_SIZE_LIMIT / 2 - 100);
    });

    it("should throw RangeError when trying to set disk space to a value lower than used space", () => {
      fs.writeFile(fs.createFile("file"), new ArrayBuffer(100));
      expect(() => fs.setTotalDiskSpace(99)).toThrow(RangeError);
    });
  });

  describe("getUsedDiskSpace() method", () => {
    it("should return sum of sizes of all files on disk", () => {
      expect(fs.getUsedDiskSpace()).toBe(0);
      fs.createFile("file1", { size: 10 });
      expect(fs.getUsedDiskSpace()).toBe(10);
      fs.createFile("file2", { size: 15 });
      expect(fs.getUsedDiskSpace()).toBe(25);
      fs.remove("file1");
      expect(fs.getUsedDiskSpace()).toBe(15);
      const descriptor = fs.getFileDescriptor("file2");
      const newData = new ArrayBuffer(50);
      fs.writeFile(descriptor!, newData);
      expect(fs.getUsedDiskSpace()).toBe(50);
    });
  });

  describe("getFreeDiskSpace() method", () => {
    it("should return free disk space size when size limit was passed to constructor", () => {
      expect(limitedFs.getFreeDiskSpace()).toBe(DISK_SIZE_LIMIT);
      limitedFs.createFile("file1", { size: 12 });
      expect(limitedFs.getFreeDiskSpace()).toBe(DISK_SIZE_LIMIT - 12);
      const descriptor = limitedFs.createFile("file2", {
        size: DISK_SIZE_LIMIT - 12,
      });
      expect(limitedFs.getFreeDiskSpace()).toBe(0);
      const buffer = new ArrayBuffer(0);
      limitedFs.writeFile(descriptor, buffer);
      expect(limitedFs.getFreeDiskSpace()).toBe(DISK_SIZE_LIMIT - 12);
    });

    it("should always return Infinity when no size limit was passed to constructor", () => {
      expect(fs.getFreeDiskSpace()).toBe(Infinity);
      fs.createFile("file1", { size: 1024 * 1024 });
      expect(fs.getFreeDiskSpace()).toBe(Infinity);
    });
  });

  describe("purge() method", () => {
    it("should clear all file system records", () => {
      const descriptor = limitedFs.createFile("path/to/file.txt", {
        size: 100,
      });
      const directoryDescriptor = limitedFs.makeDirectory("path/to/directory");
      expect(limitedFs.isValidDescriptor(descriptor)).toBe(true);
      expect(limitedFs.isValidDescriptor(directoryDescriptor)).toBe(true);
      expect(limitedFs.getUsedDiskSpace()).toBe(100);
      expect(limitedFs.getFreeDiskSpace()).toBe(DISK_SIZE_LIMIT - 100);

      limitedFs.purge();

      expect(limitedFs.isValidDescriptor(descriptor)).toBe(false);
      expect(limitedFs.isValidDescriptor(directoryDescriptor)).toBe(false);
      expect(limitedFs.exists("path/to/file.txt")).toBe(false);
      expect(limitedFs.exists("path/to/directory")).toBe(false);
      expect(limitedFs.exists("path/to")).toBe(false);
      expect(limitedFs.exists("path")).toBe(false);
      expect(limitedFs.getUsedDiskSpace()).toBe(0);
      expect(limitedFs.getFreeDiskSpace()).toBe(DISK_SIZE_LIMIT);
    });
  });
});
