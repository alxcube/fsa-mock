import { beforeEach, describe, it, expect, vi } from "vitest";
import {
  FileDescriptor,
  FileSystem,
  PermissionsManager,
  DefaultPermissionsProvider,
  FileSystemPermissionStatus,
} from "../../../src";

describe("PermissionsManager class", () => {
  let fs: FileSystem;
  let permissionsProvider: DefaultPermissionsProvider;
  let manager: PermissionsManager;
  let descriptor: FileDescriptor;
  const path = "path/to/file.txt";

  beforeEach(() => {
    fs = new FileSystem();
    permissionsProvider = new DefaultPermissionsProvider();
    manager = new PermissionsManager(fs, permissionsProvider);
    descriptor = fs.createFile(path);
  });

  describe("getStatus() method", () => {
    it("should return FileSystemPermissionStatus instance", () => {
      const status = manager.getStatus(descriptor.fullPath, "readwrite");
      expect(status).toBeInstanceOf(FileSystemPermissionStatus);
    });

    it("should throw TypeError when given path is invalid", () => {
      fs.remove(descriptor.fullPath);
      expect(() => manager.getStatus(descriptor.fullPath, "read")).toThrow(
        TypeError
      );
    });

    it("should throw TypeError when mode is neither 'read' nor 'readwrite'", () => {
      expect(() =>
        manager.getStatus(
          descriptor.fullPath,
          "write" as FileSystemPermissionMode
        )
      ).toThrow(TypeError);
    });
  });

  describe("setState() method", () => {
    it("should set permission state for given path", () => {
      const read = manager.getStatus(descriptor.fullPath, "read");
      const readWrite = manager.getStatus(descriptor.fullPath, "readwrite");
      expect(read.state).toBe("prompt");
      expect(readWrite.state).toBe("prompt");

      manager.setState(descriptor.fullPath, "readwrite", "denied");
      expect(read.state).toBe("prompt");
      expect(readWrite.state).toBe("denied");

      manager.setState(descriptor.fullPath, "read", "granted");
      expect(read.state).toBe("granted");
    });

    it("should also update descendant permissions", () => {
      const ancestorDescriptor = fs.getDirectoryDescriptor("path")!;
      const parentDescriptor = fs.getDirectoryDescriptor("path/to")!;
      const status = manager.getStatus(descriptor.fullPath, "readwrite");
      const parentStatus = manager.getStatus(
        parentDescriptor.fullPath,
        "readwrite"
      );
      const ancestorStatus = manager.getStatus(
        ancestorDescriptor.fullPath,
        "readwrite"
      );

      expect(status.state).toBe("prompt");
      expect(parentStatus.state).toBe("prompt");
      expect(ancestorStatus.state).toBe("prompt");

      manager.setState(ancestorDescriptor.fullPath, "readwrite", "granted");

      expect(status.state).toBe("granted");
      expect(parentStatus.state).toBe("granted");
      expect(ancestorStatus.state).toBe("granted");
    });

    it("should throw TypeError when given descriptor is invalid", () => {
      fs.remove(descriptor.fullPath);
      expect(() =>
        manager.setState(descriptor.fullPath, "read", "prompt")
      ).toThrow(TypeError);
    });

    it("should throw TypeError when mode is neither 'read' nor 'readwrite'", () => {
      expect(() =>
        manager.setState(
          descriptor.fullPath,
          "write" as FileSystemPermissionMode,
          "prompt"
        )
      ).toThrow(TypeError);
    });
  });

  describe("requestPermission() method", () => {
    it("should return promise of PermissionState", async () => {
      const state = await manager.requestPermission(
        descriptor.fullPath,
        "readwrite"
      );
      expect(["denied", "granted", "prompt"].includes(state)).toBe(true);
    });

    it("should call permissionProvider's prompt method", async () => {
      const spy = vi.spyOn(permissionsProvider, "prompt");
      await manager.requestPermission(descriptor.fullPath, "readwrite");
      expect(spy).toHaveBeenCalledWith("readwrite", fs, descriptor.fullPath);
    });

    it("should call onPrompt callback instead permissionsProvider.prompt() when callback was set", async () => {
      const callback = vi.fn();
      const promptSpy = vi.spyOn(permissionsProvider, "prompt");
      manager.setPromptPermissionProvider(callback);
      await manager.requestPermission(descriptor.fullPath, "readwrite");
      expect(callback).toHaveBeenCalledWith(
        "readwrite",
        fs,
        descriptor.fullPath
      );
      expect(promptSpy).not.toHaveBeenCalled();
    });

    it("should not call prompt provider at all if current permission is not 'prompt'", async () => {
      manager.setState(descriptor.fullPath, "read", "granted");
      const spy = vi.spyOn(permissionsProvider, "prompt");
      await manager.requestPermission(descriptor.fullPath, "read");
      expect(spy).not.toHaveBeenCalled();
    });

    it("should also update permissions in descendant paths", async () => {
      const ancestorDescriptor = fs.getDirectoryDescriptor("path")!;
      const parentDescriptor = fs.getDirectoryDescriptor("path/to")!;
      const status = manager.getStatus(descriptor.fullPath, "readwrite");
      const parentStatus = manager.getStatus(
        parentDescriptor.fullPath,
        "readwrite"
      );
      const ancestorStatus = manager.getStatus(
        ancestorDescriptor.fullPath,
        "readwrite"
      );

      expect(status.state).toBe("prompt");
      expect(parentStatus.state).toBe("prompt");
      expect(ancestorStatus.state).toBe("prompt");

      manager.setPromptPermissionProvider(() => "denied");

      await manager.requestPermission(ancestorDescriptor.fullPath, "readwrite");

      expect(status.state).toBe("denied");
      expect(parentStatus.state).toBe("denied");
      expect(ancestorStatus.state).toBe("denied");
    });

    it("should reject with TypeError when given path is invalid", () => {
      fs.remove(descriptor.fullPath);
      expect(() =>
        manager.requestPermission(descriptor.fullPath, "read")
      ).rejects.toThrow(TypeError);
    });

    it("should reject with TypeError when mode is neither 'read' nor 'readwrite'", () => {
      expect(() =>
        manager.requestPermission(
          descriptor.fullPath,
          "write" as FileSystemPermissionMode
        )
      ).rejects.toThrow(TypeError);
    });
  });

  describe("setPromptPermissionProvider() method", () => {
    it("should set callback which will be called when permission is prompted", async () => {
      manager.setState(descriptor.fullPath, "read", "prompt");
      expect(manager.getStatus(descriptor.fullPath, "read").state).toBe(
        "prompt"
      );
      expect(manager.getStatus(descriptor.fullPath, "readwrite").state).toBe(
        "prompt"
      );

      manager.setPromptPermissionProvider((mode) =>
        mode === "read" ? "granted" : "denied"
      );
      expect(await manager.requestPermission(descriptor.fullPath, "read")).toBe(
        "granted"
      );
      expect(
        await manager.requestPermission(descriptor.fullPath, "readwrite")
      ).toBe("denied");
    });

    it("should accept callback that returns Promise", async () => {
      manager.setState(descriptor.fullPath, "readwrite", "prompt");
      const onPrompt = vi.fn(
        () =>
          new Promise<"denied">((resolve) =>
            setTimeout(() => resolve("denied"), 0)
          )
      );
      manager.setPromptPermissionProvider(onPrompt);
      expect(
        await manager.requestPermission(descriptor.fullPath, "readwrite")
      ).toBe("denied");
      expect(onPrompt).toHaveBeenCalled();
    });
  });

  describe("duplicate() method", () => {
    it("should copy permissions from one path to another", () => {
      const descriptor2 = fs.createFile("path/to/another/file.txt");
      manager.setState(descriptor.fullPath, "read", "granted");
      manager.setState(descriptor.fullPath, "readwrite", "granted");
      manager.setState(descriptor2.fullPath, "read", "denied");
      manager.setState(descriptor2.fullPath, "readwrite", "denied");

      manager.duplicate(descriptor.fullPath, descriptor2.fullPath);

      expect(manager.getState(descriptor2.fullPath, "read")).toBe("granted");
      expect(manager.getState(descriptor2.fullPath, "readwrite")).toBe(
        "granted"
      );
    });
  });
});
