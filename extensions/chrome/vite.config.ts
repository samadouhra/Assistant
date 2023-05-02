import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { babel } from '@rollup/plugin-babel';
import commonjs from '@rollup/plugin-commonjs';
import { viteStaticCopy } from 'vite-plugin-static-copy'
import viteTsconfigPaths from 'vite-tsconfig-paths';
import svgrPlugin from 'vite-plugin-svgr';
import path from "path";

export default defineConfig({
  plugins: [
    react(), viteTsconfigPaths(), svgrPlugin(),
    commonjs(),
    babel({ babelHelpers: 'runtime' }),
    viteStaticCopy({
      targets: [
        {
          src: './public/*.*',
          dest: './'
        },
        {
          src: './public/*',
          dest: './'
        }
      ]
    })
  ],
  build: {
    target: "chrome58",
    ssr: true,
    outDir: path.resolve(__dirname, 'dist'),
    assetsDir: "./",
    commonjsOptions: {
      // include: ["./src/helpers/chatgpt.ts"],
      transformMixedEsModules: true
    },
    rollupOptions: {
      input: {
        background: path.resolve(__dirname, 'src', 'background.ts'),
        'paste-detector': path.resolve(__dirname, 'src', 'paste-detector.ts'),
        app: path.resolve(__dirname, 'src', 'app.tsx'),
        'econ-events': path.resolve(__dirname, 'src', 'econ-events.ts'),
        'econ-chat': path.resolve(__dirname, 'src', 'econ-chat.tsx'),
      },
      output: {
        format: "cjs",
        compact: true,
        chunkFileNames: "[name].js",
        entryFileNames: "[name].js"
      }
    },
    sourcemap: true,
  }
});
