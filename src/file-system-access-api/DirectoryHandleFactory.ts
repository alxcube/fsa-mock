import { DirectoryHandle } from "./DirectoryHandle.ts";
import type {
  DirectoryDescriptor,
  FileSystem,
  EntryNameValidator,
} from "../file-system";
import type { FileHandleFactory } from "./FileHandleFactory.ts";
import type { PermissionsManager } from "../permissions";

/**
 * DirectoryHandle factory class.
 */
export class DirectoryHandleFactory {
  /**
   * DirectoryHandleFactory constructor.
   *
   * @param fileHandleFactory
   * @param entryNameValidator
   * @param fileSystem
   * @param permissionsManager
   */
  constructor(
    private readonly fileHandleFactory: FileHandleFactory,
    private readonly entryNameValidator: EntryNameValidator,
    private readonly fileSystem: FileSystem,
    private readonly permissionsManager: PermissionsManager
  ) {}

  /**
   * Creates new DirectoryHandle instance for given descriptor.
   *
   * @param descriptor
   */
  create(descriptor: DirectoryDescriptor): DirectoryHandle {
    return new DirectoryHandle(
      this,
      this.fileHandleFactory,
      this.entryNameValidator,
      descriptor,
      this.fileSystem,
      this.permissionsManager
    );
  }
}
