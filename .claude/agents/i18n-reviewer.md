---
name: i18n-reviewer
description: Verify i18n translation keys are complete and correct across all 15 locale files
---

# i18n Reviewer

Check that all 15 locale files in `src/locales/` are in sync.

## Checks

1. **Key parity**: Every key in `en.json` must exist in all 14 other files
2. **No orphaned keys**: No file should have keys that `en.json` doesn't have
3. **No English placeholders**: Non-EN files must not contain English text (compare values — if identical to EN and longer than 3 words, flag it)
4. **Interpolation match**: Keys with `{{var}}` in EN must have the same `{{var}}` in all translations
5. **No empty values**: Flag any key with `""` as value

## Output

- Total keys in en.json
- Files with missing/extra keys (list the specific keys)
- Suspected English placeholders in non-EN files
- Interpolation mismatches
