import {
  SyncAccessHandleFactory,
  WritableFileStreamSinkFactory,
  WritableFileStreamFactory,
  FileHandleFactory,
  DirectoryHandleFactory,
  PickersFactory,
  type DirectoryPickerProvider,
  type OpenFilePickerProvider,
  type SaveFilePickerProvider,
} from "./file-system-access-api";
import {
  type EntryNameValidator,
  DefaultEntryNameValidator,
  FileSystem,
} from "./file-system";
import {
  PermissionsManager,
  type PermissionResolvedState,
  type PermissionsProvider,
  type PromptPermissionProvider,
  DefaultPermissionsProvider,
} from "./permissions";

/**
 * Options of bootstrap() function.
 */
export interface BootstrapOptions {
  /**
   * Virtual disk space.
   * @default Infinity
   */
  diskSize?: number;

  /**
   * Permissions provider.
   * @default DefaultPermissionsProvider instance.
   */
  permissionsProvider?: PermissionsProvider;

  /**
   * Initial permission state for 'read' mode. Ignored if 'permissionProvider' option is set.
   * @default "prompt"
   */
  readPermission?: PermissionState;

  /**
   * Initial permission state for 'readwrite' mode. Ignored if 'permissionProvider' option is set.
   * @default "prompt"
   */
  readwritePermission?: PermissionState;

  /**
   * Permission state to resolve to on permission request. Ignored if 'permissionProvider' option is set. This also
   * can be overriden by setting PromptPermissionProvider on PermissionsManager.
   * @default "granted"
   */
  resolveToPermission?: PermissionResolvedState;

  /**
   * Callback permission prompt.
   */
  promptPermissionProvider?: PromptPermissionProvider;

  /**
   * Object implementing EntryNameValidator interface, used to validate file and directory names.
   * @default: DefaultEntryNameValidator instance
   */
  entryNameValidator?: EntryNameValidator;

  /**
   * Regular expression for testing directory and file names for containing invalid characters. Will be ignored if
   * 'entryNameValidator' option is set.
   * @default /[\\/:*?"<>|]/
   */
  invalidCharsRegex?: RegExp;

  /**
   * Callback for directory picker.
   */
  directoryPickerProvider?: DirectoryPickerProvider;

  /**
   * Callback for open file picker.
   */
  openFilePickerProvider?: OpenFilePickerProvider;

  /**
   * Callback for close file picker.
   */
  saveFilePickerProvider?: SaveFilePickerProvider;
}

/**
 * Mock context of File System Access API.
 */
export interface GlobalContext {
  fileSystem: FileSystem;
  permissionsManager: PermissionsManager;
  permissionsProvider: PermissionsProvider;
  fileHandleFactory: FileHandleFactory;
  directoryHandleFactory: DirectoryHandleFactory;
  syncAccessHandleFactory: SyncAccessHandleFactory;
  writableFileStreamSinkFactory: WritableFileStreamSinkFactory;
  writableFileStreamFactory: WritableFileStreamFactory;
  pickersFactory: PickersFactory;
  entryNameValidator: EntryNameValidator;
}

/**
 * Creates mock context.
 *
 * @param options
 */
export function bootstrap(options: BootstrapOptions = {}): GlobalContext {
  const fileSystem = new FileSystem(options.diskSize);

  let permissionsProvider: PermissionsProvider;
  if (options.permissionsProvider) {
    permissionsProvider = options.permissionsProvider;
  } else {
    const {
      readPermission = "prompt",
      readwritePermission = "prompt",
      resolveToPermission = "granted",
    } = options;
    permissionsProvider = new DefaultPermissionsProvider(
      readPermission,
      readwritePermission,
      resolveToPermission
    );
  }

  const permissionsManager = new PermissionsManager(
    fileSystem,
    permissionsProvider
  );
  permissionsManager.setPromptPermissionProvider(
    options.promptPermissionProvider
  );

  const syncAccessHandleFactory = new SyncAccessHandleFactory(fileSystem);

  const writableFileStreamSinkFactory = new WritableFileStreamSinkFactory(
    syncAccessHandleFactory,
    permissionsManager
  );

  const writableFileStreamFactory = new WritableFileStreamFactory(
    writableFileStreamSinkFactory
  );

  const fileHandleFactory = new FileHandleFactory(
    syncAccessHandleFactory,
    writableFileStreamFactory,
    fileSystem,
    permissionsManager
  );

  const entryNameValidator = options.entryNameValidator
    ? options.entryNameValidator
    : new DefaultEntryNameValidator(options.invalidCharsRegex);

  const directoryHandleFactory = new DirectoryHandleFactory(
    fileHandleFactory,
    entryNameValidator,
    fileSystem,
    permissionsManager
  );

  const pickersFactory = new PickersFactory(
    fileSystem,
    permissionsManager,
    directoryHandleFactory,
    fileHandleFactory
  );
  pickersFactory.setDirectoryPickerProvider(options.directoryPickerProvider);
  pickersFactory.setOpenFilePickerProvider(options.openFilePickerProvider);
  pickersFactory.setSaveFilePickerProvider(options.saveFilePickerProvider);

  return {
    fileSystem,
    permissionsManager,
    permissionsProvider,
    syncAccessHandleFactory,
    writableFileStreamSinkFactory,
    writableFileStreamFactory,
    fileHandleFactory,
    directoryHandleFactory,
    pickersFactory,
    entryNameValidator,
  };
}
