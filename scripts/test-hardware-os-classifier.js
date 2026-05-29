const assert = require('assert');
const Module = require('module');
const path = require('path');
const ts = require('typescript');

const helperPath = path.join(__dirname, '..', 'lib', 'hardware_os.ts');
const source = ts.sys.readFile(helperPath);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020
  }
}).outputText;

const helperModule = new Module(helperPath);
helperModule.filename = helperPath;
helperModule.paths = Module._nodeModulePaths(path.dirname(helperPath));
helperModule._compile(compiled, helperPath);

const { groupOperatingSystem } = helperModule.exports;

const cases = [
  ['Windows 10 Enterprise LTSC 2024', 'Windows 10'],
  ['Windows 10 Enterprise N LTSC 2021', 'Windows 10'],
  ['Windows 10 Enterprise Evaluation', 'Windows 10'],
  ['Microsoft Windows 10 Service Pack 1', 'Windows 10'],
  ['Windows 8.1 Pro N', 'Windows 8.1'],
  ['Windows 8 Single Language', 'Windows 8'],
  ['Windows 7 Ultimate Service Pack 1', 'Windows 7'],
  ['Windows Server 2022 Standard', 'Windows Server 2022'],
  ['Windows Server 2025 Standard', 'Windows Server 2025'],
  ['Professional', 'Windows - unknown version'],
  ['Windows 9 Professional', 'Windows - unknown version'],
  ['Darwin Kernel Version 15.6.0: Thu Jun 21 20:07:40 PDT 2018; root:xnu-3248.73.11~1/RELEASE_X86_64', 'OS X 10.11 El Capitan'],
  ['Darwin Kernel Version 16.7.0: Thu Jun 15 17:36:27 PDT 2017; root:xnu-3789.70.16~2/RELEASE_X86_64', 'macOS 10.12 Sierra'],
  ['Darwin Kernel Version 17.7.0: Fri Oct 30 13:34:27 PDT 2020; root:xnu-4570.71.82.8~1/RELEASE_X86_64', 'macOS 10.13 High Sierra'],
  ['Darwin Kernel Version 18.7.0: Mon Aug 31 22:12:52 PDT 2020; root:xnu-4903.278.28~1/RELEASE_X86_64', 'macOS 10.14 Mojave'],
  ['Darwin Kernel Version 19.6.0: Tue Jun 21 21:18:39 PDT 2022; root:xnu-6153.141.66~1/RELEASE_X86_64', 'macOS 10.15 Catalina'],
  ['Darwin Kernel Version 20.6.0: Thu Jul  6 22:12:47 PDT 2023; root:xnu-7195.141.49.702.12~1/RELEASE_ARM64_T8101', 'macOS 11 Big Sur'],
  ['Darwin Kernel Version 21.6.0: Mon Jun 24 00:56:10 PDT 2024; root:xnu-8020.240.18.709.2~1/RELEASE_X86_64', 'macOS 12 Monterey'],
  ['Darwin Kernel Version 22.6.0: Tue Jul 15 08:22:28 PDT 2025; root:xnu-8796.141.3.713.2~2/RELEASE_X86_64', 'macOS 13 Ventura'],
  ['Darwin Kernel Version 23.6.0: Mon Jan 19 22:02:22 PST 2026; root:xnu-10063.141.1.710.3~1/RELEASE_X86_64', 'macOS 14 Sonoma'],
  ['Darwin Kernel Version 24.6.0: Tue Apr 21 20:17:54 PDT 2026; root:xnu-11417.140.69.710.16~1/RELEASE_X86_64', 'macOS 15 Sequoia'],
  ['Darwin Kernel Version 25.5.0: Mon Apr 27 20:31:18 PDT 2026; root:xnu-12377.121.6~2/RELEASE_X86_64', 'macOS 26 Tahoe'],
  ['Darwin Kernel Version 26.0.0: Thu May 21 16:31:48 PDT 2026; root:xnu-13000.1.1~1/RELEASE_ARM64_T8103', 'macOS - future/unmapped'],
  ['#101-Ubuntu SMP PREEMPT_DYNAMIC Mon Feb  9 10:15:05 UTC 2026', 'Linux - Ubuntu kernel'],
  ['#1 SMP PREEMPT_DYNAMIC Debian 6.12.73-1 (2026-02-17)', 'Linux - Debian kernel'],
  ['#1-NixOS SMP PREEMPT_DYNAMIC Wed Oct 15 10:00:25 UTC 2025', 'Linux - NixOS kernel'],
  ['#1 ZEN SMP PREEMPT liquorix 7.0-11.1~trixie (2026-05-23)', 'Linux - liquorix kernel'],
  ['#1 SMP PREEMPT_DYNAMIC Sat May 23 15:20:08 UTC 2026', 'Linux - generic kernel'],
  ['Plan 9', 'Other']
];

for (const [input, expected] of cases) {
  assert.strictEqual(groupOperatingSystem(input), expected, input);
}

console.log(`hardware OS classifier: ${cases.length} cases passed`);
