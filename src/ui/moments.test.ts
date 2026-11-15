import { beforeEach, expect, test, vi } from "vitest";
import { setSound } from "./moments.svelte";
import { play } from "./sound";

vi.mock("./sound", () => ({ play: vi.fn() }));

const playMock = vi.mocked(play);

beforeEach(() => playMock.mockClear());

test("switching sound on plays a chime right away", () => {
  setSound(true);
  expect(playMock).toHaveBeenCalledExactlyOnceWith("pass");
});

test("switching sound off stays quiet", () => {
  setSound(false);
  expect(playMock).not.toHaveBeenCalled();
});
