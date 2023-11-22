import { Permission } from "./Permission";
import type { FileSystem } from "../file-system";
import { FileSystemPermissionStatus } from "./FileSystemPermissionStatus";
import { dirname } from "../utils";
import type {
  PermissionsProvider,
  PromptPermissionProvider,
} from "./PermissionsProvider";

/**
 * Permissions manager class.
 */
export class PermissionsManager {
  /**
   * Permissions storage. Keys are paths in file system and values are Permission objects.
   * @private
   */
  private permissions: Map<string, Permission>;

  /**
   * Prompt permission callback.
   * @private
   */
  private promptPermissionProvider: PromptPermissionProvider | undefined;

  /**
   * PermissionsManager constructor.
   *
   * @param fileSystem
   * @param permissionsProvider
   */
  constructor(
    private fileSystem: FileSystem,
    private permissionsProvider: PermissionsProvider
  ) {
    this.permissions = new Map();
  }

  /**
   * Returns FileSystemPermissionStatus object for given path and mode.
   *
   * @param path
   * @param mode
   */
  getStatus(
    path: string,
    mode: FileSystemPermissionMode
  ): FileSystemPermissionStatus {
    this.ensureIsValidMode(mode);
    const permission = this.getPermission(path);
    return new FileSystemPermissionStatus(permission, mode);
  }

  /**
   * Returns current permission state for given path and mode, creating new permission for given path if it doesn't exist.
   *
   * @param path
   * @param mode
   */
  getState(path: string, mode: FileSystemPermissionMode): PermissionState {
    this.ensureIsValidMode(mode);
    const permission = this.getPermission(path);
    return permission.get(mode);
  }

  /**
   * Sets permission state for given path and mode, creating new permission for given path if it doesn't exist.
   *
   * @param path
   * @param mode
   * @param state
   */
  setState(
    path: string,
    mode: FileSystemPermissionMode,
    state: PermissionState
  ) {
    this.ensureIsValidMode(mode);
    const permission = this.getPermission(path);
    permission.set(mode, state);
  }

  /**
   * Duplicates permission states from one path to another.
   *
   * @param from
   * @param to
   */
  duplicate(from: string, to: string) {
    const sourcePermission = this.getPermission(from);
    const destinationPermission = this.getPermission(to);
    destinationPermission.setRead(sourcePermission.getRead());
    destinationPermission.setReadwrite(sourcePermission.getReadwrite());
  }

  /**
   * Requests permission for given mode and path if current permission state is "prompt".
   *
   * @param path
   * @param mode
   */
  async requestPermission(
    path: string,
    mode: FileSystemPermissionMode
  ): Promise<PermissionState> {
    this.ensureIsValidMode(mode);
    const permission = this.getPermission(path);
    if (permission.get(mode) == "prompt") {
      const state = await this.promptPermission(path, mode);
      permission.set(mode, state);
      return state;
    }
    return permission.get(mode);
  }

  /**
   * Sets prompt permission callback.
   *
   * @param provider
   */
  setPromptPermissionProvider(provider?: PromptPermissionProvider) {
    this.promptPermissionProvider = provider;
  }

  /**
   * Returns Permission object for given path, creating it if it doesn't exist.
   *
   * @param path
   * @private
   */
  private getPermission(path: string): Permission {
    this.ensureIsValidPath(path);
    return this.findOrCreatePermission(path);
  }

  /**
   * Returns Permission from permissions storage or new permission.
   *
   * @param path
   * @private
   */
  private findOrCreatePermission(path: string): Permission {
    if (this.permissions.has(path)) {
      return this.permissions.get(path)!;
    }
    const { read, readwrite } = this.permissionsProvider.initial(
      this.fileSystem,
      path
    );
    const permission = new Permission(read, readwrite);
    if (path.length) {
      const parentPath = dirname(path);
      if (parentPath !== null) {
        const parentPermission = this.findOrCreatePermission(parentPath);
        permission.setRead(parentPermission.getRead());
        permission.setReadwrite(parentPermission.getReadwrite());
        parentPermission.subscribe("read", (state) =>
          permission.setRead(state)
        );
        parentPermission.subscribe("readwrite", (state) =>
          permission.setReadwrite(state)
        );
      }
    }
    this.permissions.set(path, permission);
    return permission;
  }

  /**
   * Performs permission prompt, using either PermissionsProvider, of PromptPermissionProvider callback if it was set.
   *
   * @param path
   * @param mode
   * @private
   */
  private promptPermission(
    path: string,
    mode: FileSystemPermissionMode
  ): PermissionState | Promise<PermissionState> {
    if (this.promptPermissionProvider) {
      const provider = this.promptPermissionProvider;
      return provider(mode, this.fileSystem, path);
    }
    return this.permissionsProvider.prompt(mode, this.fileSystem, path);
  }

  /**
   * Throws TypeError if given path doesn't exist in file system.
   *
   * @param path
   * @private
   */
  private ensureIsValidPath(path: string) {
    if (!this.fileSystem.exists(path)) {
      throw new TypeError(`Path "${path}" doesn't exist in file system`);
    }
  }

  /**
   * Throws TypeError if given string is not one of allowed permission modes.
   *
   * @param mode
   * @private
   */
  private ensureIsValidMode(mode: string) {
    if (mode !== "read" && mode !== "readwrite") {
      throw new TypeError("Invalid mode.");
    }
  }
}
