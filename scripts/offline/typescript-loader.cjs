const ts = require('typescript');
const fs = require('node:fs');
const path = require('node:path');

module.exports = function (source) {
  const resource = this.resourcePath.replaceAll('\\', '/');
  if (resource.endsWith('/bills/create/components/emptyBill.ts')) {
    source = source.replace('footerArea: 24', 'footerArea: 20');
  }
  // Apply unchecked defaults to legacy data only in the standalone edition.
  if (resource.endsWith('/lib/storage/draft.ts')) {
    source = 'import { applyOfflineBillDefaults } from "@/scripts/offline/billDefaults";\n' + source;
    source = source.replaceAll('return raw ? JSON.parse(raw) : null;', 'return raw ? applyOfflineBillDefaults(JSON.parse(raw)) : null;');
  }
  if (resource.endsWith('/lib/storage/exportImport.ts')) {
    source = 'import { applyOfflineBillDefaults } from "@/scripts/offline/billDefaults";\n' + source;
    source = source.replace('resolve(data);', 'resolve(applyOfflineBillDefaults(data));');
  }
  // The offline entry needs no Next.js lazy-loading runtime or extra chunks.
  if (this.resourcePath.replaceAll('\\', '/').endsWith('/bills/preview/page.tsx')) {
    source = source.replace('import dynamic from "next/dynamic";', 'import PdfPreviewViewer from "./components/PdfPreviewViewer";');
    const start = source.indexOf('const PdfPreviewViewer = dynamic(');
    const end = source.indexOf('const committeeLabels', start);
    if (start < 0 || end < 0) throw new Error('Preview dynamic import changed; update the offline adapter.');
    source = source.slice(0, start) + source.slice(end);
  }
  // PDF fonts must also be embedded: React-PDF reads these independently of CSS.
  source = source.replace(/"(\/fonts\/[^"\n]+\.ttf)"/g, (_, fontPath) => {
    const font = path.join(__dirname, '../../public', fontPath);
    this.addDependency(font);
    return JSON.stringify('data:font/ttf;base64,' + fs.readFileSync(font).toString('base64'));
  });
  return ts.transpileModule(source, {
    fileName: this.resourcePath,
    compilerOptions: {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.ESNext,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  }).outputText;
};
