import { SyncAccessHandle } from "./SyncAccessHandle";
import type { FileDescriptor, FileSystem } from "../file-system";

/**
 * SyncAccessHandle factory class.
 */
export class SyncAccessHandleFactory {
  /**
   * SyncAccessHandleFactory constructor.
   *
   * @param fileSystem
   */
  constructor(private readonly fileSystem: FileSystem) {}

  /**
   * Creates new SyncAccessHandle instance.
   *
   * @param descriptor
   * @param keepContent
   */
  create(descriptor: FileDescriptor, keepContent = false): SyncAccessHandle {
    return new SyncAccessHandle(descriptor, this.fileSystem, keepContent);
  }
}
