# TAMASHII 魂

> *The anime-inspired programming language where code has spirit.*

**[Live IDE →](https://klinge.github.io/tamashii)**  |  **[Project Page →](https://tamashii.klin.ge)**

---

## Language Reference

| Keyword | Kanji | Meaning | Role |
|---|---|---|---|
| `tamashii` | 魂 | soul | Variable declaration |
| `jutsu` | 術 | technique | Function definition |
| `nakama` | 仲間 | companion | Class / struct |
| `hajime` | 始め | begin | Entry point |
| `kataru` | 語る | narrate | Print / output |
| `moshi` | もし | if | Conditional |
| `soredemo` | それでも | even so | Else |
| `kurikaeshi` | 繰り返し | repeat | Loop |
| `yobu` | 呼ぶ | summon | Import |
| `modoru` | 戻る | return | Return value |
| `mu` | 無 | nothingness | Null |
| `shin` | 真 | truth | Boolean true |
| `uso` | 嘘 | lie | Boolean false |
| `chikara` | 力 | power | Constant |
| `koe` | 声 | voice | String type |
| `kazu` | 数 | number | Number type |
| `nani` | 何 | what | Any type |
| `owari` | 終わり | the end | Break / exit |

## Hello World

```tamashii
hajime {
    kataru "Konnichiwa, Sekai!"
}
```

## Functions

```tamashii
jutsu checkPower(level) {
    moshi level > 9000 {
        kataru "IT'S OVER NINE THOUSAND!"
        modoru shin
    } soredemo {
        kataru "Power: " + level
        modoru uso
    }
}

hajime {
    checkPower(9001)
}
```

## Classes

```tamashii
nakama Warrior {
    tamashii name = "Unknown"
    tamashii level = 1

    jutsu train() {
        level = level + 1
    }

    jutsu status() {
        kataru "[ " + name + " ] LV." + level
    }
}

hajime {
    tamashii hero = Warrior()
    hero.name = "Ichigo"
    hero.train()
    hero.status()
}
```

## How it works

TAMASHII transpiles to JavaScript and runs in the browser via `new Function()`.
The transpiler is a single-pass regex transformer — TAMASHII is basically JavaScript
wearing a very stylish kimono.

## Local development

```bash
npm install
npm run dev
```

## Deploy

Push to `main` — GitHub Actions handles the rest.

---

*TAMASHII v1.0 — The Soul of Code*
