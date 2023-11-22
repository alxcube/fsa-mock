import { Handle } from "./Handle";
import { basename, isSubPath, pathSegments, relativePath } from "../utils";
import type { FileHandle } from "./FileHandle";
import type {
  DirectoryDescriptor,
  FileDescriptor,
  FileSystem,
  EntryNameValidator,
} from "../file-system";
import {
  throwNotAllowedError,
  throwNotFoundError,
  throwTypeMismatchError,
} from "../errorHelpers";
import type { DirectoryHandleFactory } from "./DirectoryHandleFactory.ts";
import type { FileHandleFactory } from "./FileHandleFactory.ts";
import type { PermissionsManager } from "../permissions";

/**
 * FileSystemDirectoryHandle mock class.
 */
export class DirectoryHandle
  extends Handle
  implements FileSystemDirectoryHandle
{
  /**
   * Directory descriptor.
   * @protected
   */
  protected declare descriptor: DirectoryDescriptor;

  /**
   * {@inheritDoc}
   */
  declare readonly kind: "directory";

  /**
   * {@inheritDoc}
   */
  declare readonly isDirectory: true;

  /**
   * {@inheritDoc}
   */
  declare readonly isFile: false;

  /**
   * DirectoryHandle constructor.
   *
   * @param directoryHandleFactory
   * @param fileHandleFactory
   * @param entryNameValidator
   * @param descriptor
   * @param fileSystem
   * @param permissionsManager
   */
  constructor(
    private directoryHandleFactory: DirectoryHandleFactory,
    private fileHandleFactory: FileHandleFactory,
    private entryNameValidator: EntryNameValidator,
    descriptor: DirectoryDescriptor,
    fileSystem: FileSystem,
    permissionsManager: PermissionsManager
  ) {
    super(descriptor, fileSystem, permissionsManager);
  }

  /**
   * {@inheritDoc}
   */
  [Symbol.asyncIterator](): AsyncIterableIterator<
    [string, FileSystemDirectoryHandle | FileSystemFileHandle]
  > {
    return this.entries();
  }

  /**
   * {@inheritDoc}
   */
  keys(): AsyncIterableIterator<string> {
    return this.createChildsAsyncIterable((name) => Promise.resolve(name));
  }

  /**
   * {@inheritDoc}
   */
  values(): AsyncIterableIterator<
    FileSystemDirectoryHandle | FileSystemFileHandle
  > {
    return this.createChildsAsyncIterable((name: string) =>
      this.createChildEntry(name)
    );
  }

  /**
   * {@inheritDoc}
   */
  entries(): AsyncIterableIterator<
    [string, FileSystemDirectoryHandle | FileSystemFileHandle]
  > {
    const valueGetter = async (name: string) => {
      const child = await this.createChildEntry(name);
      return child
        ? ([name, child] as [string, FileHandle | DirectoryHandle])
        : undefined;
    };
    return this.createChildsAsyncIterable(valueGetter);
  }

  /**
   * {@inheritDoc}
   */
  async getDirectoryHandle(
    name: string,
    options: FileSystemGetDirectoryOptions = {}
  ): Promise<DirectoryHandle> {
    const { create = false } = options;
    const path = await this.prepareHandlePath(name, create, false);
    const descriptor = this.fileSystem.getDirectoryDescriptor(path, { create });

    if (!descriptor) {
      throwNotFoundError();
    }

    return this.createDirectoryHandle(descriptor);
  }

  /**
   * {@inheritDoc}
   */
  async getFileHandle(
    name: string,
    options: FileSystemGetFileOptions = {}
  ): Promise<FileHandle> {
    const { create = false } = options;
    const path = await this.prepareHandlePath(name, create, true);
    const descriptor = this.fileSystem.getFileDescriptor(path, { create });

    if (!descriptor) {
      throwNotFoundError();
    }

    return this.createFileHandle(descriptor);
  }

  /**
   * {@inheritDoc}
   */
  async removeEntry(
    name: string,
    options: FileSystemRemoveOptions = {}
  ): Promise<void> {
    this.validateEntryName(name, true, true);
    this.ensureCurrentEntryExists();
    await this.ensurePermissionGranted("readwrite", true);
    const path = this.getChildPath(name);
    if (!this.fileSystem.exists(path)) {
      throwNotFoundError();
    }
    const { recursive = false } = options;
    this.fileSystem.remove(path, { recursive });
  }

  /**
   * {@inheritDoc}
   */
  async resolve(possibleDescendant: Handle): Promise<string[] | null> {
    const descriptor = possibleDescendant.getDescriptor();
    if (
      !this.fileSystem.isValidDescriptor(descriptor) ||
      descriptor.fullPath.length < this.descriptor.fullPath.length
    ) {
      return null;
    }
    if (this.descriptor.fullPath == descriptor.fullPath) {
      return [];
    }
    if (isSubPath(descriptor.fullPath, this.descriptor.fullPath)) {
      return pathSegments(
        relativePath(descriptor.fullPath, this.descriptor.fullPath)
      );
    }
    return null;
  }

  /**
   * Performs commons steps to get and validate child entry path.
   *
   * @param name Child entry name.
   * @param create Create entry if it doesn't exist.
   * @param isFileHandle Treat path as file path.
   * @private
   */
  private async prepareHandlePath(
    name: string,
    create = false,
    isFileHandle = false
  ): Promise<string> {
    this.validateEntryName(name, isFileHandle);
    this.ensureCurrentEntryExists();
    const mode = create ? "readwrite" : "read";
    await this.ensurePermissionGranted(mode, create);

    const path = this.getChildPath(name);

    if (!create && !this.fileSystem.exists(path)) {
      throwNotFoundError();
    }

    if (
      (!isFileHandle && this.fileSystem.isFile(path)) ||
      (isFileHandle && this.fileSystem.isDirectory(path))
    ) {
      throwTypeMismatchError();
    }

    return path;
  }

  /**
   * Checks if current handle has granted permission of given mode and throws 'NotAllowedError' DOMException if it hasn't.
   *
   * @param mode
   * @param request Permission should be prompted if current permission state is 'prompt".
   * @private
   */
  private async ensurePermissionGranted(
    mode: FileSystemPermissionMode,
    request = false
  ) {
    let state;
    if (request) {
      state = await this.requestPermission({ mode });
    } else {
      state = await this.queryPermission({ mode });
    }
    if (state !== "granted") {
      throwNotAllowedError();
    }
  }

  /**
   * Checks if current DirectoryDescriptor still exists in file system and throws 'NotFoundError' DOMException if it doesnt'.
   * @private
   */
  private ensureCurrentEntryExists() {
    if (!this.fileSystem.isValidDescriptor(this.descriptor)) {
      throwNotFoundError();
    }
  }

  /**
   * Returns array of names of current handle's children entries.
   * @private
   */
  private getChildNames(): string[] {
    return this.fileSystem
      .getChildPaths(this.descriptor.fullPath)
      .map(basename);
  }

  /**
   * Creates handle for child file system entry.
   *
   * @param name
   * @private
   */
  private async createChildEntry(
    name: string
  ): Promise<FileHandle | DirectoryHandle | undefined> {
    this.ensureCurrentEntryExists();
    await this.ensurePermissionGranted("read", false);
    const path = this.getChildPath(name);
    const descriptor = this.fileSystem.getDescriptor(path);

    if (!descriptor) {
      return;
    }

    if (descriptor.type === "file") {
      return this.createFileHandle(descriptor as FileDescriptor);
    }
    return this.createDirectoryHandle(descriptor as DirectoryDescriptor);
  }

  /**
   * Returns full path of child entry by its name.
   *
   * @param name
   * @private
   */
  private getChildPath(name: string): string {
    return [...pathSegments(this.descriptor.fullPath), name].join("/");
  }

  /**
   * Creates FileHandle for child file.
   *
   * @param descriptor
   * @private
   */
  private createFileHandle(descriptor: FileDescriptor): FileHandle {
    this.permissionsManager.duplicate(
      this.descriptor.fullPath,
      descriptor.fullPath
    );
    return this.fileHandleFactory.create(descriptor);
  }

  /**
   * Creates DirectoryHandle for child directory.
   *
   * @param descriptor
   * @private
   */
  private createDirectoryHandle(
    descriptor: DirectoryDescriptor
  ): DirectoryHandle {
    this.permissionsManager.duplicate(
      this.descriptor.fullPath,
      descriptor.fullPath
    );
    return this.directoryHandleFactory.create(descriptor);
  }

  /**
   * {@inheritDoc}
   */
  getDirectory(
    name: string,
    options: FileSystemGetDirectoryOptions = {}
  ): Promise<FileSystemDirectoryHandle> {
    return this.getDirectoryHandle(name, options);
  }

  /**
   * {@inheritDoc}
   */
  getEntries(): AsyncIterableIterator<
    FileSystemDirectoryHandle | FileSystemFileHandle
  > {
    return this.values();
  }

  /**
   * {@inheritDoc}
   */
  getFile(
    name: string,
    options: FileSystemGetFileOptions = {}
  ): Promise<FileHandle> {
    return this.getFileHandle(name, options);
  }

  /**
   * Checks if given entry name is valid and throws TypeError if not.
   *
   * @param name
   * @param isFileName
   * @param isRemove
   * @private
   */
  private validateEntryName(
    name: string,
    isFileName: boolean,
    isRemove = false
  ) {
    const methodName = isRemove
      ? "removeEntry"
      : isFileName
        ? "getFileHandle"
        : "getDirectoryHandle";
    if (!this.entryNameValidator.isValidName(name, isFileName)) {
      throw new TypeError(
        `Failed to execute '${methodName}' on 'FileSystemDirectoryHandle': Name is not allowed.`
      );
    }
  }

  /**
   * Creates async iterable iterator for child entries.
   *
   * @param valueGetter Iterator value getter function.
   * @private
   */
  private createChildsAsyncIterable<T>(
    valueGetter: (name: string) => Promise<T | undefined>
  ): AsyncIterableIterator<T> {
    const childNames = this.getChildNames();
    let index = 0;
    const doneResult = { done: true, value: undefined } as const;
    return {
      [Symbol.asyncIterator]() {
        return this;
      },
      async next() {
        if (index >= childNames.length) {
          return doneResult;
        }
        const name = childNames[index++];
        const value = await valueGetter(name);
        if (!value) {
          return doneResult;
        }
        return { done: false, value };
      },
    };
  }
}
