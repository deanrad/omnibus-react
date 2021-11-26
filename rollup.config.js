import typescript from '@rollup/plugin-typescript';

export default {
  input: './src/index.ts',
  output: [
    {
      file: './dist/omnibus-react.prod.js',
      format: 'es',
      exports: 'named',
      sourcemap: true,
    },
    {
      file: './dist/omnibus-react.esm.js',
      format: 'es',
      exports: 'named',
      sourcemap: true,
    },
    {
      file: './dist/omnibus-react.min.js',
      format: 'cjs',
      sourcemap: true,
    },
  ],
  plugins: [typescript()],
};
