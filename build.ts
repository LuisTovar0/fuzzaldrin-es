import fs from "fs";

await Bun.build({
  entrypoints: ['./src/index.ts'],
  format: "esm",
  splitting: true,
  outdir: "dist/esm",
  sourcemap: "linked",
});

import { name, version, homepage, repository, type } from "./package.json";
const packageJson = {
  name, version, homepage, repository, type,
  module: "./esm",
  exports: {
    ".": {
      types: "./types",
      default: "./esm"
    }
  },
};
fs.writeFileSync("dist/package.json", JSON.stringify(packageJson, null, 2));