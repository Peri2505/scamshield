# Contributing

The most valuable contribution is a new or updated scam tactic in `src/analyzer/patterns.ts`:

1. Add a `RedFlag` with a plain-language `why` that could be read aloud to an older adult.
2. Add at least one example to `test/analyzer.test.ts` (a scam it should catch **and**, where relevant, a legitimate message it should not flag).
3. Run `npm test`.

Official numbers in `src/contacts.ts` must link to an official source in the PR description.
