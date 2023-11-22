/**
 * Splits path string into array of path segments.
 *
 * @param path
 */
export function pathSegments(path: string): string[] {
  return path.split(/[/\\]/g).filter((segment) => !!segment.length);
}

/**
 * Returns base name of path string.
 *
 * @param path
 */
export function basename(path: string): string {
  if (!path.length) {
    return "";
  }
  const segments = pathSegments(path);
  return segments[segments.length - 1];
}

/**
 * Returns parent path of given path or null if path is root path.
 *
 * @param path
 */
export function dirname(path: string): string | null {
  const segments = pathSegments(path);
  if (!segments.length) {
    return null;
  }
  segments.pop();
  return segments.join("/");
}

/**
 * Returns true if given 'subPath' is descendant of given 'path'.
 *
 * @param subPath
 * @param path
 */
export function isSubPath(subPath: string, path: string): boolean {
  if (path !== "") {
    path = path.replace(/\/+$/, "") + "/";
  }
  return subPath.startsWith(path);
}

/**
 * Returns relative path of given descendant 'subPath' to given ancestor 'path'.
 * Throws error if given subPath is not descendant of path.
 *
 * @param subPath
 * @param path
 */
export function relativePath(subPath: string, path: string): string {
  if (!isSubPath(subPath, path)) {
    throw new Error(`"${subPath}" is not sub-path of "${path}"`);
  }
  const subPathSegments = pathSegments(subPath);
  const parentPathSegments = pathSegments(path);
  return subPathSegments.slice(parentPathSegments.length).join("/");
}

/**
 * Returns true if given 'childPath' is actually child path of given 'path'.
 *
 * @param childPath
 * @param path
 */
export function isChildPath(childPath: string, path: string): boolean {
  if (!isSubPath(childPath, path)) {
    return false;
  }
  return relativePath(childPath, path).indexOf("/") < 0;
}

/**
 * Options of copyArrayBuffer() function.
 */
export interface CopyArrayBufferOptions {
  /**
   * Start offset (inclusive) of source buffer to copy bytes from.
   */
  sourceStartOffset?: number;
  /**
   * End offset (exclusive) of source buffer to copy bytes to.
   */
  sourceEndOffset?: number;
  /**
   * Start offset (inclusive) of destination buffer to put bytes sequence to.
   */
  destinationOffset?: number;
}

/**
 * Copies contents from one source ArrayBuffer to destination ArrayBuffer.
 *
 * @param source
 * @param destination
 * @param options
 */
export function copyArrayBuffer(
  source: ArrayBuffer,
  destination: ArrayBuffer,
  options: CopyArrayBufferOptions = {}
): number {
  const {
    sourceStartOffset = 0,
    sourceEndOffset = source.byteLength,
    destinationOffset = 0,
  } = options;

  if (sourceStartOffset < 0 || sourceStartOffset > source.byteLength) {
    throw new RangeError(
      "Option 'sourceStartOffset' must be between 0 and source ArrayBuffer's byte length."
    );
  }

  if (sourceEndOffset < sourceStartOffset) {
    throw new RangeError(
      "Option 'sourceEndOffset' must be greater than of equal option 'sourceStartOffset'"
    );
  }

  if (destinationOffset < 0 || destinationOffset > destination.byteLength) {
    throw new RangeError(
      "Option 'destinationOffset' must be between 0 and destination ArrayBuffer's byte length."
    );
  }

  const sourceView = new Uint8Array(source);
  const destinationView = new Uint8Array(destination);

  const bytesToWrite = sourceEndOffset - sourceStartOffset;
  const availableMemory = destinationView.byteLength - destinationOffset;
  const sliceEnd =
    bytesToWrite > availableMemory
      ? sourceEndOffset - (bytesToWrite - availableMemory)
      : sourceEndOffset;

  const chunk =
    sourceStartOffset || sliceEnd < source.byteLength
      ? sourceView.slice(sourceStartOffset, sliceEnd)
      : sourceView;

  destinationView.set(chunk, destinationOffset);
  return chunk.byteLength;
}

/**
 * Concatenates multiple BufferSource's into single ArrayBuffer.
 *
 * @param bufferSources
 */
export function concatArrayBuffers(bufferSources: BufferSource[]): ArrayBuffer {
  const buffers = bufferSources.map((source) =>
    "buffer" in source ? source.buffer : source
  );
  return buffers.reduce((concatenated, buffer) => {
    const targetBuffer = new ArrayBuffer(
      concatenated.byteLength + buffer.byteLength
    );
    copyArrayBuffer(concatenated, targetBuffer);
    copyArrayBuffer(buffer, targetBuffer, {
      destinationOffset: concatenated.byteLength,
    });
    return targetBuffer;
  }, new ArrayBuffer(0));
}

/**
 * Appends given count of NUL-bytes to the end of given ArrayBuffer and returns new ArrayBuffer.
 *
 * @param buffer
 * @param count
 */
export function appendNullBytes(
  buffer: ArrayBuffer,
  count: number
): ArrayBuffer {
  const nullBytes = new Uint8Array(count).fill(0x00);
  return concatArrayBuffers([buffer, nullBytes]);
}
