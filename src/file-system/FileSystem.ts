import { dirname, isChildPath, isSubPath } from "../utils";
import { throwNotFoundError, throwTypeMismatchError } from "../errorHelpers";

/**
 * Directory descriptor object.
 */
export interface DirectoryDescriptor {
  /**
   * Directory descriptor type constant.
   */
  type: "dir";

  /**
   * Directory full path.
   */
  fullPath: string;
}

/**
 * File descriptor object.
 */
export interface FileDescriptor {
  /**
   * File descriptor type constant.
   */
  type: "file";

  /**
   * File full path.
   */
  fullPath: string;

  /**
   * File size in bytes.
   */
  size: number;

  /**
   * File last modification timestamp.
   */
  lastModified?: number;
}

/**
 * File system entry descriptor object.
 */
export type FileSystemEntryDescriptor = FileDescriptor | DirectoryDescriptor;

/**
 * File system model class.
 */
export class FileSystem {
  /**
   * Registry of file system entries -- directories and files. Keys are full paths to entry, values are directory
   * or file descriptors.
   * @private
   */
  private registry: Map<string, DirectoryDescriptor | FileDescriptor>;

  /**
   * File contents storage. Keys are objects of FileDescriptor interface -- the same objects that are values
   * of 'registry'. Values are ArrayBuffer's with binary file contents.
   * @private
   */
  private disk: Map<FileDescriptor, ArrayBuffer>;

  /**
   * FileSystem constructor.
   *
   * @param diskSize Virtual disk size in bytes.
   */
  constructor(private diskSize = Infinity) {
    this.registry = new Map();
    this.disk = new Map();
    // create file system root
    this.registry.set("", { type: "dir", fullPath: "" });
  }

  /**
   * Checks if either file or directory exists at given path.
   *
   * @param path
   */
  exists(path: string): boolean {
    return this.registry.has(path);
  }

  /**
   * Checks if given path exists and is directory path.
   *
   * @param path
   */
  isDirectory(path: string): boolean {
    const descriptor = this.registry.get(path);
    if (!descriptor) {
      return false;
    }
    return descriptor.type === "dir";
  }

  /**
   * Checks if given path exists and is file path.
   *
   * @param path
   */
  isFile(path: string): boolean {
    const descriptor = this.registry.get(path);
    if (!descriptor) {
      return false;
    }
    return descriptor.type === "file";
  }

  /**
   * Creates directory record in file system and returns its descriptor. Only direct child path of existing directory
   * allowed unless 'recursive' option is set to true. Throws `TypeError` when given path already exists, when given
   * path is not path of direct child of existing directory (unless 'recursive' option is set to true) and when path
   * contains file path.
   *
   * @param path
   * @param options
   */
  makeDirectory(
    path: string,
    options: { recursive?: boolean } = {}
  ): DirectoryDescriptor {
    if (this.exists(path)) {
      throw new TypeError(`"${path}" already exist.`);
    }
    const dirName = dirname(path);
    if (dirName !== null && dirName.length) {
      if (!this.exists(dirName)) {
        if (!options.recursive) {
          throw new TypeError(
            "Set 'recursive' option to true for recursive directory creation."
          );
        }
        this.makeDirectory(dirName, options);
      } else if (!this.isDirectory(dirName)) {
        throw new TypeError(`"${dirName}" is not directory path.`);
      }
    }
    const descriptor: DirectoryDescriptor = {
      type: "dir",
      fullPath: path,
    };
    this.registry.set(path, descriptor);
    return descriptor;
  }

  /**
   * Returns root directory.
   *
   * @param path
   */
  getDirectoryDescriptor(path: ""): DirectoryDescriptor;

  /**
   * Returns DirectoryDescriptor object if given path exists and is directory path. Returns undefined if given path
   * doesn't exist. Throws 'TypeMismatchError' DOMException if given path is file path.
   * Recursively creates directories of given path if 'create' option is set to true.
   *
   * @param path
   * @param options
   */
  getDirectoryDescriptor(
    path: string,
    options?: { create?: boolean }
  ): DirectoryDescriptor | undefined;
  getDirectoryDescriptor(
    path: string,
    options: { create?: boolean } = {}
  ): DirectoryDescriptor | undefined {
    if (this.exists(path)) {
      if (this.isDirectory(path)) {
        return this.registry.get(path) as DirectoryDescriptor;
      } else {
        throwTypeMismatchError(`"${path}" is not directory.`);
      }
    }
    if (options.create) {
      return this.makeDirectory(path, { recursive: true });
    }
  }

  /**
   * Creates file at given path and returns its descriptor. By default, file size is 0 bytes. If 'size' option is set,
   * the file of given size is created, filled by zeroes.
   * If file parent path doesn't exist, it is created recursively.
   * Throws TypeError if given path already exists.
   * Throws RangeError if given file size is larger than free disk space.
   *
   * @param path
   * @param options
   */
  createFile(path: string, options: { size?: number } = {}): FileDescriptor {
    if (this.exists(path)) {
      throw new TypeError(`"${path}" already exists.`);
    }
    const dirName = dirname(path);
    if (dirName !== null && dirName.length && !this.exists(dirName)) {
      this.makeDirectory(dirName, { recursive: true });
    }
    const { size = 0 } = options;
    const fileDescriptor: FileDescriptor = {
      type: "file",
      fullPath: path,
      size,
    };
    this.allocateFile(fileDescriptor);
    this.registry.set(path, fileDescriptor);
    return fileDescriptor;
  }

  /**
   * Returns FileDescriptor object if path exists and is file path. If path doesn't exist, returns undefined.
   * If path doesn't exist and 'create' option is set to true, file of 0 bytes size will be created at given path.
   * Throws 'TypeMismatchError' DOMException if given path is directory path.
   *
   * @param path
   * @param options
   */
  getFileDescriptor(
    path: string,
    options: { create?: boolean } = {}
  ): FileDescriptor | undefined {
    if (this.exists(path)) {
      if (this.isFile(path)) {
        return this.registry.get(path) as FileDescriptor;
      }
      throwTypeMismatchError(`"${path}" is not a file.`);
    }
    const { create = false } = options;
    if (create) {
      return this.createFile(path);
    }
  }

  /**
   * Returns file contents for given file descriptor. Descriptor must be concrete object from 'registry' Map.
   * Throws 'NotFoundError' DOMException if file contents for given descriptor couldn't be found on virtual disk.
   *
   * @param descriptor
   */
  readFile(descriptor: FileDescriptor): ArrayBuffer {
    const buffer = this.disk.get(descriptor);
    if (!buffer) {
      throwNotFoundError("No file for given descriptor was found.");
    }
    return buffer;
  }

  /**
   * Writes given file contents to virtual disk.
   * Throws 'NotFoundError' DOMException if no record on disk was found for given descriptor.
   * Throws RangeError if contents size is larger than free disk space.
   *
   * @param descriptor
   * @param data
   */
  writeFile(descriptor: FileDescriptor, data: ArrayBuffer) {
    if (!this.disk.has(descriptor)) {
      throwNotFoundError("No allocated memory for given descriptor.");
    }
    const freeSpace = this.getFreeDiskSpace();
    const oldFileSize = this.disk.get(descriptor)?.byteLength || 0;
    if (data.byteLength > freeSpace + oldFileSize) {
      throw new RangeError(
        `Not enough free space to write file. File size: ${
          data.byteLength
        } bytes; Free disk space: ${freeSpace + oldFileSize} bytes.`
      );
    }
    this.disk.set(descriptor, data);
    descriptor.size = data.byteLength;
    descriptor.lastModified = Date.now();
  }

  /**
   * Returns file size in bytes by given path.
   * Returns undefined if given path doesn't exist or is directory path.
   *
   * @param path
   */
  getFileSize(path: string): number | undefined {
    const descriptor = this.getDescriptor(path);
    if (descriptor && descriptor.type === "file") {
      return this.disk.get(descriptor)?.byteLength;
    }
  }

  /**
   * Removes file system entry by its path.
   * Throws 'InvalidModificationError' if given directory path has descendant paths, unless 'recursive' option is set
   * to true.
   * Throws TypeError if path is root path (empty string).
   *
   * @param path
   * @param options
   */
  remove(path: string, options: { recursive?: boolean } = {}) {
    if (!path.length) {
      throw new TypeError("Root entry is not removable.");
    }

    if (this.isFile(path)) {
      const descriptor = this.getFileDescriptor(path);
      if (descriptor) {
        this.disk.delete(descriptor);
      }
      this.registry.delete(path);
    } else {
      const childPaths = this.getChildPaths(path);
      if (childPaths.length) {
        const { recursive = false } = options;
        if (!recursive) {
          throw new DOMException(
            "Directory has children.",
            "InvalidModificationError"
          );
        }
        childPaths.forEach((childPath) => this.remove(childPath, options));
      }
      this.registry.delete(path);
    }
  }

  /**
   * Returns either file, or directory descriptor if it exists at given path, otherwise returns undefined.
   *
   * @param path
   */
  getDescriptor(path: string): FileSystemEntryDescriptor | undefined {
    return this.registry.get(path);
  }

  /**
   * Returns all descendant paths of given path.
   *
   * @param path
   */
  getDescendantPaths(path: string): string[] {
    const allPaths = Array.from(this.registry.keys());
    if (!path.length) {
      return allPaths.filter((p) => p !== "");
    }
    return allPaths.filter((p) => isSubPath(p, path));
  }

  /**
   * Returns all child paths of given path.
   *
   * @param path
   */
  getChildPaths(path: string): string[] {
    return Array.from(this.registry.keys()).filter(
      (p) => p !== "" && isChildPath(p, path)
    );
  }

  /**
   * Returns array of tuples where first element is full path, and second element is FileDescriptor or DirectoryDescriptor
   * object which are children of given path.
   *
   * @param path
   */
  getChildEntries(
    path: string
  ): [string, FileDescriptor | DirectoryDescriptor][] {
    return this.getChildPaths(path).map((childPath) => [
      childPath,
      this.registry.get(childPath)!,
    ]);
  }

  /**
   * Checks if given descriptor belongs to current file system.
   *
   * @param descriptor
   */
  isValidDescriptor(descriptor: FileSystemEntryDescriptor): boolean {
    return Object.is(this.getDescriptor(descriptor.fullPath), descriptor);
  }

  /**
   * Returns total virtual disk space in bytes.
   */
  getTotalDiskSpace(): number {
    return this.diskSize;
  }

  /**
   * Sets virtual disk space limit in bytes. Throws RangeError if given new disk size is less than already used disk
   * space.
   *
   * @param size
   */
  setTotalDiskSpace(size: number) {
    const usedSpace = this.getUsedDiskSpace();
    if (size < usedSpace) {
      throw new RangeError(
        `Can't set disk space to ${size} bytes because used space size is ${usedSpace} bytes.`
      );
    }
    this.diskSize = size;
  }

  /**
   * Returns used virtual disk space size in bytes.
   */
  getUsedDiskSpace(): number {
    return Array.from(this.disk.values()).reduce(
      (total, buffer) => total + buffer.byteLength,
      0
    );
  }

  /**
   * Returns free virtual disk space in bytes.
   */
  getFreeDiskSpace(): number {
    if (Number.isFinite(this.diskSize)) {
      return this.diskSize - this.getUsedDiskSpace();
    }
    return Infinity;
  }

  /**
   * Clears all file system records and virtual disk.
   */
  purge() {
    this.disk.clear();
    this.registry.clear();
    this.registry.set("", { type: "dir", fullPath: "" });
  }

  /**
   * Allocates disk space for new file.
   *
   * @param descriptor
   * @private
   */
  private allocateFile(descriptor: FileDescriptor) {
    const freeSpace = this.getFreeDiskSpace();
    if (descriptor.size > freeSpace) {
      throw new RangeError(
        `Not enough free space. Requested file size: ${descriptor.size} bytes; Free disk space: ${freeSpace} bytes.`
      );
    }
    const buffer = new ArrayBuffer(descriptor.size);
    this.disk.set(descriptor, buffer);
    descriptor.lastModified = Date.now();
  }
}
