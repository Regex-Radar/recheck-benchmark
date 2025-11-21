import { build as esbuild } from 'esbuild';

const main = async () => {
    await esbuild({
        entryPoints: ['src/index.ts'],
        bundle: false,
        format: 'esm',
        target: 'node24',
        platform: 'node',
        packages: 'external',
        outfile: 'dist/index.js'
    });
};

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
