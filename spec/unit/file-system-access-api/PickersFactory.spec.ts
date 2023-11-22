import { beforeEach, describe, it, expect, vi } from "vitest";
import {
  PickersFactory,
  DirectoryHandle,
  FileHandle,
  FileSystem,
  PermissionsManager,
  bootstrap,
} from "../../../src";

describe("PickerFactories class", () => {
  let fileSystem: FileSystem;
  let permissionsManager: PermissionsManager;
  let pickersFactory: PickersFactory;

  beforeEach(() => {
    ({ fileSystem, pickersFactory, permissionsManager } = bootstrap());
  });

  describe("createShowDirectoryPicker() method", () => {
    it("should return showDirectoryPicker() mock function", () => {
      expect(pickersFactory.createShowDirectoryPicker()).toBeTypeOf("function");
    });

    describe("showDirectoryPicker() mock function", () => {
      let showPicker: typeof showDirectoryPicker;
      beforeEach(() => {
        showPicker = pickersFactory.createShowDirectoryPicker();
      });

      it("should return root directory handle with granted 'read' mode permission when no DirectoryPickerProvider was set", async () => {
        const handle = await showPicker();
        expect(handle).toBeInstanceOf(DirectoryHandle);
        expect(handle.name).toBe("");
        expect(await handle.queryPermission({ mode: "read" })).toBe("granted");
        expect(await handle.queryPermission({ mode: "readwrite" })).toBe(
          "prompt"
        );
      });

      it("should return DirectoryHandle with granted 'readwrite' mode permission when 'mode' option was set to 'readwrite'", async () => {
        const handle = await showPicker({ mode: "readwrite" });
        expect(await handle.queryPermission({ mode: "readwrite" })).toBe(
          "granted"
        );
      });

      it("should return DirectoryHandle of directory, whose path was returned by DirectoryPickerProvider", async () => {
        fileSystem.makeDirectory("deep/nested/folder", {
          recursive: true,
        });
        pickersFactory.setDirectoryPickerProvider(() => "deep/nested/folder");
        const handle = await showPicker();
        expect(handle.name).toBe("folder");
      });

      it("should pass options to DirectoryPickerProvider function", async () => {
        const id = "someId";
        const mode = "readwrite";
        const startIn = "desktop";
        const spy = vi.fn(() => "");
        pickersFactory.setDirectoryPickerProvider(spy);
        await showPicker({ id, mode, startIn });
        expect(spy).toHaveBeenCalledWith(
          fileSystem,
          expect.objectContaining({ id, mode, startIn })
        );
      });

      it("should reject with AbortError DOMException if DirectoryPickerProvider returned undefined", async () => {
        pickersFactory.setDirectoryPickerProvider(() => undefined);
        try {
          await showPicker();
          expect.fail("Should throw DOMException");
        } catch (e) {
          expect(e).toBeInstanceOf(DOMException);
          expect((e as DOMException).name).toBe("AbortError");
        }
      });

      it("should reject with NotFoundError DOMException if DirectoryPickerProvider returned path that doesn't exist", async () => {
        pickersFactory.setDirectoryPickerProvider(() => "some/path");
        try {
          await showPicker();
          expect.fail("Should throw DOMException");
        } catch (e) {
          expect(e).toBeInstanceOf(DOMException);
          expect((e as DOMException).name).toBe("NotFoundError");
        }
      });

      it("should reject with TypeMismatchError DOMException if DirectoryPickerProvider returned path that is file path", async () => {
        fileSystem.createFile("file.txt");
        pickersFactory.setDirectoryPickerProvider(() => "file.txt");
        try {
          await showPicker();
          expect.fail("Should throw DOMException");
        } catch (e) {
          expect(e).toBeInstanceOf(DOMException);
          expect((e as DOMException).name).toBe("TypeMismatchError");
        }
      });

      it("should reject with NotAllowedError DOMException if permission provider returned 'denied' state for 'read' mode", async () => {
        permissionsManager.setPromptPermissionProvider(() => "denied");
        try {
          await showPicker();
          expect.fail("Should throw DOMException");
        } catch (e) {
          expect(e).toBeInstanceOf(DOMException);
          expect((e as DOMException).name).toBe("NotAllowedError");
        }
      });

      it("should reject with NotAllowedError DOMException if 'mode' option is set to 'readwrite' and permission provider returned 'denied' state for 'readwrite' mode", async () => {
        permissionsManager.setPromptPermissionProvider(() => "denied");
        try {
          await showPicker({ mode: "readwrite" });
          expect.fail("Should throw DOMException");
        } catch (e) {
          expect(e).toBeInstanceOf(DOMException);
          expect((e as DOMException).name).toBe("NotAllowedError");
        }
      });
    });
  });

  describe("createShowOpenFilePicker() method", () => {
    it("should create showOpenFilePicker() mock function", () => {
      expect(pickersFactory.createShowOpenFilePicker()).toBeTypeOf("function");
    });

    describe("showOpenFilePicker() mock function", () => {
      let showPicker: typeof showOpenFilePicker;
      beforeEach(() => {
        showPicker = pickersFactory.createShowOpenFilePicker();
        fileSystem.createFile("file1");
        fileSystem.createFile("file2");
        fileSystem.createFile("file3");
      });

      it("should return array with single FileHandle with granted 'read' permission", async () => {
        pickersFactory.setOpenFilePickerProvider(() => ["file2"]);
        const files = await showPicker();
        expect(Array.isArray(files)).toBe(true);
        const [file] = files;
        expect(file).toBeInstanceOf(FileHandle);
        expect(file.name).toBe("file2");
        expect(await file.queryPermission({ mode: "read" })).toBe("granted");
        expect(await file.queryPermission({ mode: "readwrite" })).toBe(
          "prompt"
        );
      });

      it("should return array with single FileHandle (first of array) even if OpenFilePickerProvider returned multiple paths when 'multiple' option was not set to true", async () => {
        pickersFactory.setOpenFilePickerProvider(() => [
          "file3",
          "file2",
          "file1",
        ]);
        const files = await showPicker();
        expect(files.length).toBe(1);
        expect(files[0].name).toBe("file3");
      });

      it("should return array of multiple FileHandle's when 'multiple' option is set to true and OpenFilePickerProvider returned array of multiple paths", async () => {
        pickersFactory.setOpenFilePickerProvider(() => [
          "file1",
          "file2",
          "file3",
        ]);
        const files = await showPicker({ multiple: true });
        expect(files.length).toBe(3);
      });

      it("should pass all options to OpenFilePickerProvider", async () => {
        const spy = vi.fn(() => ["file1"]);
        pickersFactory.setOpenFilePickerProvider(spy);
        await showPicker({
          excludeAcceptAllOption: false,
          id: "someId",
          multiple: true,
          startIn: "desktop",
          types: [],
        });

        expect(spy).toHaveBeenCalledWith(
          fileSystem,
          expect.objectContaining({
            excludeAcceptAllOption: false,
            id: "someId",
            multiple: true,
            startIn: "desktop",
            types: expect.any(Array),
          })
        );
      });

      it("should reject with AbortError DOMException if OpenFilePickerProvider was not set", async () => {
        try {
          await showPicker();
          expect.fail("Should throw DOMException");
        } catch (e) {
          expect(e).toBeInstanceOf(DOMException);
          expect((e as DOMException).name).toBe("AbortError");
        }
      });

      it("should reject with AbortError DOMException if OpenFilePickerProvider returned undefined", async () => {
        pickersFactory.setOpenFilePickerProvider(() => undefined);
        try {
          await showPicker();
          expect.fail("Should throw DOMException");
        } catch (e) {
          expect(e).toBeInstanceOf(DOMException);
          expect((e as DOMException).name).toBe("AbortError");
        }
      });

      it("should reject with AbortError DOMException if OpenFilePickerProvider returned empty array", async () => {
        pickersFactory.setOpenFilePickerProvider(() => []);
        try {
          await showPicker();
          expect.fail("Should throw DOMException");
        } catch (e) {
          expect(e).toBeInstanceOf(DOMException);
          expect((e as DOMException).name).toBe("AbortError");
        }
      });

      it("should reject with NotAllowedError DOMException if permission provider returned 'denied' state for 'read' mode for files parent directory", async () => {
        permissionsManager.setPromptPermissionProvider(() => "denied");
        pickersFactory.setOpenFilePickerProvider(() => ["file1"]);
        try {
          await showPicker();
          expect.fail("Should throw DOMException");
        } catch (e) {
          expect(e).toBeInstanceOf(DOMException);
          expect((e as DOMException).name).toBe("NotAllowedError");
        }
      });

      it("should reject with NotFoundError DOMException if any of returned by OpenFilePickerProvider paths doesn't exist", async () => {
        pickersFactory.setOpenFilePickerProvider(() => [
          "file1",
          "file2",
          "another-file",
        ]);
        try {
          await showPicker({ multiple: true });
          expect.fail("Should throw DOMException");
        } catch (e) {
          expect(e).toBeInstanceOf(DOMException);
          expect((e as DOMException).name).toBe("NotFoundError");
        }
      });

      it("should reject with TypeMismatchError DOMException if any of returned by OpenFilePickerProvider paths is directory path", async () => {
        fileSystem.makeDirectory("dir");
        pickersFactory.setOpenFilePickerProvider(() => [
          "file1",
          "file2",
          "dir",
        ]);
        try {
          await showPicker({ multiple: true });
          expect.fail("Should throw DOMException");
        } catch (e) {
          expect(e).toBeInstanceOf(DOMException);
          expect((e as DOMException).name).toBe("TypeMismatchError");
        }
      });

      it("should reject with TypeError when not all provided paths have same parent path", () => {
        fileSystem.createFile("deeper/file3");
        pickersFactory.setOpenFilePickerProvider(() => [
          "file1",
          "file2",
          "deeper/file3",
        ]);
        expect(() => showPicker({ multiple: true })).rejects.toThrow(TypeError);
      });
    });
  });

  describe("createShowSaveFilePicker() method", () => {
    it("should create showSaveFilePicker() mock function", () => {
      expect(pickersFactory.createShowSaveFilePicker()).toBeTypeOf("function");
    });

    describe("showSaveFilePicker() mock function", () => {
      let showPicker: typeof showSaveFilePicker;
      beforeEach(() => {
        showPicker = pickersFactory.createShowSaveFilePicker();
        fileSystem.createFile("file");
      });

      it("should return FileHandle of path returned by SaveFilePickerProvider with granted 'readwrite' permission", async () => {
        pickersFactory.setSaveFilePickerProvider(() => "file");
        const handle = await showPicker();
        expect(handle).toBeInstanceOf(FileHandle);
        expect(handle.name).toBe("file");
        expect(await handle.queryPermission({ mode: "readwrite" })).toBe(
          "granted"
        );
      });

      it("should create file if file with name, returned by SaveFilePickerProvider doesn't exist", async () => {
        expect(fileSystem.exists("new-file.txt")).toBe(false);
        pickersFactory.setSaveFilePickerProvider(() => "new-file.txt");
        const handle = await showPicker();
        expect(handle.name).toBe("new-file.txt");
        expect(fileSystem.exists("new-file.txt")).toBe(true);
      });

      it("should pass all options to SaveFilePickerProvider", async () => {
        const spy = vi.fn(() => "file");
        pickersFactory.setSaveFilePickerProvider(spy);
        await showPicker({
          excludeAcceptAllOption: false,
          id: "test-id",
          suggestedName: "default.txt",
          startIn: "documents",
          types: [],
        });
        expect(spy).toHaveBeenCalledWith(
          fileSystem,
          expect.objectContaining({
            excludeAcceptAllOption: false,
            id: "test-id",
            suggestedName: "default.txt",
            startIn: "documents",
            types: expect.any(Array),
          })
        );
      });

      it("should reject with AbortError DOMException if SaveFilePickerProvider was not set", async () => {
        try {
          await showPicker();
          expect.fail("Should throw DOMException");
        } catch (e) {
          expect(e).toBeInstanceOf(DOMException);
          expect((e as DOMException).name).toBe("AbortError");
        }
      });

      it("should reject with AbortError DOMException if SaveFilePickerProvider returned undefined", async () => {
        pickersFactory.setSaveFilePickerProvider(() => undefined);
        try {
          await showPicker();
          expect.fail("Should throw DOMException");
        } catch (e) {
          expect(e).toBeInstanceOf(DOMException);
          expect((e as DOMException).name).toBe("AbortError");
        }
      });

      it("should reject with NotAllowedError DOMException if permission provider returned 'denied' state for 'readwrite' mode", async () => {
        permissionsManager.setPromptPermissionProvider(() => "denied");
        pickersFactory.setSaveFilePickerProvider(() => "file");
        try {
          await showPicker();
          expect.fail("Should throw DOMException");
        } catch (e) {
          expect(e).toBeInstanceOf(DOMException);
          expect((e as DOMException).name).toBe("NotAllowedError");
        }
      });

      it("should reject with TypeMismatchError DOMException if path returned by SaveFilePickerProvider is directory path", async () => {
        fileSystem.makeDirectory("dir");
        pickersFactory.setSaveFilePickerProvider(() => "dir");
        try {
          await showPicker();
          expect.fail("Should throw DOMException");
        } catch (e) {
          expect(e).toBeInstanceOf(DOMException);
          expect((e as DOMException).name).toBe("TypeMismatchError");
        }
      });
    });
  });
});
