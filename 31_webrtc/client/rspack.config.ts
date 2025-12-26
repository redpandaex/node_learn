import { defineConfig } from '@rspack/cli';
import { DefinePlugin, rspack } from '@rspack/core';
import ReactRefreshRspackPlugin from '@rspack/plugin-react-refresh';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isDev = process.env.NODE_ENV === 'development';

// 检查 .env.local 文件是否存在
const envLocalPath = '.env.local';
if (!fs.existsSync(envLocalPath)) {
  console.warn('⚠️  警告: 未找到 .env.local 文件');
  console.warn('   请创建 .env.local 文件并添加 WS_HOST 和 HTTP_HOST 配置');
  console.warn('   示例内容:');
  console.warn('   WS_HOST=ws://localhost:8080');
  console.warn('   HTTP_HOST=http://localhost:8080');
} else {
  // 加载 .env.local 文件
  const envResult = dotenv.config({ path: envLocalPath });

  if (envResult.error) {
    console.error('❌ 错误: 无法解析 .env.local 文件');
    console.error(envResult.error.message);
  }
}

// 检查必要的环境变量是否已设置
const requiredEnvVars = ['WS_HOST', 'HTTP_HOST'];
const missingEnvVars = requiredEnvVars.filter(
  (varName) => !process.env[varName],
);

if (missingEnvVars.length > 0 && fs.existsSync(envLocalPath)) {
  console.warn('⚠️  警告: .env.local 文件中缺少以下环境变量:');
  missingEnvVars.forEach((varName) => {
    console.warn(`   - ${varName}`);
  });
  console.warn('   这可能会导致应用无法正常连接到服务器');
}

const targets = ['last 2 versions', '> 0.2%', 'not dead', 'Firefox ESR'];

export default defineConfig({
  entry: {
    main: './src/main.tsx',
  },
  resolve: {
    extensions: ['...', '.ts', '.tsx', '.jsx'],
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  module: {
    rules: [
      {
        test: /\.svg$/,
        type: 'asset',
      },
      {
        test: /\.css$/,
        use: ['postcss-loader'],
        type: 'css',
      },
      {
        test: /\.(jsx?|tsx?)$/,
        use: [
          {
            loader: 'builtin:swc-loader',
            options: {
              jsc: {
                parser: {
                  syntax: 'typescript',
                  tsx: true,
                },
                transform: {
                  react: {
                    runtime: 'automatic',
                    development: isDev,
                    refresh: isDev,
                  },
                },
              },
              env: { targets },
            },
          },
        ],
      },
    ],
  },
  plugins: [
    new DefinePlugin({
      // 从环境变量读取，设置默认值
      'process.env.WS_HOST': JSON.stringify(
        process.env.WS_HOST || 'ws://localhost:3000/ws',
      ),
      'process.env.HTTP_HOST': JSON.stringify(
        process.env.HTTP_HOST || 'http://localhost:3000',
      ),
    }),
    new rspack.HtmlRspackPlugin({
      template: './index.html',
    }),
    isDev ? new ReactRefreshRspackPlugin() : null,
  ].filter(Boolean),
  optimization: {
    minimizer: [
      new rspack.SwcJsMinimizerRspackPlugin(),
      new rspack.LightningCssMinimizerRspackPlugin({
        minimizerOptions: { targets },
      }),
    ],
  },
  experiments: {
    css: true,
  },
  devServer: {
    open: true,
    host: '0.0.0.0',
  },
});
