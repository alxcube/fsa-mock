# File System Access API mock

[File System Access API](https://wicg.github.io/file-system-access/) mocks.

Mocked members:
* [FileSystemFileHandle](https://developer.mozilla.org/en-US/docs/Web/API/FileSystemFileHandle) class.
* [FileSystemDirectoryHandle](https://developer.mozilla.org/en-US/docs/Web/API/FileSystemDirectoryHandle) class.
* [FileSystemSyncAccessHandle](https://developer.mozilla.org/en-US/docs/Web/API/FileSystemSyncAccessHandle) class.
* [FileSystemWritableFileStream](https://developer.mozilla.org/en-US/docs/Web/API/FileSystemWritableFileStream) class.
* [window.showDirectoryPicker()](https://developer.mozilla.org/en-US/docs/Web/API/Window/showDirectoryPicker) method.
* [window.showOpenFilePicker()](https://developer.mozilla.org/en-US/docs/Web/API/Window/showOpenFilePicker) method.
* [window.showSaveFilePicker()](https://developer.mozilla.org/en-US/docs/Web/API/Window/showSaveFilePicker) method.


## Installation
```
npm i -D fsa-mock
```

## Usage

Example code to test:
```ts
export async function saveFile(file: Blob) {
    const fileHandle = await showSaveFilePicker();
    const stream = await fileHandle.createWritable();
    await stream.write(file);
    await stream.close();
}
```

Example test using vitest:
```ts
import { mock } from "fsa-mock";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { saveFile } from "./saveFile.ts";

describe("saveFile() function", () => {
    let file: File;
    
    beforeEach(() => {
        // You can pass options to install() method
        mock.install();
        file = new File(["example file contents"], "file.txt");
    });

    afterEach(() => {
        mock.uninstall();
    });
    
    it("should save file", async () => {
        const path = "path/to/file.txt";
        // set file picker callback to return path
        // such as it was picked using save file picker
        mock.onSaveFilePicker(() => path);
        
        await saveFile(file);
        
        // check if file appeared in file system
        expect(mock.fs().isFile(path)).toBe(true);
        // ...of shorthand
        expect(mock.isFile(path)).toBe(true);
    });
    
    it("should reject with AbortError if user aborted file picker", async () => {
        // set file picker callback to return undefined to simulate picker abortion
        mock.onSaveFilePicker(() => undefined);
        
        try {
            await saveFile(file);
            expect.fail();
        } catch (e) {
            expect(e).toBeInstanceOf(DOMException);
            expect(e.name).toBe("AbortError");
        }
    });
    
    it("should reject with NotAllowedError if no 'readwrite' permission was granted", async () => {
        // set permissions request callback to return 'denied'
        mock.onPromptPermission(() => "denied");
        
        const path = "path/to/file.txt";
        mock.onSaveFilePicker(() => path);
        
        try {
            await saveFile(file);
            expect.fail();
        } catch (e) {
            expect(e).toBeInstanceOf(DOMException);
            expect(e.name).toBe("NotAllowedError");
        }
    });
});
```

## API

### mock.install(options: BootstrapOptions): void
Creates new context and replaces original File System Access API implementations to mocked ones.
See `BootstrapOptions` description in the next section. 

### mock.uninstall(): void
Restores original File System Access API implementations.

### mock.exists(path: string): boolean
Checks for path (either file or directory) existence in file system.

### mock.isFile(path: string): boolean
Checks for file existence at given path.

### mock.isDir(path: string): boolean
Checks for directory existence at given path.

### mock.makeDir(path: string): void
Recursively creates directory at given path. Used to create directory structure
before testing.

### mock.createFile(path: string, contents?: BufferSource): void
Creates file at given path. Parent directories are created recursively.
File is empty and have size of 0 bytes, unless contents was passed.

### mock.contents(path: string): ArrayBuffer
Returns file contents ArrayBuffer if it exists at given path.

### mock.onPromptPermission(provider?: PromptPermissionProvider): void
```ts
type PermissionResolvedState = "granted" | "denied";

interface PromptPermissionProvider {
    (
        mode: FileSystemPermissionMode,
        fs: FileSystem,
        path: string
    ): PermissionResolvedState | Promise<PermissionResolvedState>;
}
```
Sets callback for access permission prompt.
Callback will be called only if current permission state is "prompt" and will be
passed following arguments:
* mode - file system permission mode: "read" or "readwrite"
* fs - file system object
* path - file of directory path for which permission is requested

Callback should return permission state other than "prompt" of Promise that resolves to such state.

### mock.onDirectoryPicker(provider?: DirectoryPickerProvider): void
```ts
interface DirectoryPickerProvider {
    (
        fs: FileSystem,
        options: DirectoryPickerOptions
    ): string | undefined | Promise<string | undefined>;
}
```
Callback which will be called when `showDirectoryPicker()` is called.
It should return full directory path to emulate user selection of given directory.
To emulate user dialog abortion, return undefined from callback.
Returned path must exist in file system and be directory (not file) path.
Path shouldn't start with slash or backslash.
All options that were passed to `showDirectoryFilePicker()` function will be passed to callback via second argument.

### mock.onOpenFilePicker(provider?: OpenFilePickerProvider): void
```ts
interface OpenFilePickerProvider {
    (
        fs: FileSystem,
        options: OpenFilePickerOptions
    ): string[] | undefined | Promise<string[] | undefined>;
}
```

Callback which will be called when `showOpenFilePicker()` is called.
It should return array of full file paths to emulate user selection of given files.
To emulate user dialog abortion, return undefined or empty array from callback.
All selected paths must be existing file (not directory) paths, and have same parent path.
Only first of provided paths will be used, unless 'multiple' option is set to true in showOpenFilePicker() call.
All options passed to `showOpenFilePicker()` function will be passed to callback via second argument.

### mock.onSaveFilePicker(provider?: SaveFilePickerProvider): void
```ts
interface SaveFilePickerProvider {
    (
        fs: FileSystem,
        options: SaveFilePickerOptions
    ): string | undefined | Promise<string | undefined>;
}
```
Callback which will be called when `showSaveFilePicker()` is called.
It should return full file path to emulate user selection of given file.
To emulate user dialog abortion, return undefined from callback.
If returned file path doesn't  exist, it will be created.
Returned path shouldn't start with slash or backslash, and must be a file (not directory) path.
All options passed to `showSaveFilePicker()` function will be passed to callback via second argument.

### mock.setDiskSize(size: number): void
Sets file system disk size.

### mock.setPermission(path: string, mode: FileSystemPermissionMode, state: PermissionState): void
Sets permission state for given path and mode. 

### mock.fs(): FileSystem
Returns virtual file system. It is unlikely that you will use this in tests.

### mock.pm(): PermissionsManager
Returns permissions manager. It is unlikely that you will use this in tests.

## BootstrapOptions
Options that can be passed to the mock.install() method.

### diskSize: number
Virtual disk size in bytes.
Can be set after installation using: mock.setDiskSize();
Default: `Infinity`

### permissionsProvider: PermissionProvider
Implementation of PermissionProvider interface. It is unlikely that you will need to change it.

### readPermission: PermissionState
Initial "read" permission state for new file system entries.
Will be ignored if custom `permissionProvider` option is set.
Default: `"propmt"`.

### readWritePermission: PermissionState
Initial "readwrite" permission state for new file system entries.
Will be ignored if custom `permissionProvider` option is set.
Default: `"propmt"`.

### resolveToPermission: "granted" | "denied"
Permission state to which permissions "prompt" state will be resolved, unless custom
PromptPermissionProvider callback (see below) is set.
Will be ignored if custom `permissionProvider` option is set of if custom PromptPermissionProvider is set.
Default: `"granted"`.

### promptPermissionProvider: PromptPermissionProvider
Callback to resolve permission state on prompt.
See details above at `mock.onPromptPermission()` method description.

### entryNameValidator: EntryNameValidator
```ts
interface EntryNameValidator {
  /**
   * Returns boolean validation result of file system entry name.
   *
   * @param name Entry base name (not full path).
   * @param isFileName Boolean indicating that name is file name (not directory name).
   */
  isValidName(name: string, isFileName: boolean): boolean;
}
```
Default entry names validator forbids ".", "..", "" (empty string) as file and directory
names. It also forbids names that contain known forbidden characters.
If you need more control over names validation, you can set this option to custom
EntryNamesValidator interface implementation.

### invalidCharsRegex: RegExp
Regular expression for testing for invalid characters. It is used by default EntryNameValidator
and is ignored if custom EntryNameValidator was set by previous option.
Default regular expressions forbids following characters in file and directory names:
"/", "\", ":", "*", "?", '"' (double quote), "<", ">", "|".

### directoryPickerProvider: DirectoryPickerProvider
Callback for directory picker. See details above in `mock.onDirectoryPicker()`
method description.

### openFilePickerProvider: OpenFilePickerProvider
Callback for open file picker. See details above in `mock.onOpenFilePicker()`
method description.

### saveFilePickerProvider: SaveFilePickerProvider
Callback for save file picker. See details above in `mock.onSaveFilePicker()`
method description.