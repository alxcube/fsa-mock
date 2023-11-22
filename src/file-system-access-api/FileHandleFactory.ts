import { FileHandle } from "./FileHandle.ts";
import type { FileDescriptor, FileSystem } from "../file-system";
import type { SyncAccessHandleFactory } from "./SyncAccessHandleFactory.ts";
import type { WritableFileStreamFactory } from "./WritableFileStreamFactory.ts";
import type { PermissionsManager } from "../permissions";

/**
 * FileHandle factory class.
 */
export class FileHandleFactory {
  /**
   * FileHandleFactory constructor.
   *
   * @param syncAccessHandleFactory
   * @param writableFileStreamFactory
   * @param fileSystem
   * @param permissionsManager
   */
  constructor(
    private readonly syncAccessHandleFactory: SyncAccessHandleFactory,
    private readonly writableFileStreamFactory: WritableFileStreamFactory,
    private readonly fileSystem: FileSystem,
    private readonly permissionsManager: PermissionsManager
  ) {}

  /**
   * Creates new FileHandle instance for given descriptor.
   *
   * @param descriptor
   */
  create(descriptor: FileDescriptor): FileHandle {
    return new FileHandle(
      this.syncAccessHandleFactory,
      this.writableFileStreamFactory,
      descriptor,
      this.fileSystem,
      this.permissionsManager
    );
  }
}
