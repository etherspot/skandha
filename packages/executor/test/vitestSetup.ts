import { vi } from "vitest";
import { GethTracer } from "./mocks";

vi.mock('../src/services/UserOpValidation/GethTracer.ts', async () => {
  return {
    GethTracer: GethTracer,
  };
});