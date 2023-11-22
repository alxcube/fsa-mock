import type { FileSystem } from "../file-system";
import type { PermissionsManager } from "../permissions";
import {
  throwAbortError,
  throwNotAllowedError,
  throwNotFoundError,
  throwTypeMismatchError,
} from "../errorHelpers.ts";
import type { FileHandle } from "./FileHandle.ts";
import type { DirectoryHandleFactory } from "./DirectoryHandleFactory.ts";
import type { FileHandleFactory } from "./FileHandleFactory.ts";
import { dirname } from "../utils.ts";

/**
 * Directory picker value provider.
 */
export interface DirectoryPickerProvider {
  /**
   * Callback which should return full directory path to emulate user selection of given directory.
   * To emulate user dialog abortion, return undefined from callback.
   * Returned path must exist in file system and be directory (not file) path.
   * Path shouldn't start with slash or backslash.
   * All options that were passed to showDirectoryFilePicker() function will be passed to callback via second argument.
   *
   * @param fs
   * @param options
   */
  (
    fs: FileSystem,
    options: DirectoryPickerOptions
  ): string | undefined | Promise<string | undefined>;
}

/**
 * Open File picker value provider.
 */
export interface OpenFilePickerProvider {
  /**
   * Callback which should return array of full file paths to emulate user selection of given files.
   * To emulate user dialog abortion, return undefined or empty array from callback.
   * All selected paths must be existing file (not directory) paths, and have same parent path.
   * Only first of provided paths will be used, unless 'multiple' option is set to true in showOpenFilePicker() call.
   * All options passed to showOpenFilePicker() function will be passed to callback via second argument.
   *
   * @param fs
   * @param options
   */
  (
    fs: FileSystem,
    options: OpenFilePickerOptions
  ): string[] | undefined | Promise<string[] | undefined>;
}

/**
 * Save File picker value provider.
 */
export interface SaveFilePickerProvider {
  /**
   * Callback which should return full file path to emulate user selection of given file.
   * To emulate user dialog abortion, return undefined from callback.
   * If returned file path doesn't  exist, it will be created.
   * Returned path shouldn't start with slash or backslash, and must be a file (not directory) path.
   * All options passed to showSaveFilePicker() function will be passed to callback via second argument.
   *
   * @param fs
   * @param options
   */
  (
    fs: FileSystem,
    options: SaveFilePickerOptions
  ): string | undefined | Promise<string | undefined>;
}

/**
 * Factory class for 'showDirectoryPicker()', 'showOpenFilePicker()', 'showSaveFilePicker()' functions mocks.
 */
export class PickersFactory {
  /**
   * Directory picker callback.
   * @private
   */
  private directoryPickerProvider?: DirectoryPickerProvider;

  /**
   * Open File picker callback.
   * @private
   */
  private openFilePickerProvider?: OpenFilePickerProvider;

  /**
   * Save File picker callback.
   * @private
   */
  private saveFilePickerProvider?: SaveFilePickerProvider;

  /**
   * PickersFactory constructor.
   *
   * @param fileSystem
   * @param permissionsManager
   * @param directoryHandleFactory
   * @param fileHandleFactory
   */
  constructor(
    private readonly fileSystem: FileSystem,
    private readonly permissionsManager: PermissionsManager,
    private readonly directoryHandleFactory: DirectoryHandleFactory,
    private readonly fileHandleFactory: FileHandleFactory
  ) {}

  /**
   * Sets callback for showDirectoryPicker() mock.
   * @param provider
   */
  setDirectoryPickerProvider(provider?: DirectoryPickerProvider) {
    this.directoryPickerProvider = provider;
  }

  /**
   * Sets callback for showOpenFilePicker() mock.
   * @param provider
   */
  setOpenFilePickerProvider(provider?: OpenFilePickerProvider) {
    this.openFilePickerProvider = provider;
  }

  /**
   * Sets callback for showSaveFilePicker() mock.
   * @param provider
   */
  setSaveFilePickerProvider(provider?: SaveFilePickerProvider) {
    this.saveFilePickerProvider = provider;
  }

  /**
   * Creates showDirectoryPicker() function mock.
   */
  createShowDirectoryPicker(): typeof showDirectoryPicker {
    return async (options: DirectoryPickerOptions = {}) => {
      const { mode = "read" } = options;
      const path = await this.getDirectoryPath(options);
      await this.requestPermission(path, mode);
      const descriptor = this.fileSystem.getDirectoryDescriptor(path);
      if (!descriptor) {
        throwNotFoundError();
      }
      return this.directoryHandleFactory.create(descriptor);
    };
  }

  /**
   * Creates showOpenFilePicker() function mock.
   */
  createShowOpenFilePicker(): typeof showOpenFilePicker {
    return async (options: OpenFilePickerOptions = {}) => {
      const paths = await this.getOpenFilePickerPaths(options);
      const files: FileHandle[] = [];
      for (const path of paths) {
        const descriptor = this.fileSystem.getFileDescriptor(path);
        if (!descriptor) {
          throwNotFoundError();
        }
        const fileHandle = this.fileHandleFactory.create(descriptor);
        this.permissionsManager.setState(path, "read", "granted");
        files.push(fileHandle);
      }
      return files as [FileHandle];
    };
  }

  /**
   * Creates showSaveFilePicker() function mock.
   */
  createShowSaveFilePicker(): typeof showSaveFilePicker {
    return async (options: SaveFilePickerOptions = {}) => {
      const path = await this.getSaveFilePickerPath(options);
      const descriptor = this.fileSystem.getFileDescriptor(path, {
        create: true,
      })!;
      await this.requestPermission(path, "readwrite");
      return this.fileHandleFactory.create(descriptor);
    };
  }

  /**
   * Triggers DirectoryPickerProvider callback and performs steps of validation of returned path.
   *
   * @param options
   * @private
   */
  private async getDirectoryPath(options: DirectoryPickerOptions) {
    const directoryPickerProvider = this.directoryPickerProvider || (() => "");
    const path = await directoryPickerProvider(this.fileSystem, options);
    if (path === undefined) {
      throwAbortError();
    }
    if (!this.fileSystem.exists(path)) {
      throwNotFoundError();
    }
    if (!this.fileSystem.isDirectory(path)) {
      throwTypeMismatchError();
    }
    return path;
  }

  /**
   * Requests permission for given path and mode.
   *
   * @param path
   * @param mode
   * @private
   */
  private async requestPermission(
    path: string,
    mode: FileSystemPermissionMode
  ) {
    const state = await this.permissionsManager.requestPermission(path, mode);
    if (state !== "granted") {
      throwNotAllowedError();
    }
  }

  /**
   * Triggers OpenFilePickerProvider callback and performs steps of validation and preparation of returned paths.
   *
   * @param options
   * @private
   */
  private async getOpenFilePickerPaths(
    options: OpenFilePickerOptions
  ): Promise<string[]> {
    const { multiple = false } = options;
    const openFilePickerProvider =
      this.openFilePickerProvider || (() => undefined);
    const paths = await openFilePickerProvider(this.fileSystem, options);

    if (!paths || !paths.length) {
      throwAbortError();
    }
    if (!multiple) {
      paths.splice(1);
    }
    this.ensureHaveSameParent(paths);

    const dirName = dirname(paths[0])!;

    await this.requestPermission(dirName, "read");

    for (const path of paths) {
      if (!this.fileSystem.exists(path)) {
        throwNotFoundError();
      }
      if (!this.fileSystem.isFile(path)) {
        throwTypeMismatchError();
      }
    }
    return paths;
  }

  /**
   * Checks if all paths, returned by OpenFilePickerProvider callback have same parent and throws if any of paths have
   * different parent.
   *
   * @param paths
   * @private
   */
  private ensureHaveSameParent(paths: string[]) {
    const [firstPath, ...restPaths] = paths;
    const dirName = dirname(firstPath);
    if (dirName === null) {
      // dirname("") === null
      throw new TypeError("Root path can't be a file path.");
    }
    if (!restPaths.length) {
      return;
    }
    if (!restPaths.every((path) => dirname(path) === dirName)) {
      throw new TypeError("All file paths must have single parent path.");
    }
  }

  /**
   * Triggers SaveFilePickerProvider callback and performs steps of validation of returned path.
   *
   * @param options
   * @private
   */
  private async getSaveFilePickerPath(options: SaveFilePickerOptions) {
    const saveFilePickerProvider =
      this.saveFilePickerProvider || (() => undefined);
    const path = await saveFilePickerProvider(this.fileSystem, options);
    if (!path) {
      throwAbortError();
    }
    if (this.fileSystem.exists(path) && !this.fileSystem.isFile(path)) {
      throwTypeMismatchError();
    }
    return path;
  }
}
