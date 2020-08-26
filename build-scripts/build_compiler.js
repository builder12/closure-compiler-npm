#!/usr/bin/env node
/*
 * Copyright 2018 The Closure Compiler Authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * @fileoverview Build the compiler java jar from source.
 *
 * Invoked as part of the package build process:
 *
 *     yarn run build
 *
 * For pull requests and pushes to master, the compiler submodule is expected to be pointed at the tagged commit
 * that matches the package major version.
 *
 * When the COMPILER_NIGHTLY env variable is set, the compiler submodule will be pointing to the latest master
 * commit. This is for regular integration testing of the compiler with the various tests in this repo's packages.
 * In this case the compiler will be built as a SNAPSHOT.
 */
"use strict";

const ncp = require("ncp");
const fs = require("fs");
const path = require("path");
const runCommand = require("./run-command");

const compilerTargetName = "compiler_unshaded_deploy.jar";
const compilerJavaBinaryPath = `./compiler/bazel-bin/${compilerTargetName}`;

async function main() {
  console.log(process.platform, process.arch, compilerVersion);

  if (fs.existsSync(compilerJavaBinaryPath)) {
    return copyCompilerBinaries();
  }

  const { exitCode } = await runCommand(
    "bazel",
    ["build", `//:${compilerTargetName}`],
    { cwd: "./compiler" }
  );
  if (exitCode !== 0) {
    throw new Error(exitCode);
  }

  return copyCompilerBinaries();
}

/**
 * The compiler version that will be built.
 *
 * Retrieved  by reading the contents of ./compiler/pom.xml.
 * For release builds, this is of the form: "vYYYYMMDD"
 * For nightly builds, this is "1.0-SNAPSHOT"
 *
 * @type {string}
 */
const compilerVersion = (function getCompilerVersionFromPomXml() {
  const pomXmlContents = fs.readFileSync(
    path.resolve(__dirname, "..", "compiler", "pom.xml"),
    "utf8"
  );
  const versionParts = /<version>([^<]+)<\/version>/.exec(pomXmlContents);
  return versionParts[1];
})();

/**
 * @param {string} src path to source file or folder
 * @param {string} dest path to destination file or folder
 * @return {!Promise<undefined>}
 */
function copy(src, dest) {
  return new Promise((resolve, reject) => {
    ncp(src, dest, (err) => {
      err ? reject(err) : resolve();
    });
  });
}

/**
 * Copy the newly built compiler and the contrib folder to the applicable packages.
 *
 * @return {!Promise<undefined>}
 */
function copyCompilerBinaries() {
  return Promise.all([
    copy(
      compilerJavaBinaryPath,
      "./packages/google-closure-compiler-java/compiler.jar"
    ),
    copy(
      compilerJavaBinaryPath,
      "./packages/google-closure-compiler-linux/compiler.jar"
    ),
    copy(
      compilerJavaBinaryPath,
      "./packages/google-closure-compiler-osx/compiler.jar"
    ),
    copy(
      compilerJavaBinaryPath,
      "./packages/google-closure-compiler-windows/compiler.jar"
    ),
    copy("./compiler/contrib", "./packages/google-closure-compiler/contrib"),
  ]);
}

main();
