import "@testing-library/jest-dom";
import { vi, beforeEach } from "vitest";
import * as api from "../src/api.js";

// Prevent background network calls to localhost:3000 from leaking into tests when dev server is running
beforeEach(() => {
  vi.spyOn(api, "fetchCategories").mockImplementation(async () => []);
});
