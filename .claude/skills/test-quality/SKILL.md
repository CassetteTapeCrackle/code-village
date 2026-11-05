---
name: test-quality
description: Use when writing tests, or reviewing tests in a diff or PR. Judges the tests themselves - do they pin behavior, would they catch a regression, are they readable and independent. Not for reviewing the code under test.
---

# Test quality

The question for every test: if the code broke, would this fail, and would the failure say why?

## Behavior, not implementation
- Assert on outputs and observable effects, not on which private helper was called.
- A refactor that keeps behavior should not break a test. If it would, the test is coupled to internals.

## Would it catch the bug?
- Mentally break the code (flip a condition, return early, off-by-one). If no test fails, coverage is fake.
- Edge cases that matter: empty, one, many, boundary values, invalid input, the error path.
- Regression tests reproduce the original bug's input exactly.

## Mocks
- Mock at the system boundary (network, clock, filesystem, randomness), not your own code.
- A test where everything is mocked tests the mocks. Prefer a real collaborator or a small fake.

## Reliability
- No sleeps for timing; wait on a condition or inject the clock.
- Tests are independent: any order, any subset, in parallel. No shared mutable state.
- Deterministic: seeded randomness, fixed time, no dependence on the machine or network.

## Readability
- Name says the scenario and the expectation: `rejects_expired_token`, not `test_auth_2`.
- Arrange, act, assert. One behavior per test; several asserts on that one outcome is fine.
- The failure message points at the cause without opening the debugger.
