import type { SyncAccessHandle } from "./SyncAccessHandle";
import type { FileDescriptor } from "../file-system";
import type { PermissionsManager } from "../permissions";

/**
 * UnderlyingSink implementation for WritableFileStream class.
 */
export class WritableFileStreamSink
  implements UnderlyingSink<FileSystemWriteChunkType>
{
  /**
   * Text encoder.
   * @private
   */
  private textEncoder: TextEncoder;

  /**
   * File cursor.
   * @private
   */
  private cursor: number;

  /**
   * Actual file size.
   * @private
   */
  private fileSize: number;

  /**
   * Closed state flag.
   * @private
   */
  private isClosed = false;

  /**
   * Error state.
   * @private
   */
  private error?: unknown;

  /**
   * WritableFileStreamSink constructor.
   *
   * @param syncAccessHandle
   * @param descriptor
   * @param permissionsManager
   */
  constructor(
    private syncAccessHandle: SyncAccessHandle,
    private descriptor: FileDescriptor,
    private permissionsManager: PermissionsManager
  ) {
    this.textEncoder = new TextEncoder();
    this.cursor = 0;
    this.fileSize = this.syncAccessHandle.getSize();
  }

  /**
   * Writes content into the file at the current file cursor offset.
   *
   * @param chunk
   */
  async write(chunk: FileSystemWriteChunkType): Promise<void> {
    this.ensureNotInErrorState();
    this.ensureNotClosed("Cannot write to a CLOSED writable stream");
    this.ensureHasWritePermission();

    try {
      const writeParams = this.convertToWriteParams(chunk);

      this.validateWriteCommand(writeParams);

      switch (writeParams.type) {
        case "write": {
          const position =
            "position" in writeParams
              ? this.prepareSeekPosition(writeParams.position)
              : undefined;
          return this.doWrite(writeParams.data, position);
        }
        case "seek":
          return this.doSeek(this.prepareSeekPosition(writeParams.position));
        case "truncate":
          return this.doTruncate(this.prepareTruncateSize(writeParams.size));
      }
    } catch (e) {
      this.error = e;
      throw e;
    }
  }

  /**
   * Closes stream for further operations and flushes written data to disk.
   */
  async close(): Promise<void> {
    this.ensureNotClosed("Cannot close a CLOSED writable stream");
    this.ensureHasWritePermission();
    if (this.error) {
      throw new TypeError("Cannot close a ERRORED writable stream");
    }
    this.isClosed = true;
    this.syncAccessHandle.flush();
    this.syncAccessHandle.close();
  }

  /**
   * Aborts the stream, signaling that the producer can no longer successfully write to the stream and it is to be
   * immediately moved to an error state.
   *
   * @param reason
   */
  async abort(reason: unknown): Promise<void> {
    this.syncAccessHandle.close();
    this.error = reason;
  }

  /**
   * Converts data chunk to object in WriteParams form.
   *
   * @param chunk
   * @private
   */
  private convertToWriteParams(chunk: FileSystemWriteChunkType): WriteParams {
    if (chunk instanceof Blob || typeof chunk === "string") {
      return { type: "write", data: chunk };
    }
    if (typeof chunk === "object" && "type" in chunk) {
      return chunk;
    }
    return { type: "write", data: chunk };
  }

  /**
   * Performs data writing.
   *
   * @param data
   * @param position
   * @private
   */
  private async doWrite(
    data: BufferSource | Blob | string | unknown,
    position = this.cursor
  ) {
    const buffer = await this.convertToArrayBuffer(data);
    if (buffer.byteLength + position > this.fileSize) {
      this.doTruncate(buffer.byteLength + position);
    }
    const bytesWritten = this.syncAccessHandle.write(buffer, { at: position });
    this.cursor = position + bytesWritten;
  }

  /**
   * Performs truncation.
   *
   * @param size
   * @private
   */
  private doTruncate(size: number) {
    this.syncAccessHandle.truncate(size);
    if (size < this.cursor) {
      this.cursor = size;
    }
    this.fileSize = size;
  }

  /**
   * Changes file cursor position.
   *
   * @param position
   * @private
   */
  private doSeek(position: number) {
    this.cursor = position;
  }

  /**
   * Returns ArrayBuffer of given data.
   *
   * @param data
   * @private
   */
  private async convertToArrayBuffer(
    data: BufferSource | Blob | string | unknown
  ): Promise<ArrayBuffer> {
    if (data instanceof Blob) {
      return data.arrayBuffer();
    }
    if (typeof data === "string") {
      return this.textEncoder.encode(data).buffer;
    }
    if (
      typeof data === "object" &&
      data !== null &&
      "buffer" in data &&
      data.buffer instanceof ArrayBuffer
    ) {
      return data.buffer;
    }
    if (data instanceof ArrayBuffer) {
      return data;
    }
    return this.textEncoder.encode(String(data)).buffer;
  }

  /**
   * Casts argument to valid truncate() size argument.
   *
   * @param size
   * @private
   */
  private prepareTruncateSize(size: unknown): number {
    const numSize = Number(size);
    if (Number.isNaN(numSize)) {
      return 0;
    }
    return Math.max(0, numSize);
  }

  /**
   * Casts argument to valid seek() position argument.
   *
   * @param position
   * @private
   */
  private prepareSeekPosition(position: unknown): number {
    return this.prepareTruncateSize(position);
  }

  /**
   * Throws 'NotAllowedError' DOMException if there's no granted readwrite permission for current file.
   * @private
   */
  private ensureHasWritePermission() {
    if (
      this.permissionsManager.getStatus(this.descriptor.fullPath, "readwrite")
        .state !== "granted"
    ) {
      throw new DOMException(
        "The request is not allowed by the user agent or the platform in the current context.",
        "NotAllowedError"
      );
    }
  }

  /**
   * Checks if given object is in valid WriteParams form.
   *
   * @param command
   * @private
   */
  private validateWriteCommand(command: WriteParams) {
    if (command.type === "write") {
      if (command.data === undefined || command.data === null) {
        this.throwInvalidParams("write", "data");
      }
    } else if (command.type === "truncate") {
      if (command.size === undefined || command.size === null) {
        this.throwInvalidParams("truncate", "size");
      }
    } else if (command.type === "seek") {
      if (command.position === undefined || command.position === null) {
        this.throwInvalidParams("seek", "position");
      }
    } else {
      throw new TypeError(
        `Failed to execute 'write' on 'FileSystemWritableFileStream': Failed to read the 'type' property from 'WriteParams': The provided value '${command.type}' is not a valid enum value of type WriteCommandType.`
      );
    }
  }

  /**
   * Throws TypeError.
   *
   * @param commandName
   * @param argName
   * @private
   */
  private throwInvalidParams(commandName: string, argName: string): never {
    throw new TypeError(
      `Failed to execute 'write' on 'UnderlyingSinkBase': Invalid params passed. ${commandName} requires a ${argName} argument`
    );
  }

  /**
   * Throws TypeError if stream is in closed state.
   *
   * @param message
   * @private
   */
  private ensureNotClosed(message: string) {
    if (this.isClosed) {
      throw new TypeError(message);
    }
  }

  /**
   * Throws remembered error if stream is in error state.
   * @private
   */
  private ensureNotInErrorState() {
    if (this.error) {
      throw this.error;
    }
  }
}
