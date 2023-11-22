/**
 * Callback of permission state change.
 */
export type PermissionSubscribeCallback = (newState: PermissionState) => void;

/**
 * File system permission object.
 */
export class Permission {
  /**
   * State change callbacks storage.
   * @private
   */
  private subscribers: Map<
    FileSystemPermissionMode,
    PermissionSubscribeCallback[]
  >;

  /**
   * Permission constructor.
   *
   * @param read
   * @param readwrite
   */
  constructor(
    private read: PermissionState = "prompt",
    private readwrite: PermissionState = "prompt"
  ) {
    this.subscribers = new Map();
  }

  /**
   * Returns permission state for given mode.
   *
   * @param mode
   */
  get(mode: FileSystemPermissionMode): PermissionState {
    return mode === "readwrite" ? this.getReadwrite() : this.getRead();
  }

  /**
   * Sets permission state for given mode.
   *
   * @param mode
   * @param state
   */
  set(mode: FileSystemPermissionMode, state: PermissionState) {
    return mode === "readwrite"
      ? this.setReadwrite(state)
      : this.setRead(state);
  }

  /**
   * Sets 'read' permission state.
   *
   * @param state
   */
  setRead(state: PermissionState) {
    const oldState = this.read;
    this.read = state;
    if (oldState !== state) {
      this.notify("read", state);
    }
    if (state !== "granted") {
      this.setReadwrite(state);
    }
  }

  /**
   * Sets 'readwrite' permission state.
   *
   * @param state
   */
  setReadwrite(state: PermissionState) {
    if (state === "granted") {
      this.setRead(state);
    }
    const oldState = this.readwrite;
    this.readwrite = state;
    if (oldState !== state) {
      this.notify("readwrite", state);
    }
  }

  /**
   * Returns 'read' permission state.
   */
  getRead(): PermissionState {
    return this.read;
  }

  /**
   * Returns 'readwrite' permission state.
   */
  getReadwrite(): PermissionState {
    return this.readwrite;
  }

  /**
   * Subscribes callback for permission of given mode state change.
   *
   * @param mode
   * @param callback
   */
  subscribe(
    mode: FileSystemPermissionMode,
    callback: PermissionSubscribeCallback
  ) {
    const callbacks = this.subscribers.get(mode) || [];
    callbacks.push(callback);
    this.subscribers.set(mode, callbacks);
  }

  /**
   * Unsubscribes given permission state change callback.
   *
   * @param mode
   * @param callback
   */
  unsubscribe(
    mode: FileSystemPermissionMode,
    callback: PermissionSubscribeCallback
  ) {
    const callbacks = this.subscribers.get(mode);
    if (!callbacks) {
      return;
    }
    const index = callbacks.indexOf(callback);
    if (index >= 0) {
      callbacks.splice(index, 1);
    }
  }

  /**
   * Calls subscribed callback when permission state for given mode is changed.
   *
   * @param mode
   * @param newState
   * @private
   */
  private notify(mode: FileSystemPermissionMode, newState: PermissionState) {
    const callbacks = this.subscribers.get(mode);
    if (!callbacks) {
      return;
    }
    callbacks.forEach((cb) => cb(newState));
  }
}
