import typescript from "rollup-plugin-typescript";
import sourceMaps from "rollup-plugin-sourcemaps";
import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import serve from 'rollup-plugin-serve'
import livereload from 'rollup-plugin-livereload'

const isDev = process.env.NODE_ENV !== 'production'; 
export default {
  input: "./src/index.ts",
  plugins: [
    resolve(),
    commonjs(),
    typescript({
      exclude: "node_modules/**",
      typescript: require("typescript")
    }),
    sourceMaps(),
    isDev && serve(),
    isDev && livereload()
  ],
  output: [
    {
      format: "cjs",
      file: "lib/index.cjs.js",
      sourcemap: true
    },
    {
      format: "es",
      file: "lib/index.esm.js",
      sourcemap: true
    },
    {
      format: "umd",
      file: "lib/index.umd.js",
      sourcemap: true,
      name: 'XLabel',
    },
  ]
};