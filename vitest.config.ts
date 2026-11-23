import { defineConfig } from "vitest/config";

// Configuration de test séparée : les tests portent sur des fonctions pures (pas de DOM).
export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});
