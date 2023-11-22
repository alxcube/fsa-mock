import { basename } from "../utils";
import type { FileSystemEntryDescriptor, FileSystem } from "../file-system";
import type { PermissionsManager } from "../permissions";
import { throwNotAllowedError } from "../errorHelpers";

/**
 * FileSystemHandle mock class.
 */
export abstract class Handle implements FileSystemHandle {
  /**
   * Stores file system entry name.
   * @private
   */
  private readonly _name: string;

  /**
   * {@inheritDoc}
   */
  readonly kind: FileSystemHandleKind;

  /**
   * {@inheritDoc}
   */
  readonly isFile: boolean;

  /**
   * {@inheritDoc}
   */
  readonly isDirectory: boolean;

  /**
   * Handle constructor.
   *
   * @param descriptor
   * @param fileSystem
   * @param permissionsManager
   * @protected
   */
  protected constructor(
    protected readonly descriptor: FileSystemEntryDescriptor,
    protected readonly fileSystem: FileSystem,
    protected readonly permissionsManager: PermissionsManager
  ) {
    this._name = basename(this.descriptor.fullPath);
    this.kind = this.descriptor.type === "file" ? "file" : "directory";
    this.isFile = this.kind === "file";
    this.isDirectory = !this.isFile;
  }

  /**
   * {@inheritDoc}
   */
  get name() {
    return this._name;
  }

  /**
   * {@inheritDoc}
   */
  isSameEntry(other: Handle): Promise<boolean> {
    return Promise.resolve(Object.is(this.descriptor, other.descriptor));
  }

  /**
   * {@inheritDoc}
   */
  async queryPermission(
    descriptor: FileSystemHandlePermissionDescriptor = {}
  ): Promise<PermissionState> {
    const { mode = "read" } = descriptor;
    this.validatePermissionMode(mode, "queryPermission");
    return this.permissionsManager.getState(this.descriptor.fullPath, mode);
  }

  /**
   * {@inheritDoc}
   */
  async requestPermission(
    descriptor: FileSystemHandlePermissionDescriptor = {}
  ): Promise<PermissionState> {
    const { mode = "read" } = descriptor;
    this.validatePermissionMode(mode, "requestPermission");
    return this.permissionsManager.requestPermission(
      this.descriptor.fullPath,
      mode
    );
  }

  /**
   * Returns file system entry descriptor of current handle.
   */
  getDescriptor(): FileSystemEntryDescriptor {
    return this.descriptor;
  }

  /**
   * Checks if current handle has granted permission and throws 'NotAllowedError' DOMException if
   * permission isn't granted.
   * By default, checks "read" permission unless 'write' param is set to true.
   *
   * @param write
   * @protected
   */
  protected async ensureHasPermission(write = false) {
    const mode = write ? "readwrite" : "read";
    const state = await this.queryPermission({ mode });
    if (state !== "granted") {
      throwNotAllowedError();
    }
  }

  /**
   * Checks if permission mode is one of allowed permission modes ("read" of "readwrite") and throws TypeError if mode
   * is not allowed string.
   *
   * @param mode
   * @param method Method name for error message.
   * @private
   */
  private validatePermissionMode(mode: string, method: string) {
    if (mode !== "read" && mode !== "readwrite") {
      throw new TypeError(
        `Failed to execute '${method}' on 'FileSystemHandle': Failed to read the 'mode' property from 'FileSystemHandlePermissionDescriptor': The provided value '${mode}' is not a valid enum value of type FileSystemPermissionMode.`
      );
    }
  }
}
