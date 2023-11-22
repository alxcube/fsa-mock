import { beforeEach, describe, it, expect, vi } from "vitest";
import { FileSystemPermissionStatus, Permission } from "../../../src";

describe("FileSystemPermissionStatus class", () => {
  let permission: Permission;
  let status: FileSystemPermissionStatus;
  const mode = "readwrite";

  beforeEach(() => {
    permission = new Permission("prompt", "prompt");
    status = new FileSystemPermissionStatus(permission, mode);
  });

  describe("'name' property", () => {
    it("should be 'file-system", () => {
      expect(status.name).toBe("file-system");
    });
  });

  describe("'state' property", () => {
    it("should be same as underlying permission state", () => {
      permission.set(mode, "denied");
      expect(status.state).toBe("denied");
      permission.set(mode, "prompt");
      expect(status.state).toBe("prompt");
      permission.set(mode, "granted");
      expect(status.state).toBe("granted");
    });
  });

  describe("'onchange' property", () => {
    it("should receive callback which will be called whenever state of underlying permission changes", () => {
      const spy = vi.fn();
      status.onchange = spy;
      permission.set(mode, "granted");
      expect(spy).toHaveBeenCalledWith(expect.any(Event));
      spy.mockClear();

      permission.set(mode, "denied");
      expect(spy).toHaveBeenCalledWith(expect.any(Event));
      spy.mockClear();

      status.onchange = null;
      permission.set(mode, "granted");
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe("'change' event", () => {
    it("should be triggered whenever underlying permission state changes", () => {
      const spy = vi.fn();
      status.addEventListener("change", spy);
      permission.set(mode, "granted");
      expect(spy).toHaveBeenCalledWith(expect.any(Event));
      spy.mockClear();

      permission.set(mode, "denied");
      expect(spy).toHaveBeenCalledWith(expect.any(Event));
      spy.mockClear();

      status.removeEventListener("change", spy);
      permission.set(mode, "granted");
      expect(spy).not.toHaveBeenCalled();
    });
  });
});
