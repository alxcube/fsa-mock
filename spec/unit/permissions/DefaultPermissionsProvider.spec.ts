import { describe, it, expect } from "vitest";
import {
  DefaultPermissionsProvider,
  PermissionResolvedState,
} from "../../../src";

describe("DefaultPermissionsProvider class", () => {
  const createProvider = (
    read?: PermissionState,
    readwrite?: PermissionState,
    resolveTo?: PermissionResolvedState
  ) => new DefaultPermissionsProvider(read, readwrite, resolveTo);

  describe("initial() method", () => {
    it("should return 'prompt' for 'read' mode and 'prompt' for 'readwrite' mode when constructor args wasn't passed", () => {
      const provider = createProvider();
      expect(provider.initial()).toEqual({
        read: "prompt",
        readwrite: "prompt",
      });
    });

    it("should return permissions passed to constructor", () => {
      const denyAll = createProvider("denied", "denied");
      const promptAll = createProvider("prompt", "prompt");
      const grantAll = createProvider("granted", "granted");

      expect(denyAll.initial()).toEqual({
        read: "denied",
        readwrite: "denied",
      });
      expect(promptAll.initial()).toEqual({
        read: "prompt",
        readwrite: "prompt",
      });
      expect(grantAll.initial()).toEqual({
        read: "granted",
        readwrite: "granted",
      });
    });
  });

  describe("prompt() method", () => {
    it("should return 'granted' when constructor args wasn't passed", () => {
      const provider = createProvider();
      expect(provider.prompt()).toBe("granted");
    });

    it("should return same value as was passed to constructor's 'resolveTo' argument", () => {
      const denyAll = createProvider("prompt", "prompt", "denied");
      const grantAll = createProvider("prompt", "prompt", "granted");

      expect(denyAll.prompt()).toBe("denied");
      expect(grantAll.prompt()).toBe("granted");
    });
  });
});
