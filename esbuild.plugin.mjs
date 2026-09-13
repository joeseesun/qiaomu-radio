import esbuild from "esbuild";
import process from "node:process";

const production = !process.argv.includes("--watch");
const context = await esbuild.context({
  entryPoints: ["plugin-src/main.ts"],
  bundle: true,
  external: ["obsidian", "electron", "@codemirror/state", "@codemirror/view"],
  format: "cjs",
  target: "es2018",
  platform: "browser",
  outfile: "main.js",
  sourcemap: production ? false : "inline",
  treeShaking: true,
  minify: production,
  logLevel: "info",
});

if (production) {
  await context.rebuild();
  await context.dispose();
} else {
  await context.watch();
}
