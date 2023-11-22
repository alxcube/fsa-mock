import { WritableFileStream } from "./WritableFileStream";
import type { FileDescriptor } from "../file-system";
import type { WritableFileStreamSinkFactory } from "./WritableFileStreamSinkFactory";

/**
 * WritableFileStream factory class.
 */
export class WritableFileStreamFactory {
  /**
   * WritableFileStreamFactory constructor.
   *
   * @param sinkFactory
   */
  constructor(private sinkFactory: WritableFileStreamSinkFactory) {}

  /**
   * Creates new WritableFileStream instance.
   *
   * @param descriptor
   * @param keepContent
   */
  create(descriptor: FileDescriptor, keepContent = false): WritableFileStream {
    return new WritableFileStream(
      this.sinkFactory.create(descriptor, keepContent)
    );
  }
}
