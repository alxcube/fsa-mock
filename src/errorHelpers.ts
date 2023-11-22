/**
 * Throws 'AbortError' DOMException.
 *
 * @param message
 */
export function throwAbortError(
  message = "The user aborted a request."
): never {
  throw new DOMException(message, "AbortError");
}

/**
 * Throws 'NotAllowedError' DOMException.
 *
 * @param message
 */
export function throwNotAllowedError(
  message = "The request is not allowed by the user agent or the platform in the current context."
): never {
  throw new DOMException(message, "NotAllowedError");
}

/**
 * throws 'NotAllowedError' DOMException for given FileSystemPermissionMode.
 *
 * @param mode
 */
export function throwNotAllowedPermissionMode(
  mode: FileSystemPermissionMode
): never {
  throwNotAllowedError(`No '${mode}' permission.`);
}

/**
 * Throws 'NotFoundError' DOMException.
 *
 * @param message
 */
export function throwNotFoundError(
  message = "A requested file or directory could not be found at the time an operation was processed."
): never {
  throw new DOMException(message, "NotFoundError");
}

/**
 * Throws 'TypeMismatchError' DOMException.
 *
 * @param message
 */
export function throwTypeMismatchError(
  message = "The path supplied exists, but was not an entry of requested type."
): never {
  throw new DOMException(message, "TypeMismatchError");
}
