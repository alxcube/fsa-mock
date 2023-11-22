import type { FileSystem, FileDescriptor } from "../file-system";
import { appendNullBytes, concatArrayBuffers, copyArrayBuffer } from "../utils";

/**
 * SyncAccessHandle mock. Also used in WritableFileStreamSink.
 */
export class SyncAccessHandle {
  /**
   * Temp file data.
   * @private
   */
  private tempFile: ArrayBuffer;

  /**
   * Handle state.
   * @private
   */
  private state: "open" | "closed";

  /**
   * File cursor.
   * @private
   */
  private cursor: number;

  /**
   * SyncAccessHandle constructor.
   *
   * @param fileDescriptor
   * @param fileSystem
   * @param keepContent Flag to copy existing file content in temp file.
   */
  constructor(
    private fileDescriptor: FileDescriptor,
    private fileSystem: FileSystem,
    keepContent = false
  ) {
    this.state = "open";
    this.tempFile = new ArrayBuffer(keepContent ? this.fileDescriptor.size : 0);
    this.cursor = 0;
    if (keepContent) {
      copyArrayBuffer(
        this.fileSystem.readFile(this.fileDescriptor),
        this.tempFile
      );
    }
  }

  /**
   * Closes an open synchronous file handle, disabling any further operations on it.
   */
  close() {
    if (this.state === "closed") {
      return;
    }
    this.state = "closed";
    return;
  }

  /**
   * Persists any changes made to the file associated with the handle via the write() method to disk.
   */
  flush() {
    this.ensureNotClosed();
    this.fileSystem.writeFile(this.fileDescriptor, this.tempFile);
  }

  /**
   * Returns the size of the file associated with the handle in bytes.
   */
  getSize(): number {
    this.ensureNotClosed();
    return this.tempFile.byteLength;
  }

  /**
   * Reads the content of the file associated with the handle into a specified buffer, optionally at a given offset.
   *
   * @param buffer
   * @param options
   */
  read(
    buffer: ArrayBuffer | ArrayBufferView,
    options: { at?: number } = {}
  ): number {
    this.ensureNotClosed();
    const { at: readStart = this.cursor } = options;
    const fileSize = this.getSize();
    if (readStart < 0) {
      throw new TypeError("Negative reading offset is not supported");
    }
    if (readStart > this.getSize()) {
      this.cursor = this.getSize();
      return 0;
    }
    const targetBuffer = "buffer" in buffer ? buffer.buffer : buffer;
    let readEnd = readStart + targetBuffer.byteLength;
    if (readEnd > fileSize) {
      readEnd = fileSize;
    }
    const readBytes = copyArrayBuffer(this.tempFile, targetBuffer, {
      sourceStartOffset: readStart,
      sourceEndOffset: readEnd,
    });
    this.cursor = readStart + readBytes;
    return readBytes;
  }

  /**
   * Resizes the file associated with the handle to a specified number of bytes.
   *
   * @param bytesLength
   */
  truncate(bytesLength: number) {
    this.ensureNotClosed();
    if (bytesLength < 0) {
      throw new TypeError("Negative file size is not supported");
    }
    this.ensureHasFreeMemory(bytesLength);
    const oldSize = this.getSize();
    if (bytesLength > oldSize) {
      this.tempFile = appendNullBytes(this.tempFile, bytesLength - oldSize);
    } else {
      const newTempData = new ArrayBuffer(bytesLength);
      copyArrayBuffer(this.tempFile, newTempData, {
        sourceStartOffset: 0,
        sourceEndOffset: bytesLength,
      });
      this.tempFile = newTempData;
    }
    if (this.cursor > bytesLength) {
      this.cursor = bytesLength;
    }
  }

  /**
   * Writes the content of a specified buffer to the file associated with the handle, optionally at a given offset.
   *
   * @param buffer
   * @param options
   */
  write(
    buffer: ArrayBuffer | ArrayBufferView,
    options: { at?: number } = {}
  ): number {
    this.ensureNotClosed();
    const { at: writePosition = this.cursor } = options;
    if (writePosition < 0) {
      throw new TypeError("Negative writing offset is not supported");
    }
    const sourceBuffer = "buffer" in buffer ? buffer.buffer : buffer;
    let fileContents = this.tempFile;
    const oldSize = fileContents.byteLength;
    const bufferSize = sourceBuffer.byteLength;
    if (writePosition > oldSize) {
      this.tempFile = appendNullBytes(this.tempFile, writePosition - oldSize);
      fileContents = this.tempFile;
    }
    const fileContentsUint8 = new Uint8Array(fileContents);
    const head = fileContentsUint8.slice(0, writePosition);
    let tail = new Uint8Array(0);
    if (writePosition + bufferSize < oldSize) {
      const lastCount = oldSize - (writePosition + bufferSize);
      tail = fileContentsUint8.slice(fileContentsUint8.byteLength - lastCount);
    }

    const newSize = head.byteLength + bufferSize + tail.byteLength;
    this.ensureHasFreeMemory(newSize);

    this.tempFile = concatArrayBuffers([head, sourceBuffer, tail]);
    this.cursor = writePosition + bufferSize;

    return bufferSize;
  }

  /**
   * Throws 'InvalidStateError' DOMException if handle is closed.
   * @private
   */
  private ensureNotClosed() {
    if (this.state === "closed") {
      throw new DOMException(
        "FileSystemSyncAccessHandle is closed.",
        "InvalidStateError"
      );
    }
  }

  /**
   * Checks if there is enough free memory to contain given byteLength.
   *
   * @param byteLength
   * @private
   */
  private ensureHasFreeMemory(byteLength: number) {
    const oldFileSize = this.fileDescriptor.size;
    const freeSpace = this.fileSystem.getFreeDiskSpace() + oldFileSize;
    if (byteLength > freeSpace) {
      throw new DOMException("Not enough free space", "QuotaExceededError");
    }
  }
}
