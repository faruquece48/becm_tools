// Rebuild the single-file edition directly from the current create-page components.
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { webpack } = require('next/dist/compiled/webpack/webpack');
const postcss = require('postcss');
const tailwind = require('@tailwindcss/postcss');

async function main() {
  const root = path.resolve(__dirname, '..');
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'becm-offline-'));
  try {
    await new Promise((resolve, reject) => {
      const compiler = webpack({
        mode: 'production',
        context: root,
        entry: './scripts/offline/entry.tsx',
        target: ['web', 'es2020'],
        plugins: [
          new webpack.DefinePlugin({ 'process.env.NEXT_PUBLIC_OFFLINE_BILLS': JSON.stringify('true') }),
          new webpack.optimize.LimitChunkCountPlugin({ maxChunks: 1 }),
        ],
        output: { path: temp, filename: 'app.js', publicPath: '' },
        resolve: { extensions: ['.tsx', '.ts', '.js'], alias: { '@': root } },
        module: { rules: [
          { test: /\.tsx?$/, exclude: /node_modules/, use: path.join(__dirname, 'offline/typescript-loader.cjs') },
          { test: /pdf\.worker\.min\.mjs$/, type: 'asset/inline', generator: { dataUrl: { mimetype: 'text/javascript' } } },
        ] },
        optimization: { minimize: false, splitChunks: false, runtimeChunk: false },
        devtool: false,
      });
      compiler.run((error, stats) => {
        compiler.close(() => {
          if (error) return reject(error);
          if (stats.hasErrors()) return reject(new Error(stats.toString({ all: false, errors: true })));
          resolve();
        });
      });
    });
    const source = await fs.readFile(path.join(root, 'app/globals.css'), 'utf8');
    const result = await postcss([tailwind({ base: root })]).process(source, { from: path.join(root, 'app/globals.css') });
    let css = result.css;
    for (const match of [...css.matchAll(/url\(["']?(\/fonts\/[^"')]+)["']?\)/g)]) {
      const font = await fs.readFile(path.join(root, 'public', match[1]));
      css = css.replace(match[0], `url("data:font/ttf;base64,${font.toString('base64')}")`);
    }
    const js = await fs.readFile(path.join(temp, 'app.js'), 'utf8');
    const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>BECM — Create Examination Bill (Offline)</title>
<style>${css.replace(/<\/style/gi, '<\\/style')}
:root{--font-sans:Arial,Helvetica,sans-serif}body{background:#f8fafc;font-family:Arial,Helvetica,sans-serif}#root>main>div{margin:auto}[data-offline-download]{display:none!important}.offline-header{max-width:1152px;margin:auto;padding:24px 32px 0}.offline-header h1{font-size:24px;font-weight:700}.offline-header p{margin-top:8px;color:#475569;font-size:14px}
</style></head><body>
<header class="offline-header"><h1>Examination Bill · Offline</h1><p>Create your bill, then open Preview to customize the layout and download PDF or Word. Drafts are saved in this browser when storage is available. Use Export Data to keep a backup or transfer work to the website. Online staff records and account customization are not synced.</p></header>
<div id="root"></div><noscript>Please enable JavaScript to use the bill form.</noscript>
<script>${js.replace(/<\/script/gi, '<\\/script')}</script></body></html>`;
    const output = path.join(root, 'public/downloads/bills-create.html');
    await fs.mkdir(path.dirname(output), { recursive: true });
    await fs.writeFile(output, html);
    console.log(`Created ${output} (${(Buffer.byteLength(html) / 1024 / 1024).toFixed(2)} MB)`);
  } finally {
    // Only remove the exact temporary directory created above.
    await fs.rm(temp, { recursive: true, force: true });
  }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
