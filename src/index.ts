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
const warmup = true;
const time = 1000;
const collection_iterations = 10;
const individual_iterations = 100;
const workerPoolSize = 5;
const workerPath = import.meta.resolve('@regex-radar/recheck-esm/thread.wasm.worker.js');

const wasm: BackendSync = { createCheckSync: () => checkWasm };

type BackendDescriptor = Backend | [Backend, Parameters<typeof createCheck>[1]];

const asyncBackends: Record<string, BackendDescriptor> = {
    native,
    java,
    threadWorker,
    threadWorkerPool: [threadWorker, { workerPoolSize }],
    threadWorkerWasm: [threadWorker, { workerPath }],
    threadWorkerWasmPool: [
        threadWorker,
        {
            workerPoolSize,
            workerPath,
        },
    ],
};
const syncBackends: Record<string, BackendSync> = { scalajs, wasm };

const checks: Record<string, CheckFn> = {};
const checksSync: Record<string, CheckSyncFn> = {};

await Promise.all(
    Object.entries(asyncBackends).map(async ([name, backend]) => {
        const args: Parameters<typeof createCheck> = Array.isArray(backend) ? backend : [backend];
        checks[name] = await createCheck(...args);
    }),
);
Object.entries(syncBackends).forEach(([name, backend]) => (checksSync[name] = createCheckSync(backend)));

{
    const bench = new Bench({
        name: `recheck-benchmark - ${vulnerable.length} patterns, ${collection_iterations} iterations, ${workerPoolSize} worker pool size`,
        iterations: collection_iterations,
        time,
        warmup,
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
    console.table(bench.table().sort(sortTable));
}
{
    for (const pattern of vulnerable) {
        const bench = new Bench({
            name: `recheck-benchmark - ${individual_iterations} iterations - pattern /${pattern}/`,
            iterations: individual_iterations,
            time,
            warmup,
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
        console.table(bench.table().sort(sortTable));
    }
}

function sortTable(a?: Record<string, unknown> | null, b?: Record<string, unknown> | null) {
    if (!a || !b) {
        return 0;
    }
    const key = 'Latency avg (ns)';
    const x = a[key] as string;
    const y = b[key] as string;
    const c = Number(x.split('±')[0]);
    const d = Number(y.split('±')[0]);
    return c - d;
}
