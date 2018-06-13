/*
 * Copyright 2015 The Closure Compiler Authors.
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
 * @fileoverview Tests for compiler.jar versions
 *
 * @author Chad Killingsworth (chadkillingsworth@gmail.com)
 */

'use strict';

const should = require('should');
const compilerPackage = require('../');
const Compiler = compilerPackage.compiler;
const packageInfo = require('../package.json');
const Semver = require('semver');
const compilerVersionExpr = /^Version:\sv(.*)$/m;
const spawn = require('child_process').spawnSync;
require('mocha');

process.on('unhandledRejection', e => { throw e; });

const assertError = new should.Assertion('compiler version');
assertError.params = {
  operator: 'should be a semver parseabe',
};

describe('compiler.jar', function() {
  this.timeout(10000);
  this.slow(5000);

  it('should not be a snapshot build', function(done) {
    const compiler = new Compiler({ version: true});
    compiler.run(function(exitCode, stdout, stderr) {
      let versionInfo = (stdout || '').match(compilerVersionExpr);
      should(versionInfo).not.be.eql(null);
      versionInfo = versionInfo || [];
      versionInfo.length.should.be.eql(2);
      versionInfo[1].indexOf('SNAPSHOT').should.be.below(0);
      done();
    });
  });

  it('version should be equal to the package major version', function(done) {
    const compiler = new Compiler({ version: true});
    const packageVer = new Semver(packageInfo.version);
    compiler.run(function(exitCode, stdout, stderr) {
      let versionInfo = (stdout || '').match(compilerVersionExpr);
      should(versionInfo).not.be.eql(null);
      versionInfo = versionInfo || [];
      versionInfo.length.should.be.eql(2);

      try {
        const compilerVersion = new Semver(versionInfo[1] + '.0.0');
        compilerVersion.major.should.be.equal(packageVer.major);
      } catch (e) {
        assertError.fail();
      }
      done();
    });
  });
});

describe('compiler submodule', function() {
  this.timeout(10000);
  this.slow(5000);
  it('should be synced to the tagged commit', function() {
    const gitCmd = spawn('git', ['tag', '--points-at', 'HEAD'], {
      cwd: './compiler'
    });
    should(gitCmd.status).eql(0)
    const currentTag = gitCmd.stdout.toString().replace(/\s/g, '');
    const packageVer = new Semver(packageInfo.version);
    const mvnVersion = 'v' + packageVer.major;
    let normalizedTag = currentTag;
    if (normalizedTag) {
      normalizedTag = currentTag.replace(/^v\d{8}(-.*)$/, (match, g1) => match.substr(0, match.length - g1.length));
    }
    should(normalizedTag).eql(mvnVersion)
  });
});
