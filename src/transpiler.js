// ─────────────────────────────────────────────
//  TRANSPILER  (TAMASHII → JavaScript)
// ─────────────────────────────────────────────
export function transpile(source, options = {}) {
  const { outputFn = 'console.log' } = options;
  const lines = source.split("\n");

  // ── Phase 1: collect class names + their field names ──
  const allClassFields = new Map(); // Map<className, Set<fieldName>>
  let depth = 0;
  let scanClass = null;
  let scanClassDepth = -1;

  for (const line of lines) {
    const trim = line.trim();
    const opens  = (trim.match(/\{/g) || []).length;
    const closes = (trim.match(/\}/g) || []).length;

    const nm = trim.match(/^nakama\s+(\w+)/);
    if (nm) {
      scanClass = nm[1];
      allClassFields.set(scanClass, new Set());
      scanClassDepth = depth + 1;
    }

    // At direct class body level, collect tamashii fields
    if (scanClass && depth === scanClassDepth) {
      const fm = trim.match(/^tamashii\s+(\w+)/);
      if (fm) allClassFields.get(scanClass).add(fm[1]);
    }

    depth += opens - closes;

    if (scanClass && depth < scanClassDepth) {
      scanClass = null;
      scanClassDepth = -1;
    }
  }

  const classNames = [...allClassFields.keys()];

  // ── Phase 2: line-by-line transformation ──
  const result = [];
  depth = 0;
  let currentClass    = null;
  let classBodyDepth  = -1;
  let inMethod        = false;
  let methodDepth     = -1;
  let hajimeDepth     = -1;

  for (const rawLine of lines) {
    let line = rawLine;
    const trim   = line.trim();
    const opens  = (trim.match(/\{/g) || []).length;
    const closes = (trim.match(/\}/g) || []).length;

    // ── Close hajime IIFE ──
    if (hajimeDepth !== -1 && trim === "}" && depth === hajimeDepth) {
      result.push(rawLine.replace("}", "})();"));
      depth += opens - closes;
      if (currentClass && depth < classBodyDepth) { currentClass = null; classBodyDepth = -1; }
      continue;
    }

    // ── Pass through comments ──
    if (trim.startsWith("//")) {
      result.push(line);
      depth += opens - closes;
      continue;
    }

    const atClassBody = currentClass !== null && depth === classBodyDepth;

    // nakama → class
    if (/^\s*nakama\s+\w+/.test(line)) {
      const m = line.match(/^(\s*)nakama\s+(\w+)/);
      currentClass    = m[2];
      classBodyDepth  = depth + 1;
      line = line.replace(/^(\s*)nakama\s+/, "$1class ");
    }

    // jutsu → method (in class) or function (outside)
    if (atClassBody && /^\s*jutsu\s+\w+\s*\(/.test(line)) {
      line = line.replace(/^(\s*)jutsu\s+(\w+)\s*\(/, "$1$2(");
      if (opens > 0) { inMethod = true; methodDepth = depth + 1; }
    } else if (!atClassBody) {
      line = line.replace(/^(\s*)jutsu\s+(\w+)\s*\(/, "$1function $2(");
    }

    // tamashii → class field or let
    if (atClassBody) {
      line = line.replace(/^(\s*)tamashii\s+/, "$1");
    } else {
      line = line.replace(/^(\s*)tamashii\s+/, "$1let ");
    }

    // chikara → const
    line = line.replace(/^(\s*)chikara\s+/, "$1const ");

    // strip type annotations  :koe  :kazu  :nani
    line = line.replace(/\s*:\s*(koe|kazu|nani)/g, "");

    // hajime → IIFE
    if (/^\s*hajime\s*\{/.test(line)) {
      line = line.replace(/^(\s*)hajime\s*\{/, "$1(function __main() {");
      hajimeDepth = depth + 1;
    }

    // moshi → if
    line = line.replace(/^(\s*)moshi\s+(.+?)\s*\{/, (_, ind, cond) => `${ind}if (${cond}) {`);

    // soredemo → else
    line = line.replace(/\bsoredemo\b/g, "else");

    // kurikaeshi var in start..end  →  for loop
    line = line.replace(
      /^(\s*)kurikaeshi\s+(\w+)\s+in\s+(\w+)\.\.(\w+)\s*\{/,
      (_, ind, v, s, e) => `${ind}for (let ${v} = ${s}; ${v} <= ${e}; ${v}++) {`
    );

    // kataru  →  __output(...) or console.log(...)
    line = line.replace(/^(\s*)kataru\s+(.+)$/, `$1${outputFn}($2);`);

    // modoru → return
    line = line.replace(/^(\s*)modoru\s+(.+)$/, "$1return $2;");

    // owari → break
    line = line.replace(/^(\s*)owari\s*$/, "$1break;");

    // this. substitution inside class methods
    if (inMethod && currentClass) {
      const fields = allClassFields.get(currentClass) || new Set();
      for (const field of fields) {
        // Don't double-prefix; don't touch `this.x` or `obj.x`
        const re = new RegExp(`(?<!this\\.)(?<!\\.)\\b(${field})\\b`, "g");
        line = line.replace(re, "this.$1");
      }
    }

    // Insert `new` before known class instantiations  e.g.  Warrior(  →  new Warrior(
    if (classNames.length > 0) {
      const pat = classNames.join("|");
      line = line.replace(
        new RegExp(`(?<!class )(?<!new )\\b(${pat})\\s*\\(`, "g"),
        "new $1("
      );
    }

    // Boolean / null literals
    line = line.replace(/\bmu\b/g,   "null");
    line = line.replace(/\bshin\b/g, "true");
    line = line.replace(/\buso\b/g,  "false");

    // yobu → comment (imports not supported in sandbox)
    line = line.replace(/^(\s*)yobu\s+(.+)$/, "$1// [yobu/import skipped] $2");

    result.push(line);
    depth += opens - closes;

    if (inMethod     && depth < methodDepth)    { inMethod = false;     methodDepth   = -1; }
    if (currentClass && depth < classBodyDepth) { currentClass = null;  classBodyDepth = -1; }
  }

  return result.join("\n");
}
