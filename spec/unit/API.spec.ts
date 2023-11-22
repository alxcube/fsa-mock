import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  DirectoryHandle,
  FileHandle,
  FileSystem,
  API,
  Handle,
  PermissionsManager,
  SyncAccessHandle,
  WritableFileStream,
} from "../../src";

describe("API class", () => {
  let mock: API;
  beforeEach(() => {
    mock = new API();
  });
  afterEach(() => {
    mock.uninstall();
  });

  describe("install() method", () => {
    it("should replace global implementations of File System Access API", async () => {
      mock.install({ saveFilePickerProvider: () => "file.txt" });
      expect(FileSystemHandle).toBe(Handle);
      expect(FileSystemFileHandle).toBe(FileHandle);
      expect(FileSystemDirectoryHandle).toBe(DirectoryHandle);
      expect(FileSystemWritableFileStream).toBe(WritableFileStream);
      if ("FileSystemSyncAccessHandle" in self) {
        expect(self.FileSystemSyncAccessHandle).toBe(SyncAccessHandle);
      }
      const dirHandle = await showDirectoryPicker();
      expect(dirHandle).toBeInstanceOf(DirectoryHandle);
      const saveFileHandle = await showSaveFilePicker();
      expect(saveFileHandle).toBeInstanceOf(FileHandle);
      expect(showOpenFilePicker.toString()).not.toMatch("[native code]");
    });

    describe("uninstall() method", () => {
      it("should restore original implementations of File System Access API", () => {
        if (typeof FileSystemHandle === "undefined") {
          expect.fail(
            "Test environment has no native support of FileSystemAccessApi"
          );
        }
        mock.install();
        mock.uninstall();
        expect(FileSystemHandle).not.toBe(Handle);
        expect(FileSystemFileHandle).not.toBe(FileHandle);
        expect(FileSystemDirectoryHandle).not.toBe(DirectoryHandle);
        expect(FileSystemWritableFileStream).not.toBe(WritableFileStream);
        if ("FileSystemSyncAccessHandle" in self) {
          expect(self.FileSystemSyncAccessHandle).not.toBe(SyncAccessHandle);
        }
        expect(showDirectoryPicker.toString()).toMatch("[native code]");
        expect(showOpenFilePicker.toString()).toMatch("[native code]");
        expect(showSaveFilePicker.toString()).toMatch("[native code]");
      });
    });

    describe("fs() method", () => {
      it("should return FileSystem instance", () => {
        mock.install();
        expect(mock.fs()).toBeInstanceOf(FileSystem);
      });
    });

    describe("pm() method", () => {
      it("should return PermissionsManager instance", () => {
        mock.install();
        expect(mock.pm()).toBeInstanceOf(PermissionsManager);
      });
    });

    describe("exists() method", () => {
      it("should check if path exists in file system", () => {
        mock.install();
        const path = "some/directory/path";
        expect(mock.exists(path)).toBe(false);
        mock.fs().makeDirectory(path, { recursive: true });
        expect(mock.exists(path)).toBe(true);
      });
    });

    describe("isFile() method", () => {
      it("should check if given path is file path", () => {
        mock.install();
        const path = "path/to/file.txt";
        expect(mock.isFile(path)).toBe(false);
        mock.fs().createFile(path);
        expect(mock.isFile(path)).toBe(true);
      });
    });

    describe("isDir() method", () => {
      it("should check if given path is directory path", () => {
        mock.install();
        const path = "path/to/directory";
        expect(mock.isDir(path)).toBe(false);
        mock.fs().makeDirectory(path, { recursive: true });
        expect(mock.isDir(path)).toBe(true);
      });
    });

    describe("makeDir() method", () => {
      it("should recursively make directories of given path", () => {
        mock.install();
        const path = "path/to/directory";
        expect(mock.fs().exists(path)).toBe(false);
        mock.makeDir(path);
        expect(mock.fs().isDirectory(path)).toBe(true);
      });
    });

    describe("createFile() method", () => {
      it("should create empty file in given path if content was not passed", () => {
        mock.install();
        const path = "path/to/file.txt";
        expect(mock.fs().exists(path)).toBe(false);
        mock.createFile(path);
        expect(mock.fs().isFile(path)).toBe(true);
        expect(mock.fs().getFileSize(path)).toBe(0);
      });

      it("should create file with given content if content was passed", () => {
        mock.install();
        const path = "path/to/file.txt";
        const content = new Uint8Array([1, 3, 5, 7]);
        mock.createFile(path, content);
        const descriptor = mock.fs().getFileDescriptor(path)!;
        const fileContent = new Uint8Array(mock.fs().readFile(descriptor));
        expect(fileContent).toEqual(content);
      });
    });

    describe("contents() method", () => {
      it("should return file contents if file exists", () => {
        const text = "File contents string";
        const encodedText = new TextEncoder().encode(text);
        const path = "file.txt";
        mock.install();
        mock.createFile(path, encodedText);
        const contents = mock.contents(path);
        const decodedContents = new TextDecoder().decode(contents);
        expect(decodedContents).toBe(text);
      });

      it("should return undefined if file doesn't exist or given path is directory path", () => {
        const path = "dir/path";
        mock.install();
        mock.makeDir(path);
        expect(mock.contents(path)).toBeUndefined();
        expect(mock.contents("no/path")).toBeUndefined();
      });
    });

    describe("onPromptPermission() method", () => {
      it("should set PromptPermissionProvider on PermissionsManager", async () => {
        mock.install();
        const spy = vi.fn(() => "denied" as const);
        mock.onPromptPermission(spy);
        await mock.pm().requestPermission("", "readwrite");
        expect(spy).toHaveBeenCalled();
      });
    });

    describe("onDirectoryPicker() method", () => {
      it("should set DirectoryPickerProvider on PickersFactory", async () => {
        mock.install();
        const spy = vi.fn(() => "");
        mock.onDirectoryPicker(spy);
        await showDirectoryPicker();
        expect(spy).toHaveBeenCalled();
      });
    });

    describe("onOpenFilePicker() method", () => {
      it("should set OpenFilePickerProvider on PickersFactory", async () => {
        mock.install();
        mock.createFile("file");
        const spy = vi.fn(() => ["file"]);
        mock.onOpenFilePicker(spy);
        await showOpenFilePicker();
        expect(spy).toHaveBeenCalled();
      });
    });

    describe("onSaveFilePicker() method", () => {
      it("should set SaveFilePickerProvider on PickersFactory", async () => {
        mock.install();
        const spy = vi.fn(() => "file.txt");
        mock.onSaveFilePicker(spy);
        await showSaveFilePicker();
        expect(spy).toHaveBeenCalled();
      });
    });

    describe("setDiskSize() method", () => {
      it("should set file system disk size", () => {
        mock.install();
        mock.setDiskSize(23);
        expect(mock.fs().getTotalDiskSpace()).toBe(23);
      });
    });

    describe("setPermission() method", () => {
      it("should set permission for given path", () => {
        const path = ""; // root
        mock.install({
          readPermission: "prompt",
          readwritePermission: "prompt",
        });
        mock.setPermission(path, "readwrite", "denied");
        mock.setPermission(path, "read", "granted");
        expect(mock.pm().getState(path, "readwrite")).toBe("denied");
        expect(mock.pm().getState(path, "read")).toBe("granted");
      });
    });
  });
});
