import { useState, useRef, useCallback, useEffect } from "react";

// ─────────────────────────────────────────────
//  PALETTE
// ─────────────────────────────────────────────
const P = {
  bg:      "#08080f",
  panel:   "#0f0f18",
  panel2:  "#0b0b12",
  border:  "#1a1a28",
  red:     "#e8003d",
  redDim:  "#6a001c",
  accent:  "#ffcc00",
  green:   "#5ecb72",
  blue:    "#7ab8e8",
  purple:  "#c792ea",
  white:   "#eeeef5",
  muted:   "#44445a",
  muted2:  "#666680",
};

// ─────────────────────────────────────────────
//  EXAMPLE PROGRAMS
// ─────────────────────────────────────────────
const EXAMPLES = [
  {
    ep: "EP.1", title: "Hello World",
    code:
`// First steps — 最初の一歩
hajime {
    kataru "Konnichiwa, Sekai!"
    kataru "TAMASHII v1.0 is alive."
    tamashii msg = "Every journey starts with hajime."
    kataru msg
}`,
  },
  {
    ep: "EP.2", title: "Power Check",
    code:
`// It's over 9000 — 超えた!
jutsu checkPower(level) {
    moshi level > 9000 {
        kataru "POWER LEVEL: " + level
        kataru "IT'S OVER NINE THOUSAND!"
        modoru shin
    } soredemo {
        kataru "Power level: " + level + " — still training..."
        modoru uso
    }
}

hajime {
    tamashii readings = [500, 1200, 9001, 7800, 99999]
    kurikaeshi i in 0..4 {
        checkPower(readings[i])
        kataru "---"
    }
}`,
  },
  {
    ep: "EP.3", title: "Training Arc",
    code:
`// 100 days of training — 修行
jutsu train(name, days) {
    tamashii level = 1
    kurikaeshi day in 1..days {
        level = level + 1
    }
    kataru name + " completed " + days + " days!"
    kataru name + " reached level " + level
    modoru level
}

hajime {
    tamashii heroes = ["Naruto", "Goku", "Deku"]
    kurikaeshi i in 0..2 {
        train(heroes[i], 10)
        kataru "===================="
    }
}`,
  },
  {
    ep: "EP.4", title: "Nakama Class",
    code:
`// The power of bonds — 仲間の力
nakama Warrior {
    tamashii name = "Unknown"
    tamashii level = 1
    tamashii hp = 100

    jutsu train() {
        level = level + 1
        hp = hp + 10
    }

    jutsu status() {
        kataru "[ " + name + " ] LV." + level + " | HP: " + hp
    }

    jutsu battle(enemyLevel) {
        moshi level >= enemyLevel {
            kataru name + " wins the battle!"
            modoru shin
        } soredemo {
            kataru name + " needs more training..."
            modoru uso
        }
    }
}

hajime {
    tamashii hero = Warrior()
    hero.name = "Ichigo"
    kataru "=== Training Arc ==="
    kurikaeshi i in 1..5 {
        hero.train()
    }
    hero.status()
    kataru "=== Battle Arc ==="
    hero.battle(4)
    hero.battle(10)
}`,
  },
];

// ─────────────────────────────────────────────
//  TRANSPILER  (TAMASHII → JavaScript)
// ─────────────────────────────────────────────
import { transpile } from './transpiler.js';

// ─────────────────────────────────────────────
//  SYNTAX HIGHLIGHTER  (for editor overlay + JS view)
// ─────────────────────────────────────────────
const TAMA_KW = new Set([
  "tamashii","jutsu","nakama","hajime","kataru","moshi","soredemo",
  "kurikaeshi","yobu","modoru","mu","shin","uso","chikara",
  "koe","kazu","nani","owari","in",
]);
const JS_KW = new Set([
  "function","class","let","const","var","if","else","for","return",
  "break","new","true","false","null","this","typeof","of","in",
]);

function tokenizeLine(line, lang = "tama") {
  const KW = lang === "tama" ? TAMA_KW : JS_KW;
  const tokens = [];
  // regex groups: comment | string | word | other
  const re = /(\/\/.*$|"[^"]*"|'[^']*'|\b[a-zA-Z_]\w*\b|\d+|.)/g;
  let m;
  while ((m = re.exec(line)) !== null) {
    const t = m[0];
    let color = P.white;
    if (t.startsWith("//"))           color = P.muted2;
    else if (t.startsWith('"') || t.startsWith("'")) color = P.green;
    else if (KW.has(t))               color = P.accent;
    else if (/^\d+$/.test(t))         color = P.blue;
    else if (lang === "tama" && ["mu","shin","uso"].includes(t)) color = P.purple;
    else if (lang === "js"   && ["true","false","null","this"].includes(t)) color = P.purple;
    tokens.push({ t, color });
  }
  return tokens;
}

function CodeLine({ line, lang, lineNo, dim }) {
  const tokens = tokenizeLine(line, lang);
  return (
    <div style={{ display: "flex", minHeight: "21px" }}>
      <span style={{
        width: "36px", flexShrink: 0,
        color: P.muted,
        fontSize: "11px", lineHeight: "21px",
        textAlign: "right", paddingRight: "10px",
        userSelect: "none", opacity: dim ? 0.4 : 1,
      }}>
        {lineNo}
      </span>
      <span style={{ whiteSpace: "pre", fontSize: "13px", lineHeight: "21px", opacity: dim ? 0.5 : 1 }}>
        {tokens.map((tk, i) => (
          <span key={i} style={{ color: tk.color }}>{tk.t}</span>
        ))}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────
//  MAIN IDE COMPONENT
// ─────────────────────────────────────────────
export default function TamashiiIDE() {
  const [code,       setCode]       = useState(EXAMPLES[0].code);
  const [output,     setOutput]     = useState([]);
  const [jsCode,     setJsCode]     = useState("");
  const [activeTab,  setActiveTab]  = useState("output"); // "output" | "js"
  const [activeEx,   setActiveEx]   = useState(0);
  const [error,      setError]      = useState(null);
  const [hasRun,     setHasRun]     = useState(false);
  const [flash,      setFlash]      = useState(false);

  const textareaRef = useRef(null);
  const lineColRef  = useRef(null);
  const outputRef   = useRef(null);

  // Sync line number scroll with textarea
  const syncScroll = () => {
    if (textareaRef.current && lineColRef.current) {
      lineColRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  const run = useCallback(() => {
    setError(null);
    setHasRun(true);
    setFlash(true);
    setTimeout(() => setFlash(false), 200);

    const lines = [];
    const __output = (...args) => lines.push(args.map(String).join(" "));

    try {
      const js = transpile(code, { outputFn: '__output' });
      setJsCode(js);
      // eslint-disable-next-line no-new-func
      new Function("__output", js)(__output);
      setOutput(lines);
      setActiveTab("output");
    } catch (e) {
      setError(e.message);
      setOutput(lines);
    }

    setTimeout(() => {
      if (outputRef.current) outputRef.current.scrollTop = 0;
    }, 50);
  }, [code]);

  // Ctrl+Enter to run
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); run(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [run]);

  const loadExample = (i) => {
    setActiveEx(i);
    setCode(EXAMPLES[i].code);
    setOutput([]);
    setError(null);
    setHasRun(false);
    setJsCode("");
  };

  const codeLines = code.split("\n");
  const jsLines   = jsCode.split("\n");

  return (
    <div style={{
      fontFamily: "'Courier New', Courier, monospace",
      background: P.bg,
      color: P.white,
      height: "100vh",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      fontSize: "13px",
    }}>

      {/* ── TOP BAR ── */}
      <div style={{
        background: P.panel,
        borderBottom: `1px solid ${P.border}`,
        padding: "0 16px",
        display: "flex",
        alignItems: "center",
        height: "42px",
        flexShrink: 0,
        gap: "16px",
      }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{
            color: P.red, fontSize: "20px",
            fontFamily: "Georgia, serif", lineHeight: 1,
            textShadow: `0 0 12px ${P.red}`,
          }}>魂</span>
          <span style={{ fontWeight: "bold", letterSpacing: "4px", fontSize: "12px", color: P.white }}>
            <a href="https://github.com/klinge/tamashii" target="_blank" rel="noopener noreferrer" style={{ color: "inherit", textDecoration: "none" }}>
              TAMASHII
            </a>
          </span>
          <span style={{ color: P.muted, fontSize: "10px", letterSpacing: "2px" }}>IDE v1.0</span>
        </div>

        <div style={{ width: "1px", height: "20px", background: P.border }} />

        {/* Example selector */}
        <div style={{ display: "flex", gap: "4px", flex: 1 }}>
          {EXAMPLES.map((ex, i) => (
            <button key={i} onClick={() => loadExample(i)} style={{
              background: activeEx === i ? P.redDim : "transparent",
              border: `1px solid ${activeEx === i ? P.red : P.border}`,
              color: activeEx === i ? "#fff" : P.muted2,
              padding: "3px 10px",
              fontSize: "10px",
              letterSpacing: "1px",
              cursor: "pointer",
              fontFamily: "inherit",
              transition: "all 0.15s",
              whiteSpace: "nowrap",
            }}>
              {ex.ep}
            </button>
          ))}
          <span style={{
            color: P.muted2, fontSize: "11px",
            alignSelf: "center", marginLeft: "6px",
          }}>
            {EXAMPLES[activeEx].title}
          </span>
        </div>

        {/* Run */}
        <button onClick={run} style={{
          background: flash ? P.red : "transparent",
          border: `1px solid ${P.red}`,
          color: P.red,
          padding: "5px 20px",
          fontSize: "11px",
          letterSpacing: "3px",
          fontWeight: "bold",
          cursor: "pointer",
          fontFamily: "inherit",
          boxShadow: `0 0 10px ${P.red}44`,
          transition: "all 0.1s",
          flexShrink: 0,
        }}>
          ▶ RUN
        </button>

        <span style={{ color: P.muted, fontSize: "10px", letterSpacing: "1px", flexShrink: 0 }}>
          ⌘↵
        </span>
      </div>

      {/* ── MAIN AREA ── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* ── EDITOR (left) ── */}
        <div style={{
          flex: "0 0 54%",
          display: "flex",
          flexDirection: "column",
          borderRight: `1px solid ${P.border}`,
          overflow: "hidden",
          position: "relative",
        }}>
          {/* Editor label */}
          <div style={{
            padding: "5px 12px",
            borderBottom: `1px solid ${P.border}`,
            background: P.panel2,
            fontSize: "10px",
            letterSpacing: "3px",
            color: P.muted,
            flexShrink: 0,
            display: "flex",
            justifyContent: "space-between",
          }}>
            <span>EDITOR</span>
            <span style={{ color: P.accent }}>*.tama</span>
          </div>

          {/* Editor body */}
          <div style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative" }}>

            {/* Line numbers column (non-scrollable, synced) */}
            <div
              ref={lineColRef}
              style={{
                width: "40px",
                background: P.panel2,
                borderRight: `1px solid ${P.border}`,
                overflowY: "hidden",
                flexShrink: 0,
                paddingTop: "12px",
                scrollbarWidth: "none",
              }}
            >
              {codeLines.map((_, i) => (
                <div key={i} style={{
                  height: "21px", lineHeight: "21px",
                  textAlign: "right", paddingRight: "8px",
                  fontSize: "11px", color: P.muted,
                  userSelect: "none",
                }}>
                  {i + 1}
                </div>
              ))}
            </div>

            {/* Textarea */}
            <textarea
              ref={textareaRef}
              value={code}
              onChange={e => setCode(e.target.value)}
              onScroll={syncScroll}
              onKeyDown={e => {
                if (e.key === "Tab") {
                  e.preventDefault();
                  const s = e.target.selectionStart;
                  const n = code.slice(0, s) + "    " + code.slice(e.target.selectionEnd);
                  setCode(n);
                  requestAnimationFrame(() => {
                    e.target.selectionStart = e.target.selectionEnd = s + 4;
                  });
                }
              }}
              spellCheck={false}
              style={{
                flex: 1,
                background: "transparent",
                color: "transparent",
                caretColor: P.red,
                border: "none",
                outline: "none",
                padding: "12px 16px",
                fontSize: "13px",
                lineHeight: "21px",
                fontFamily: "inherit",
                resize: "none",
                overflowY: "auto",
                position: "absolute",
                inset: 0,
                paddingLeft: "12px",
                zIndex: 2,
              }}
            />

            {/* Syntax highlight overlay */}
            <div style={{
              position: "absolute",
              inset: 0,
              paddingTop: "12px",
              paddingLeft: "12px",
              paddingRight: "16px",
              overflowY: "hidden",
              pointerEvents: "none",
              zIndex: 1,
            }}>
              {codeLines.map((ln, i) => (
                <div key={i} style={{
                  height: "21px", lineHeight: "21px",
                  whiteSpace: "pre", fontSize: "13px",
                }}>
                  {tokenizeLine(ln, "tama").map((tk, j) => (
                    <span key={j} style={{ color: tk.color }}>{tk.t}</span>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div style={{ flex: "0 0 46%", display: "flex", flexDirection: "column", overflow: "hidden" }}>

          {/* Output/JS tabs */}
          <div style={{
            display: "flex",
            borderBottom: `1px solid ${P.border}`,
            background: P.panel2,
            flexShrink: 0,
          }}>
            {[["output", "OUTPUT 出力"], ["js", "TRANSPILED JS"]].map(([id, label]) => (
              <button key={id} onClick={() => setActiveTab(id)} style={{
                background: "none",
                border: "none",
                borderBottom: activeTab === id ? `2px solid ${P.red}` : "2px solid transparent",
                color: activeTab === id ? P.white : P.muted,
                padding: "6px 14px",
                fontSize: "10px",
                letterSpacing: "2px",
                cursor: "pointer",
                fontFamily: "inherit",
                transition: "color 0.15s",
              }}>
                {label}
              </button>
            ))}
            <div style={{ flex: 1 }} />
            {hasRun && !error && (
              <span style={{
                alignSelf: "center", marginRight: "12px",
                fontSize: "10px", color: P.green, letterSpacing: "1px",
              }}>
                ✓ {output.length} line{output.length !== 1 ? "s" : ""}
              </span>
            )}
            {error && (
              <span style={{
                alignSelf: "center", marginRight: "12px",
                fontSize: "10px", color: P.red, letterSpacing: "1px",
              }}>
                ✕ ERROR
              </span>
            )}
          </div>

          {/* Panel body */}
          <div ref={outputRef} style={{
            flex: 1, overflow: "auto", background: P.bg,
          }}>

            {/* ── OUTPUT view ── */}
            {activeTab === "output" && (
              <div style={{ padding: "12px 16px" }}>
                {!hasRun && (
                  <div style={{
                    color: P.muted, fontSize: "12px",
                    letterSpacing: "1px", lineHeight: "2",
                  }}>
                    <div>▷ Press <span style={{ color: P.accent }}>RUN</span> or <span style={{ color: P.accent }}>⌘↵</span> to execute</div>
                    <div style={{ marginTop: "24px", opacity: 0.5, fontSize: "11px" }}>
                      <div>keywords  →  highlighted in <span style={{ color: P.accent }}>gold</span></div>
                      <div>strings   →  highlighted in <span style={{ color: P.green }}>green</span></div>
                      <div>numbers   →  highlighted in <span style={{ color: P.blue }}>blue</span></div>
                      <div>shin/uso/mu →  <span style={{ color: P.purple }}>purple</span></div>
                    </div>
                  </div>
                )}

                {error && (
                  <div style={{
                    color: P.red, fontSize: "12px",
                    border: `1px solid ${P.redDim}`,
                    background: `${P.redDim}33`,
                    padding: "10px 14px",
                    marginBottom: "12px",
                    lineHeight: "1.6",
                  }}>
                    <div style={{ letterSpacing: "2px", marginBottom: "4px", fontSize: "10px" }}>✕ RUNTIME ERROR</div>
                    {error}
                  </div>
                )}

                {output.map((line, i) => (
                  <div key={i} style={{
                    display: "flex", gap: "10px",
                    padding: "3px 0",
                    borderBottom: i < output.length - 1 ? `1px solid ${P.border}33` : "none",
                    lineHeight: "1.7",
                  }}>
                    <span style={{ color: P.red, opacity: 0.5, flexShrink: 0, fontSize: "11px", marginTop: "1px" }}>▷</span>
                    <span style={{ color: P.white, fontSize: "13px", wordBreak: "break-all" }}>{line}</span>
                  </div>
                ))}

                {hasRun && !error && output.length === 0 && (
                  <div style={{ color: P.muted, fontSize: "12px" }}>(no output)</div>
                )}
              </div>
            )}

            {/* ── TRANSPILED JS view ── */}
            {activeTab === "js" && (
              <div style={{ padding: "12px 0" }}>
                {!jsCode ? (
                  <div style={{ color: P.muted, fontSize: "12px", padding: "0 16px" }}>
                    Run the program first to see transpiled JavaScript
                  </div>
                ) : (
                  <div>
                    <div style={{
                      padding: "4px 16px 8px",
                      fontSize: "10px", letterSpacing: "2px",
                      color: P.muted2,
                      borderBottom: `1px solid ${P.border}`,
                      marginBottom: "4px",
                    }}>
                      TAMASHII → JavaScript (auto-generated)
                    </div>
                    {jsLines.map((ln, i) => (
                      <div key={i} style={{ display: "flex", minHeight: "21px" }}>
                        <span style={{
                          width: "40px", flexShrink: 0,
                          color: P.muted, fontSize: "11px",
                          lineHeight: "21px", textAlign: "right",
                          paddingRight: "10px", userSelect: "none",
                        }}>
                          {i + 1}
                        </span>
                        <span style={{
                          whiteSpace: "pre", fontSize: "13px",
                          lineHeight: "21px", paddingRight: "16px",
                        }}>
                          {tokenizeLine(ln, "js").map((tk, j) => (
                            <span key={j} style={{ color: tk.color }}>{tk.t}</span>
                          ))}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── STATUS BAR ── */}
      <div style={{
        height: "24px",
        background: P.redDim,
        borderTop: `1px solid ${P.red}44`,
        display: "flex",
        alignItems: "center",
        padding: "0 16px",
        gap: "20px",
        flexShrink: 0,
      }}>
        <span style={{ fontSize: "10px", letterSpacing: "2px", color: "#ffffff88" }}>
          {EXAMPLES[activeEx].ep} — {EXAMPLES[activeEx].title}
        </span>
        <span style={{ fontSize: "10px", color: "#ffffff44" }}>|</span>
        <span style={{ fontSize: "10px", color: "#ffffff88", letterSpacing: "1px" }}>
          {codeLines.length} lines
        </span>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: "10px", letterSpacing: "2px", color: "#ffffff66", fontFamily: "Georgia, serif" }}>
          魂 TAMASHII — The Soul of Code
        </span>
      </div>
    </div>
  );
}
