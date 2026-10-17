import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// vitest globals are off, so Testing Library can't register its own
// automatic cleanup - without this every render() piles onto the last.
afterEach(cleanup);
