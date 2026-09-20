import { describe, expect, it } from "vitest";
import {
  canDeleteMedia,
  facingModeForKind,
  isMediaEntityType,
  isMediaKind,
  isSafeMediaFileName,
  mediaFileUrl,
  thumbKindForMedia,
} from "@/lib/media";

describe("media helpers", () => {
  it("validates kinds and entity types", () => {
    expect(isMediaKind("PRODUCT")).toBe(true);
    expect(isMediaKind("VIDEO")).toBe(false);
    expect(isMediaEntityType("Store")).toBe(true);
    expect(isMediaEntityType("StockMovement")).toBe(true);
    expect(isMediaEntityType("StockAudit")).toBe(true);
    expect(isMediaEntityType("StockTransfer")).toBe(true);
    expect(isMediaEntityType("Foo")).toBe(false);
  });

  it("picks facing mode and thumb shape by kind", () => {
    expect(facingModeForKind("EMPLOYEE")).toBe("user");
    expect(facingModeForKind("STORE")).toBe("environment");
    expect(thumbKindForMedia("EMPLOYEE")).toBe("person");
    expect(thumbKindForMedia("STOCK")).toBe("stock");
  });

  it("builds safe file urls and rejects path traversal names", () => {
    const name = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee.jpg";
    expect(isSafeMediaFileName(name)).toBe(true);
    expect(isSafeMediaFileName("../etc/passwd")).toBe(false);
    expect(mediaFileUrl(name)).toBe(`/api/media/file/${name}`);
  });

  it("gates delete to admin or capturer", () => {
    expect(
      canDeleteMedia({
        role: "ADMIN",
        userId: "u1",
        capturedById: "u2",
      }),
    ).toBe(true);
    expect(
      canDeleteMedia({
        role: "FIELD_DELEGATE",
        userId: "u1",
        capturedById: "u1",
      }),
    ).toBe(true);
    expect(
      canDeleteMedia({
        role: "FIELD_DELEGATE",
        userId: "u1",
        capturedById: "u2",
      }),
    ).toBe(false);
  });
});
