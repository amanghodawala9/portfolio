const fs = require('fs');
const path = require('path');
const Prism = require('prismjs');
require('prismjs/components/prism-python');
require('prismjs/components/prism-bash');
require('prismjs/components/prism-json');
require('prismjs/components/prism-markdown');

const md = require('markdown-it')({
  html: true,
  linkify: true,
  highlight: function(str, lang) {
    if (lang && Prism.languages[lang]) {
      try {
        return '<pre class="nb-code-block"><code class="language-' + lang + '">' +
          Prism.highlight(str, Prism.languages[lang], lang) +
          '</code></pre>';
      } catch (__) {}
    }
    return '<pre class="nb-code-block"><code>' + md.utils.escapeHtml(str) + '</code></pre>';
  }
});

function stripAnsi(str) {
  return str.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');
}

function normalizeText(val) {
  if (Array.isArray(val)) {
    return val.join('');
  }
  return val || '';
}

function parseNotebook(filePath, filename) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const nb = JSON.parse(raw);
    
    let inferredTitle = '';
    const cells = (nb.cells || []).map((cell, idx) => {
      const source = normalizeText(cell.source);
      
      if (cell.cell_type === 'markdown') {
        if (!inferredTitle) {
          const match = source.match(/^#\s+(.+)$/m);
          if (match) {
            inferredTitle = match[1].trim();
          }
        }
        return {
          index: idx,
          type: 'markdown',
          html: md.render(source)
        };
      }

      if (cell.cell_type === 'code') {
        let highlighted = '';
        try {
          highlighted = Prism.highlight(source, Prism.languages.python, 'python');
        } catch (err) {
          highlighted = md.utils.escapeHtml(source);
        }

        const outputs = (cell.outputs || []).map(out => {
          if (out.output_type === 'stream') {
            return {
              type: 'text',
              stream: out.name || 'stdout',
              text: stripAnsi(normalizeText(out.text))
            };
          }
          if (out.output_type === 'execute_result' || out.output_type === 'display_data') {
            const data = out.data || {};
            if (data['image/png']) {
              const cleanBase64 = normalizeText(data['image/png']).replace(/\s/g, '');
              return {
                type: 'image',
                src: `data:image/png;base64,${cleanBase64}`
              };
            }
            if (data['image/jpeg']) {
              const cleanBase64 = normalizeText(data['image/jpeg']).replace(/\s/g, '');
              return {
                type: 'image',
                src: `data:image/jpeg;base64,${cleanBase64}`
              };
            }
            if (data['text/html']) {
              return {
                type: 'html',
                html: normalizeText(data['text/html'])
              };
            }
            if (data['text/plain']) {
              return {
                type: 'text',
                text: stripAnsi(normalizeText(data['text/plain']))
              };
            }
          }
          if (out.output_type === 'error') {
            const tb = Array.isArray(out.traceback) ? out.traceback.join('\n') : (out.evalue || 'Error');
            return {
              type: 'error',
              text: stripAnsi(tb)
            };
          }
          return null;
        }).filter(Boolean);

        return {
          index: idx,
          type: 'code',
          execution_count: cell.execution_count || null,
          source: source,
          highlightedSource: highlighted,
          outputs: outputs
        };
      }

      return null;
    }).filter(Boolean);

    const baseName = filename.replace(/\.ipynb$/i, '');
    const title = inferredTitle || baseName.replace(/[_-]+/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    const slug = baseName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

    return {
      title,
      slug,
      filename,
      cellCount: cells.length,
      cells,
      url: `/work/${slug}/`
    };
  } catch (err) {
    console.error(`Error parsing notebook ${filePath}:`, err.message);
    return null;
  }
}

module.exports = function() {
  const notebooks = [];
  const rootDir = path.resolve(__dirname, '../../');
  const srcNotebooksDir = path.resolve(__dirname, '../notebooks');

  // Search project root
  if (fs.existsSync(rootDir)) {
    const rootFiles = fs.readdirSync(rootDir);
    for (const f of rootFiles) {
      if (f.endsWith('.ipynb')) {
        const nb = parseNotebook(path.join(rootDir, f), f);
        if (nb) notebooks.push(nb);
      }
    }
  }

  // Search src/notebooks if it exists
  if (fs.existsSync(srcNotebooksDir)) {
    const nbFiles = fs.readdirSync(srcNotebooksDir);
    for (const f of nbFiles) {
      if (f.endsWith('.ipynb')) {
        // avoid duplicates if same filename
        if (!notebooks.some(n => n.filename === f)) {
          const nb = parseNotebook(path.join(srcNotebooksDir, f), f);
          if (nb) notebooks.push(nb);
        }
      }
    }
  }

  return notebooks;
};
