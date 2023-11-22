/**
 * FileSystemWritableFileStream mock.
 */
export class WritableFileStream
  extends WritableStream<FileSystemWriteChunkType>
  implements FileSystemWritableFileStream
{
  /**
   * {@inheritDoc}
   */
  seek(position: number): Promise<void> {
    return this.write({ type: "seek", position });
  }

  /**
   * {@inheritDoc}
   */
  truncate(size: number): Promise<void> {
    return this.write({ type: "truncate", size });
  }

  /**
   * {@inheritDoc}
   */
  async write(data: FileSystemWriteChunkType): Promise<void> {
    const writer = this.getWriter();
    await writer.ready;
    const result = await writer.write(data);
    writer.releaseLock();
    return result;
  }
}
