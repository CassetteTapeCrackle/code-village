import { test as base, expect } from "@playwright/test";
import { finishTour } from "./helpers";

// Every spec but the tour's own gets a page whose tour is already over, so its card and tips never cover a
// target or add a dialog. e2e/tour.spec.ts imports test from @playwright/test to keep the first visit.
export const test = base.extend({
  page: async ({ page }, use) => {
    await finishTour(page);
    await use(page);
  },
});

export { expect };
