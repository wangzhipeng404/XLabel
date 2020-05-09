import typescript from "rollup-plugin-typescript";
import sourceMaps from "rollup-plugin-sourcemaps";
import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import serve from 'rollup-plugin-serve'
import livereload from 'rollup-plugin-livereload'

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
    serve(),
    livereload()
  ],
  output: [
    {
      format: "cjs",
      file: "lib/bundle.cjs.js",
      sourcemap: true
    },
    {
      format: "es",
      file: "lib/bundle.esm.js",
      sourcemap: true
    },
    {
      format: "iife",
      file: "lib/bundle.iife.js",
      sourcemap: true
    },
  ]
};