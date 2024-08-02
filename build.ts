import fs from "fs";

await Bun.build({
  entrypoints: ['./src/index.ts'],
  format: "esm",
  splitting: true,
  outdir: "dist/esm",
  sourcemap: "linked",
});

fs.copyFileSync("./package.json", "dist/package.json");
fs.copyFileSync("./README.md", "dist/README.md");
fs.copyFileSync("./LICENSE", "dist/LICENSE");
fs.cpSync("./src", "dist/src", { recursive: true });