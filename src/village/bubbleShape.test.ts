import { expect, test } from "vitest";
import { pixelRoundRect, pixelTail } from "./bubbleShape";

test("a rounded rectangle steps each corner in by its insets, in world pixels", () => {
  expect(pixelRoundRect([2, 1], 3)).toBe(
    "polygon(3px 6px, 3px 3px, 6px 3px, 6px 0px, calc(100% - 6px) 0px, calc(100% - 6px) 3px, calc(100% - 3px) 3px, calc(100% - 3px) 6px, " +
      "calc(100% - 3px) calc(100% - 6px), calc(100% - 3px) calc(100% - 3px), calc(100% - 6px) calc(100% - 3px), calc(100% - 6px) calc(100% - 0px), " +
      "6px calc(100% - 0px), 6px calc(100% - 3px), 3px calc(100% - 3px), 3px calc(100% - 6px))",
  );
});

test("the tail narrows by one pixel per row down to its tip", () => {
  expect(pixelTail(2, 2)).toBe("polygon(0 0, 4px 0, 4px 2px, 2px 2px, 2px 4px, 0px 4px, 0 4px)");
});
