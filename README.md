# `recheck-benchmark`

This is a project that attempts to benchmark the different backends used by `recheck`. See https://github.com/kevinramharak/regex-radar/issues/24 for more info.

## Setup

## Findings

The benchmark is still incomplete not taking into account of startup times, warmup times and IPC overhead (especially for the worker thread). Additionally the worker is implemented as a pool, but has a fixed size of 1. Some early conclusions:

- `native` is pretty fast, as expected
- `java` is the fastest for a batch, slow for individual patterns, not sure why
- `wasm` is very fast for individual regex checks, and still has a good performance for batches
- `scalajs` is the slowest as expected
- `thread-worker` has similar performance as `scalajs`, but the messaging overhead is noticable

Some variations to benchmark:

- worker pools with multiple workers, measure the memory/process spawning overhead as additional cost
- try the `wasm` backend inside the `thread-worker`
- write some benchmarking suites, with setup/teardowns to measure:
    - the overhead of spawning processes
    - the overhead of the IPC
    - the performance of the individual
- do some memory profiling, to check the memory overhead

As the aim of the benchmark is to figure out the performance gains vs the portability of the backend, `wasm` seems like a very good choice, if you ignore the experimental status of its build target.

### Visualisations

Attempts at visualising the initial results.

- Latency - lower is better
- Throughput - higher is better

#### Batch - Latency - Throughput

- `6` regexes in the dataset

| Backend        | Avg Latency   |  (ms) | Throughput | (ops/sec) |
| -------------- | ------------- | ----: | ---------- | --------: |
| `java`         | ██            |  `97` | ██████████ |      `10` |
| `native`       | ███           | `135` | ███████    |       `7` |
| `wasm`         | ██████        | `276` | ████       |       `4` |
| `scalajs`      | ████████████  | `613` | ██         |       `2` |
| `threadWorker` | █████████████ | `628` | ██         |       `2` |

#### Per Pattern

- Throughput (ops/sec)

| Pattern                                                     | `native` (ops/sec) | `java` (ops/sec) | `wasm` (ops/sec) | `scalajs` (ops/sec) | `threadWorker` (ops/sec) |
| ----------------------------------------------------------- | -----------------: | ---------------: | ---------------: | ------------------: | -----------------------: |
| `(https?:\/\/(w{3}\.)?)+[a-zA-Z0-9\-]+\.[a-z]+(\/[^\s]*)*`  |                `7` |             `11` |              `4` |                 `2` |                      `2` |
| `^(a+)+$`                                                   |             `1232` |             `39` |           `1958` |               `552` |                    `562` |
| `(a\|aa)+$`                                                 |              `999` |             `48` |           `1227` |               `416` |                    `324` |
| `(x+x+)+y`                                                  |              `682` |             `60` |            `647` |               `275` |                    `237` |
| `^([a-zA-Z0-9_.+-]+)+@(([a-zA-Z0-9-])+.)+[a-zA-Z0-9]{2,4}$` |              `240` |             `42` |            `153` |                `68` |                     `65` |
| `^([A-Z]:\\)?(\\[A-Za-z_\-\s0-9\.]+)+\\?$`                  |              `486` |             `46` |            `327` |               `155` |                    `143` |

## Run benchmark

```console
# install dependencies
npm i
# run benchmark
npm run bench
```

## Dataset

The regular expressions used to benchmark are found in [`./data/redos-vulnerable.json`](./data/redos-vulnerable.json).
