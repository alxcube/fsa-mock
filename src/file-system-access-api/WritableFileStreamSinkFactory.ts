import { WritableFileStreamSink } from "./WritableFileStreamSink";
import type { FileDescriptor } from "../file-system";
import type { SyncAccessHandleFactory } from "./SyncAccessHandleFactory";
import type { PermissionsManager } from "../permissions";

/**
 * WritableFileStreamSink factory class.
 */
export class WritableFileStreamSinkFactory {
  /**
   * WritableFileStreamSinkFactory constructor.
   *
   * @param syncAccessHandleFactory
   * @param permissionsManager
   */
  constructor(
    private syncAccessHandleFactory: SyncAccessHandleFactory,
    private readonly permissionsManager: PermissionsManager
  ) {}

  /**
   * Creates new WritableFileStreamSink instance.
   *
   * @param descriptor
   * @param keepContent
   */
  create(
    descriptor: FileDescriptor,
    keepContent = false
  ): WritableFileStreamSink {
    const syncAccessHandle = this.syncAccessHandleFactory.create(
      descriptor,
      keepContent
    );
    return new WritableFileStreamSink(
      syncAccessHandle,
      descriptor,
      this.permissionsManager
    );
  }
}
