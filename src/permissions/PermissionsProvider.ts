import type { FileSystem } from "../file-system";

/**
 * Permissions object literal.
 */
export interface PermissionsLiteral {
  read: PermissionState;
  readwrite: PermissionState;
}

/**
 * Permission state except "prompt".
 */
export type PermissionResolvedState = "granted" | "denied";

/**
 * Prompt permission provider.
 */
export interface PromptPermissionProvider {
  /**
   * Callback function which will be called when permission is in "prompt" state, and request for that permission was
   * made.
   *
   * @param mode
   * @param fs
   * @param path
   */
  (
    mode: FileSystemPermissionMode,
    fs: FileSystem,
    path: string
  ): PermissionResolvedState | Promise<PermissionResolvedState>;
}

/**
 * Permissions provider.
 */
export interface PermissionsProvider {
  /**
   * Called when permission for given path is created first time.
   *
   * @param fs
   * @param path
   */
  initial(fs: FileSystem, path: string): PermissionsLiteral;

  /**
   * Called when permission is requested.
   */
  prompt: PromptPermissionProvider;
}
