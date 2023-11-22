import type {
  PermissionResolvedState,
  PermissionsLiteral,
  PermissionsProvider,
} from "./PermissionsProvider";

/**
 * Default permissions provider. Returns predefined states for permissions.
 */
export class DefaultPermissionsProvider implements PermissionsProvider {
  /**
   * DefaultPermissionsProvider constructor.
   *
   * @param read Predefined 'read' permission state.
   * @param readwrite Predefined 'readwrite' permission state.
   * @param resolveTo Permission state to resolve to when requested.
   */
  constructor(
    private read: PermissionState = "prompt",
    private readwrite: PermissionState = "prompt",
    private resolveTo: PermissionResolvedState = "granted"
  ) {}

  /**
   * {@inheritDoc}
   */
  prompt(): PermissionResolvedState {
    return this.resolveTo;
  }

  /**
   * {@inheritDoc}
   */
  initial(): PermissionsLiteral {
    return { read: this.read, readwrite: this.readwrite };
  }
}
