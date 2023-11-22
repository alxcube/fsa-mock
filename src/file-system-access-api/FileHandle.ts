import { Handle } from "./Handle";
import type { SyncAccessHandle } from "./SyncAccessHandle";
import type { FileDescriptor, FileSystem } from "../file-system";
import { throwNotFoundError } from "../errorHelpers";
import type { SyncAccessHandleFactory } from "./SyncAccessHandleFactory";
import type { WritableFileStreamFactory } from "./WritableFileStreamFactory";
import type { PermissionsManager } from "../permissions";

/**
 * FileSystemFileHandle mock class.
 */
export class FileHandle extends Handle implements FileSystemFileHandle {
  /**
   * File descriptor.
   * @protected
   */
  protected declare descriptor: FileDescriptor;

  /**
   * {@inheritDoc}
   */
  declare readonly kind: "file";

  /**
   * {@inheritDoc}
   */
  declare readonly isFile: true;

  /**
   * {@inheritDoc}
   */
  declare readonly isDirectory: false;

  /**
   * FileHandle constructor.
   *
   * @param syncAccessHandleFactory
   * @param writableFileStreamFactory
   * @param descriptor
   * @param fileSystem
   * @param permissionsManager
   */
  constructor(
    private syncAccessHandleFactory: SyncAccessHandleFactory,
    private writableFileStreamFactory: WritableFileStreamFactory,
    descriptor: FileDescriptor,
    fileSystem: FileSystem,
    permissionsManager: PermissionsManager
  ) {
    super(descriptor, fileSystem, permissionsManager);
  }

  /**
   * {@inheritDoc}
   */
  async getFile(): Promise<File> {
    this.ensureFileExists();
    await this.ensureHasPermission();
    const buffer = this.fileSystem.readFile(this.descriptor);
    return new File([buffer], this.name, {
      lastModified: this.descriptor.lastModified,
    });
  }

  /**
   * {@inheritDoc}
   */
  async createSyncAccessHandle(): Promise<SyncAccessHandle> {
    this.ensureFileExists();
    await this.ensureHasPermission(true);
    return this.syncAccessHandleFactory.create(this.descriptor, true);
  }

  /**
   * {@inheritDoc}
   */
  async createWritable(
    options?: FileSystemCreateWritableOptions
  ): Promise<FileSystemWritableFileStream> {
    this.ensureFileExists();
    await this.ensureHasPermission(true);
    return this.writableFileStreamFactory.create(
      this.descriptor,
      options?.keepExistingData
    );
  }

  /**
   * Checks if file of current handle exists and throws 'NotFoundError' DOMException if it doesn't.
   * @private
   */
  private ensureFileExists() {
    if (!this.fileSystem.isFile(this.descriptor.fullPath)) {
      throwNotFoundError();
    }
  }
}
