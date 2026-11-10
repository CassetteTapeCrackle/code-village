# Triage

Sentences the owner settles.

## Hidden cases refuse an equal number of another type

Decided by the owner on 2026-11-05: hidden cases keep comparing exactly, so `5` where the solution gives `5.0` is
refused. No right answer was bent to fit it.

## Feature order: prompts that introduce what no lesson teaches yet

Every lesson now lists `teaches`, and code was rewritten to use only what is taught by then (owner, 2026-11-05:
rewrite, never teach earlier). Decided by the owner on 2026-11-05:

- errors-safe-divide: the errors lesson now says that dividing by zero raises `ZeroDivisionError`.
- gradebook, stage 3-ranking: the lambda tip stays as the boss's stretch; the model solution ranks with a loop.
- guessing-stone, stage 2: the prompt no longer names `strip` and `isdecimal`.

## Hard mode states every rule

Decided by the owner on 2026-11-05: hard mode only drops the starter code. Every rule a hard test checks is now in
a stage prompt (gradebook, lost-satchel, songbird-playlist, ranger-registry, sales-report, data-summary,
star-classifier), and the boss screen says "more tests" instead of "stricter tests".

## blind: lost-satchel, attempt 0 <!-- session triage -->

- decision: model-wrong (by the session)
- note: The parse prompt shows this exact case, so the attempt is wrong: two word item: parse("take old lamp") returned ('take', 'old'), expected ('take', 'old lamp') ^

## blind: lost-satchel, attempt 1 <!-- session triage -->

- decision: model-wrong (by the session)
- note: The parse prompt shows this exact case, so the attempt is wrong: two word item: parse("take old lamp") returned ('take', 'old'), expected ('take', 'old lamp') ^

## blind: lost-satchel, attempt 2 <!-- session triage -->

- decision: model-wrong (by the session)
- note: The parse prompt shows this exact case, so the attempt is wrong: two word item: parse("take old lamp") returned ('take', 'old'), expected ('take', 'old lamp') ^

## blind: lost-satchel, attempt 3 <!-- session triage -->

- decision: model-wrong (by the session)
- note: The parse prompt shows this exact case, so the attempt is wrong: two word item: parse("take old lamp") returned ('take', 'old'), expected ('take', 'old lamp') ^

## blind: values-next-number, attempt 2 <!-- session triage -->

- decision: model-wrong (by the session)
- note: DeepSeek returned text where the prompt asks for the next number: We also tried next_number('0'): expected 1, your code returned '1'. The visible test caught it too.
