import {
  bootstrap,
  type BootstrapOptions,
  type GlobalContext,
} from "./bootstrap";
import {
  DirectoryHandle,
  DirectoryPickerProvider,
  FileHandle,
  Handle,
  OpenFilePickerProvider,
  SaveFilePickerProvider,
  SyncAccessHandle,
  WritableFileStream,
} from "./file-system-access-api";
import { restoreOriginalImplementations } from "./restoreOriginalImplementations.ts";
import type { FileSystem } from "./file-system";
import type {
  PermissionsManager,
  PromptPermissionProvider,
} from "./permissions";

/**
 * Library API class.
 */
export class API {
  /**
   * Mock context.
   * @private
   */
  private context?: GlobalContext;

  /**
   * Creates new context and replaces original File System Access API implementations to mocked ones.
   *
   * @param options
   */
  install(options: BootstrapOptions = {}) {
    this.context = bootstrap(options);
    self.FileSystemHandle = Handle as unknown as typeof FileSystemHandle;
    self.FileSystemFileHandle =
      FileHandle as unknown as typeof FileSystemFileHandle;
    self.FileSystemDirectoryHandle =
      DirectoryHandle as unknown as typeof FileSystemDirectoryHandle;
    self.FileSystemWritableFileStream = WritableFileStream;
    self.showDirectoryPicker =
      this.context.pickersFactory.createShowDirectoryPicker();
    self.showOpenFilePicker =
      this.context.pickersFactory.createShowOpenFilePicker();
    self.showSaveFilePicker =
      this.context.pickersFactory.createShowSaveFilePicker();
    if ("FileSystemSyncAccessHandle" in self) {
      self.FileSystemSyncAccessHandle = SyncAccessHandle;
    }
  }

  /**
   * Restores original File System Access API implementations.
   */
  uninstall() {
    restoreOriginalImplementations(self);
    this.context = undefined;
  }

  /**
   * Returns FileSystem object.
   */
  fs(): FileSystem {
    if (!this.context) {
      this.throwNotInstalled();
    }
    return this.context.fileSystem;
  }

  /**
   * Returns PermissionsManager object.
   */
  pm(): PermissionsManager {
    if (!this.context) {
      this.throwNotInstalled();
    }
    return this.context.permissionsManager;
  }

  /**
   * Helper method for checking path existence in file system.
   *
   * @param path
   */
  exists(path: string): boolean {
    return this.fs().exists(path);
  }

  /**
   * Helper method for checking file existence in file system.
   *
   * @param path
   */
  isFile(path: string): boolean {
    return this.fs().isFile(path);
  }

  /**
   * Helper method for checking directory existence in file system.
   *
   * @param path
   */
  isDir(path: string): boolean {
    return this.fs().isDirectory(path);
  }

  /**
   * Helper method for directory creation in file system. Creates directories recursively.
   *
   * @param path
   */
  makeDir(path: string): void {
    this.fs().makeDirectory(path, { recursive: true });
  }

  /**
   * Helper method for file creation in file system. Creates empty file of 0 bytes size, unless 'contents' argument is set.
   *
   * @param path
   * @param contents
   */
  createFile(path: string, contents?: BufferSource): void {
    const descriptor = this.fs().createFile(path);
    if (contents) {
      const buffer = "buffer" in contents ? contents.buffer : contents;
      this.fs().writeFile(descriptor, buffer);
    }
  }

  /**
   * Returns file contents ArrayBuffer if it exists at given path.
   *
   * @param path
   */
  contents(path: string): ArrayBuffer | undefined {
    const fs = this.fs();
    const descriptor = fs.getDescriptor(path);
    if (!descriptor || descriptor.type !== "file") {
      return;
    }
    return fs.readFile(descriptor);
  }

  /**
   * Sets PromptPermissionProvider callback.
   *
   * @param provider
   */
  onPromptPermission(provider?: PromptPermissionProvider): void {
    this.pm().setPromptPermissionProvider(provider);
  }

  /**
   * Sets DirectoryPickerProvider callback.
   *
   * @param provider
   */
  onDirectoryPicker(provider?: DirectoryPickerProvider): void {
    if (!this.context) {
      this.throwNotInstalled();
    }
    this.context.pickersFactory.setDirectoryPickerProvider(provider);
  }

  /**
   * Sets OpenFilePickerProvider callback.
   *
   * @param provider
   */
  onOpenFilePicker(provider?: OpenFilePickerProvider): void {
    if (!this.context) {
      this.throwNotInstalled();
    }
    this.context.pickersFactory.setOpenFilePickerProvider(provider);
  }

  /**
   * Sets SaveFilePickerProvider callback.
   *
   * @param provider
   */
  onSaveFilePicker(provider?: SaveFilePickerProvider): void {
    if (!this.context) {
      this.throwNotInstalled();
    }
    this.context.pickersFactory.setSaveFilePickerProvider(provider);
  }

  /**
   * Sets file system disk size.
   *
   * @param size
   */
  setDiskSize(size: number): void {
    this.fs().setTotalDiskSpace(size);
  }

  /**
   * Sets permission for given path.
   *
   * @param path
   * @param mode
   * @param state
   */
  setPermission(
    path: string,
    mode: FileSystemPermissionMode,
    state: PermissionState
  ): void {
    this.pm().setState(path, mode, state);
  }

  /**
   * Throws 'InvalidStateError' DOMException.
   * @private
   */
  private throwNotInstalled(): never {
    throw new DOMException("Mock is not installed", "InvalidStateError");
  }
}
