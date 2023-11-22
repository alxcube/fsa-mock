import { beforeEach, describe, it, expect, vi } from "vitest";
import { Permission } from "../../../src";

describe("Permission class", () => {
  let permission: Permission;

  beforeEach(() => {
    permission = new Permission("prompt", "prompt");
  });

  describe("setRead(), getRead() methods", () => {
    it("should set 'read' permission value and call subscribed callbacks with new value if it differs from previous value", () => {
      permission.setRead("prompt");
      expect(permission.getRead()).toBe("prompt");

      const spy = vi.fn();
      permission.subscribe("read", spy);

      permission.setRead("denied");
      expect(permission.getRead()).toBe("denied");
      expect(spy).toHaveBeenCalledWith("denied");

      spy.mockReset();
      permission.setRead("denied");
      expect(permission.getRead()).toBe("denied");
      expect(spy).not.toHaveBeenCalled();

      spy.mockReset();
      permission.setRead("granted");
      expect(permission.getRead()).toBe("granted");
      expect(spy).toHaveBeenCalledWith("granted");
    });

    it("should also call setReadwrite() with same state when state other than 'granted' was passed and is different from 'readwrite' state", () => {
      permission.setRead("granted");
      permission.setReadwrite("granted");

      const spy = vi.spyOn(permission, "setReadwrite");
      permission.setRead("prompt");
      expect(spy).toHaveBeenCalledWith("prompt");

      spy.mockClear();
      permission.setRead("denied");
      expect(spy).toHaveBeenCalledWith("denied");

      spy.mockClear();
      permission.setRead("granted");
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe("setReadwrite(), getReadwrite() methods", () => {
    it("should set 'readwrite' permission value and call subscribed callbacks when new value differs from previous value", () => {
      permission.setReadwrite("prompt");
      expect(permission.getReadwrite()).toBe("prompt");

      const spy = vi.fn();
      permission.subscribe("readwrite", spy);

      permission.setReadwrite("denied");
      expect(permission.getReadwrite()).toBe("denied");
      expect(spy).toHaveBeenCalledWith("denied");

      spy.mockClear();
      permission.setReadwrite("denied");
      expect(permission.getReadwrite()).toBe("denied");
      expect(spy).not.toHaveBeenCalled();

      permission.setReadwrite("granted");
      expect(permission.getReadwrite()).toBe("granted");
      expect(spy).toHaveBeenCalledWith("granted");
    });

    it("should also call setRead() method when permission is set to 'granted'", () => {
      const spy = vi.spyOn(permission, "setRead");

      permission.setReadwrite("granted");
      expect(spy).toHaveBeenCalledWith("granted");

      spy.mockClear();
      permission.setReadwrite("prompt");
      expect(spy).not.toHaveBeenCalled();

      spy.mockClear();
      permission.setReadwrite("denied");
      expect(spy).not.toHaveBeenCalled();

      permission.setReadwrite("granted");
      expect(spy).toHaveBeenCalledWith("granted");
    });
  });

  describe("get() method", () => {
    it("should call getRead() or getReadwrite() method, depending on 'mode' argument value", () => {
      const getReadSpy = vi.spyOn(permission, "getRead");
      const getReadWriteSpy = vi.spyOn(permission, "getReadwrite");
      permission.setRead("granted");
      permission.setReadwrite("prompt");

      expect(permission.get("read")).toBe("granted");
      expect(getReadSpy).toHaveBeenCalled();
      expect(getReadWriteSpy).not.toHaveBeenCalled();

      getReadSpy.mockClear();
      getReadWriteSpy.mockClear();

      expect(permission.get("readwrite")).toBe("prompt");
      expect(getReadSpy).not.toHaveBeenCalled();
      expect(getReadWriteSpy).toHaveBeenCalled();
    });
  });

  describe("set() method", () => {
    it("should call setRead() or setReadwrite() method, depending on 'mode' argument value", () => {
      // set initial values to not triggering other permissions change
      permission.setReadwrite("prompt");
      permission.setRead("prompt");

      const setReadSpy = vi.spyOn(permission, "setRead");
      const setReadwriteSpy = vi.spyOn(permission, "setReadwrite");

      permission.set("read", "granted");
      expect(setReadSpy).toHaveBeenCalledWith("granted");
      expect(setReadwriteSpy).not.toHaveBeenCalled();

      setReadSpy.mockClear();
      setReadwriteSpy.mockClear();

      permission.set("readwrite", "denied");
      expect(setReadwriteSpy).toHaveBeenCalledWith("denied");
      expect(setReadSpy).not.toHaveBeenCalled();
    });
  });

  describe("subscribe(), unsubscribe() methods", () => {
    it("should subscribe callback to permission updates, and unsubscribe callback", () => {
      const readCallback = vi.fn();
      const readwriteCallback = vi.fn();
      const clearMocks = () => {
        readCallback.mockClear();
        readwriteCallback.mockClear();
      };
      permission.setReadwrite("prompt");
      permission.setRead("prompt");

      permission.subscribe("read", readCallback);
      permission.subscribe("readwrite", readwriteCallback);

      permission.setRead("prompt");
      permission.setReadwrite("prompt");
      // callbacks shouldn't be called because permission hadn't changed
      expect(readCallback).not.toHaveBeenCalled();
      expect(readwriteCallback).not.toHaveBeenCalled();

      permission.setReadwrite("granted");
      // both callbacks should be called since granting 'readwrite' grants 'read'
      expect(readCallback).toHaveBeenCalledWith("granted");
      expect(readwriteCallback).toHaveBeenCalledWith("granted");
      clearMocks();

      permission.setRead("denied");
      // both callbacks should be called since denying 'read' denies 'readwrite'
      expect(readCallback).toHaveBeenCalledWith("denied");
      expect(readwriteCallback).toHaveBeenCalledWith("denied");
      clearMocks();

      permission.setRead("granted");
      expect(readCallback).toHaveBeenCalledWith("granted");
      expect(readwriteCallback).not.toHaveBeenCalled();
      clearMocks();

      permission.setReadwrite("granted");
      // 'read' permission is already granted, so it's callback shouldn't be called.
      expect(readwriteCallback).toHaveBeenCalledWith("granted");
      expect(readCallback).not.toHaveBeenCalled();
      clearMocks();

      permission.unsubscribe("read", readCallback);
      permission.unsubscribe("readwrite", readwriteCallback);

      permission.setRead("denied");
      // callbacks are unsubscribed, so they shouldn't be called
      expect(readCallback).not.toHaveBeenCalled();
      expect(readwriteCallback).not.toHaveBeenCalled();
    });

    it("should support multiple subscribers", () => {
      const spy1 = vi.fn();
      const spy2 = vi.fn();
      const clearMocks = () => {
        spy1.mockClear();
        spy2.mockClear();
      };

      permission.subscribe("read", spy1);
      permission.subscribe("read", spy2);

      permission.setRead("denied");
      expect(spy1).toHaveBeenCalledWith("denied");
      expect(spy2).toHaveBeenCalledWith("denied");
      clearMocks();

      permission.setRead("prompt");
      expect(spy1).toHaveBeenCalledWith("prompt");
      expect(spy2).toHaveBeenCalledWith("prompt");
      clearMocks();

      permission.unsubscribe("read", spy1);
      permission.setRead("granted");
      expect(spy1).not.toHaveBeenCalled();
      expect(spy2).toHaveBeenCalledWith("granted");
    });
  });
});
