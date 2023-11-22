import type { Permission } from "./Permission.ts";

/**
 * Permission status change event listener function.
 */
export type FileSystemPermissionStatusChangeEventListener = (
  this: PermissionStatus,
  ev: Event
) => void;

/**
 * File system permission status.
 */
export class FileSystemPermissionStatus
  extends EventTarget
  implements PermissionStatus
{
  /**
   * Permission status name.
   */
  readonly name = "file-system";

  /**
   * Property for storage "change" event listener, set by 'onchange' setter.
   * @private
   */
  private _onchange: FileSystemPermissionStatusChangeEventListener | null =
    null;

  /**
   * "change" even listener getter.
   */
  get onchange() {
    return this._onchange;
  }

  /**
   * "change" even listener setter.
   *
   * @param listener
   */
  set onchange(listener: FileSystemPermissionStatusChangeEventListener | null) {
    if (this._onchange) {
      this.removeEventListener("change", this._onchange);
    }
    if (listener) {
      this._onchange = listener;
      this.addEventListener("change", listener);
    }
  }

  /**
   * Permission state getter.
   */
  get state() {
    if (this.mode === "readwrite") {
      return this.permission.getReadwrite();
    }
    return this.permission.getRead();
  }

  /**
   * FileSystemPermissionStatus constructor.
   *
   * @param permission
   * @param mode
   */
  constructor(
    private permission: Permission,
    private mode: FileSystemPermissionMode
  ) {
    super();
    permission.subscribe(this.mode, () => {
      this.dispatchEvent(new Event("change"));
    });
  }
}
