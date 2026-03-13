import { readFile, writeFile } from "node:fs/promises";

const nextAdapterPath = new URL("../dist/adapters/next-router.js", import.meta.url);
const clientDirective = '"use client";\n';

const source = await readFile(nextAdapterPath, "utf8");
const withoutExistingDirective = source.replace(/^(?:"use client";\s*)+/, "");

await writeFile(nextAdapterPath, `${clientDirective}${withoutExistingDirective}`);
