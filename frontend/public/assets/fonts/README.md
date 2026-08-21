# Fonts

Both faces are installed and subset. Do not replace them with the full
downloads without re-subsetting — Inter's complete variable font is 352 kB.

| Face    | Source                                  | Licence   | File                     | Size  |
|---------|-----------------------------------------|-----------|--------------------------|-------|
| Satoshi | https://api.fontshare.com/v2/css?f[]=satoshi@1 | Fontshare | `Satoshi-Variable.woff2` | 27 kB |
| Inter   | https://rsms.me/inter/font-files/InterVariable.woff2 | SIL OFL | `Inter-Variable.woff2`   | 60 kB |

## Subsetting

Both are cut to the characters a French site uses — basic Latin, Latin-1
Supplement, Latin Extended-A, typographic punctuation (’ « » — … €) and the
few symbols in the UI (★ → ↗ ☎). The weight axis is preserved because the
design uses 400/500/600/700.

```bash
cd .assets-src && python subset-fonts.py
```

Inter went 352 kB → 60 kB (−83%), Satoshi 43 kB → 27 kB (−36%).

If new copy introduces a character outside that range it renders as a
fallback glyph. Add its codepoint to `UNICODES` in `subset-fonts.py` and
re-run.
