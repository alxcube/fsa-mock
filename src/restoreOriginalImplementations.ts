/**
 * Original File System Access API implementations container.
 * @internal
 */
interface OriginalImplementations {
  showDirectoryPicker?: typeof showDirectoryPicker;
  showOpenFilePicker?: typeof showOpenFilePicker;
  showSaveFilePicker?: typeof showSaveFilePicker;
  FileSystemHandle?: typeof FileSystemHandle;
  FileSystemFileHandle?: typeof FileSystemFileHandle;
  FileSystemDirectoryHandle?: typeof FileSystemDirectoryHandle;
  FileSystemWritableFileStream?: typeof FileSystemWritableFileStream;
  FileSystemSyncAccessHandle?: unknown; // Not present in types.
}

const originalImplementations: OriginalImplementations = {};

/**
 * Saves original File System Access API implementations for backup.
 *
 * @param w
 * @internal
 */
function backup(w: typeof window) {
  originalImplementations.showDirectoryPicker = w.showDirectoryPicker;
  originalImplementations.showOpenFilePicker = w.showOpenFilePicker;
  originalImplementations.showSaveFilePicker = w.showSaveFilePicker;
  originalImplementations.FileSystemHandle = w.FileSystemHandle;
  originalImplementations.FileSystemFileHandle = w.FileSystemFileHandle;
  originalImplementations.FileSystemDirectoryHandle =
    w.FileSystemDirectoryHandle;
  originalImplementations.FileSystemWritableFileStream =
    w.FileSystemWritableFileStream;
  if ("FileSystemSyncAccessHandle" in w) {
    originalImplementations.FileSystemSyncAccessHandle =
      w.FileSystemSyncAccessHandle;
  }
}
backup(self);

/**
 * Restores original File System Access API implementations in global object.
 *
 * @param w
 * @internal
 */
export function restoreOriginalImplementations(w: typeof window = self) {
  w.showDirectoryPicker = originalImplementations.showDirectoryPicker!;
  w.showOpenFilePicker = originalImplementations.showOpenFilePicker!;
  w.showSaveFilePicker = originalImplementations.showSaveFilePicker!;
  w.FileSystemHandle = originalImplementations.FileSystemHandle!;
  w.FileSystemFileHandle = originalImplementations.FileSystemFileHandle!;
  w.FileSystemDirectoryHandle =
    originalImplementations.FileSystemDirectoryHandle!;
  w.FileSystemWritableFileStream =
    originalImplementations.FileSystemWritableFileStream!;
  if ("FileSystemSyncAccessHandle" in w) {
    w.FileSystemSyncAccessHandle =
      originalImplementations.FileSystemSyncAccessHandle;
  }
}
