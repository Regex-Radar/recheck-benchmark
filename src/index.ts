import { Bench } from 'tinybench';
import {
    createCheck,
    createCheckSync,
    native,
    java,
    threadWorker,
    scalajs,
    synckit,
    webWorker,
    type BackendSync,
    type Backend,
    type CheckFn,
    type CheckSyncFn,
} from '@regex-radar/recheck-esm/core';
import { check as checkWasm } from '@regex-radar/recheck-scalajs-wasm';

import dataset from '../data/redos-vulnerable.json' with { type: 'json' };

const vulnerable = dataset;
const collection_iterations = 5;
const individual_iterations = 50;

const wasm: BackendSync = { createCheckSync: () => checkWasm };

const asyncBackends: Record<string, Backend> = { native, java, threadWorker };
const syncBackends: Record<string, BackendSync> = { scalajs, wasm };

const checks: Record<string, CheckFn> = {};
const checksSync: Record<string, CheckSyncFn> = {};

await Promise.all(
    Object.entries(asyncBackends).map(async ([name, backend]) => {
        checks[name] = await createCheck(backend);
    }),
);
Object.entries(syncBackends).forEach(([name, backend]) => (checksSync[name] = createCheckSync(backend)));

{
    const bench = new Bench({
        name: `recheck-benchmark - ${vulnerable.length} patterns`,
        iterations: collection_iterations,
        throws: true,
    });
    Object.entries(checks).forEach(async ([name, check]) => {
        bench.add(name, async () => {
            return Promise.all(
                vulnerable.map((pattern) => {
                    return check(pattern, '');
                }),
            );
        });
    });

    Object.entries(checksSync).forEach(([name, check]) => {
        bench.add(name, async () => {
            vulnerable.forEach((pattern) => {
                check(pattern, '');
            });
        });
    });

    await bench.run();

    console.log(bench.name);
    console.table(bench.table());
}
{
    for (const pattern of vulnerable) {
        const bench = new Bench({
            name: `recheck-benchmark - pattern /${pattern}/`,
            iterations: individual_iterations,
            throws: true,
        });
        Object.entries(checks).forEach(async ([name, check]) => {
            bench.add(name, async () => {
                await check(pattern, '');
            });
        });

        Object.entries(checksSync).forEach(([name, check]) => {
            bench.add(name, async () => {
                check(pattern, '');
            });
        });

        await bench.run();

        console.log(bench.name);
        console.table(bench.table());
    }
}
