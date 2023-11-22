/**
 * Interface of file system entry name validator.
 */
export interface EntryNameValidator {
  /**
   * Returns boolean validation result of file system entry name.
   *
   * @param name Entry base name (not full path).
   * @param isFileName Boolean indicating that name is file name (not directory name).
   */
  isValidName(name: string, isFileName: boolean): boolean;
}
