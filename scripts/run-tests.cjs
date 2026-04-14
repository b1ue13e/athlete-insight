const fs = require("fs");
const path = require("path");
const Module = require("module");
const ts = require("typescript");

const rootDir = process.cwd();
const testsDir = path.join(rootDir, "tests");
const filter = process.argv[2] || "";

const originalResolveFilename = Module._resolveFilename;
Module._resolveFilename = function resolveFilename(request, parent, isMain, options) {
  if (request.startsWith("@/")) {
    const absolute = path.join(rootDir, request.slice(2));
    return originalResolveFilename.call(this, absolute, parent, isMain, options);
  }
  return originalResolveFilename.call(this, request, parent, isMain, options);
};

const defaultLoader = require.extensions[".js"];

function compileTs(module, filename) {
  const source = fs.readFileSync(filename, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2019,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
      moduleResolution: ts.ModuleResolutionKind.NodeJs,
      resolveJsonModule: true,
    },
    fileName: filename,
  });
  module._compile(output.outputText, filename);
}

require.extensions[".ts"] = compileTs;
require.extensions[".tsx"] = compileTs;

globalThis.__ATHLETE_INSIGHT_TESTS__ = [];

function collectTestFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return collectTestFiles(fullPath);
    }
    if (!entry.name.endsWith(".test.ts")) {
      return [];
    }
    if (filter && !fullPath.includes(filter)) {
      return [];
    }
    return [fullPath];
  });
}

async function main() {
  const files = collectTestFiles(testsDir).sort();
  if (files.length === 0) {
    console.error(`No test files matched filter "${filter}".`);
    process.exit(1);
  }

  for (const file of files) {
    require(file);
  }

  const tests = globalThis.__ATHLETE_INSIGHT_TESTS__;
  let failed = 0;

  for (const testCase of tests) {
    try {
      await testCase.fn();
      console.log(`ok - ${testCase.name}`);
    } catch (error) {
      failed += 1;
      console.error(`not ok - ${testCase.name}`);
      console.error(error instanceof Error ? error.stack : error);
    }
  }

  console.log(`\n${tests.length - failed}/${tests.length} tests passed`);
  if (failed > 0) {
    process.exit(1);
  }
}

main().finally(() => {
  require.extensions[".js"] = defaultLoader;
});
