import { describe, it, expect, vi } from "vitest";
import {
  bootstrap,
  DefaultEntryNameValidator,
  DefaultPermissionsProvider,
  DirectoryHandleFactory,
  FileHandleFactory,
  FileSystem,
  PermissionsManager,
  PickersFactory,
  SyncAccessHandleFactory,
  WritableFileStreamFactory,
  WritableFileStreamSinkFactory,
} from "../../src";

describe("bootstrap() function", () => {
  it("should return ServiceLocator interface", () => {
    const services = bootstrap();
    expect(services.fileHandleFactory).toBeInstanceOf(FileHandleFactory);
    expect(services.fileSystem).toBeInstanceOf(FileSystem);
    expect(services.permissionsProvider).toBeInstanceOf(
      DefaultPermissionsProvider
    );
    expect(services.permissionsManager).toBeInstanceOf(PermissionsManager);
    expect(services.directoryHandleFactory).toBeInstanceOf(
      DirectoryHandleFactory
    );
    expect(services.pickersFactory).toBeInstanceOf(PickersFactory);
    expect(services.syncAccessHandleFactory).toBeInstanceOf(
      SyncAccessHandleFactory
    );
    expect(services.writableFileStreamSinkFactory).toBeInstanceOf(
      WritableFileStreamSinkFactory
    );
    expect(services.writableFileStreamFactory).toBeInstanceOf(
      WritableFileStreamFactory
    );
    expect(services.entryNameValidator).toBeInstanceOf(
      DefaultEntryNameValidator
    );
  });

  it("should return PermissionsProvider that was set to 'permissionsProvider' option", () => {
    const permissionsProvider = new DefaultPermissionsProvider();
    expect(bootstrap({ permissionsProvider }).permissionsProvider).toBe(
      permissionsProvider
    );
  });

  it("should return permissions that was set using 'readPermission', 'readwritePermission' and 'resolveToPermission' options", () => {
    const { permissionsProvider: defaultProvider, fileSystem: fs1 } =
      bootstrap();
    expect(defaultProvider.initial(fs1, "")).toEqual({
      read: "prompt",
      readwrite: "prompt",
    });
    expect(defaultProvider.prompt("read", fs1, "")).toBe("granted");

    const { permissionsProvider: presetProvider, fileSystem: fs2 } = bootstrap({
      readPermission: "granted",
      readwritePermission: "prompt",
      resolveToPermission: "denied",
    });

    expect(presetProvider.initial(fs2, "")).toEqual({
      read: "granted",
      readwrite: "prompt",
    });
    expect(presetProvider.prompt("readwrite", fs2, "")).toBe("denied");
  });

  it("should return FileSystem with disk size set by 'diskSize' option", () => {
    const { fileSystem: fs1 } = bootstrap();
    expect(fs1.getTotalDiskSpace()).toBe(Infinity);

    const { fileSystem: fs2 } = bootstrap({ diskSize: 100 });
    expect(fs2.getTotalDiskSpace()).toBe(100);
  });

  it("should use PromptPermissionProvider set by 'promptPermissionProvider' option", async () => {
    const promptPermissionProvider = vi.fn(() => "granted" as const);
    const { permissionsManager } = bootstrap({
      promptPermissionProvider,
    });
    await permissionsManager.requestPermission("", "readwrite");
    expect(promptPermissionProvider).toHaveBeenCalled();
  });

  it("should return EntryNameValidator that was passed to 'entryNameValidator' option", () => {
    const entryNameValidator = new DefaultEntryNameValidator();
    expect(bootstrap({ entryNameValidator }).entryNameValidator).toBe(
      entryNameValidator
    );
  });

  it("should use invalid chars regular expression set by 'invalidCharsRegex' option inside DefaultEntryNameValidator", () => {
    const invalidCharsRegex = /a/i;
    const { entryNameValidator } = bootstrap({ invalidCharsRegex });
    expect(entryNameValidator.isValidName("b", false)).toBe(true);
    expect(entryNameValidator.isValidName("a", false)).toBe(false);
  });

  it("should set DirectoryPickerProvider if it was passed to 'directoryPickerProvider' option", async () => {
    const directoryPickerProvider = vi.fn(() => "");
    const { pickersFactory } = bootstrap({ directoryPickerProvider });
    const showPicker = pickersFactory.createShowDirectoryPicker();
    await showPicker();
    expect(directoryPickerProvider).toHaveBeenCalled();
  });

  it("should set OpenFilePickerProvider if it was passed to 'openFileProvider' option", async () => {
    const openFilePickerProvider = vi.fn();
    const { pickersFactory } = bootstrap({ openFilePickerProvider });
    const showPicker = pickersFactory.createShowOpenFilePicker();
    try {
      await showPicker();
    } catch (e) {
      // AbortError expected, do nothing
    }
    expect(openFilePickerProvider).toHaveBeenCalled();
  });

  it("should set SaveFilePickerProvider if it was passed to 'saveFilePickerProvider' option", async () => {
    const saveFilePickerProvider = vi.fn();
    const { pickersFactory } = bootstrap({ saveFilePickerProvider });
    const showPicker = pickersFactory.createShowSaveFilePicker();
    try {
      await showPicker();
    } catch (e) {
      // AbortError expected, do nothing
    }
    expect(saveFilePickerProvider).toHaveBeenCalled();
  });
});
