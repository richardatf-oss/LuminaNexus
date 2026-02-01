# IvritCode Specification — Niqqud Modifier Semantics  
## SPEC_NIQQUD.md  
### Version v0.1 (Draft / Canonical)

> _“The letters are the body of the language.  
> The niqqud are its breath.”_

This document defines the **niqqud (vowel-point) modifier system** for IvritCode.  
It extends the base alphabet semantics defined in `SPEC.md` without altering them.

Niqqud marks do **not** introduce new opcodes.  
Instead, they act as **deterministic modifiers** that transform how a base letter-operator behaves for a single instruction.

---

## 1. Scope and Design Principles

### 1.1 Non-invasive extension

- Base letter semantics (א–ת) remain exactly as defined in `SPEC.md`.
- Niqqud **wrap** or **parameterize** those semantics.
- No niqqud changes the identity of a letter; it only modifies execution.

### 1.2 Compositionality

- Multiple niqqud may appear on a single letter.
- Their effects **compose deterministically** along well-defined semantic axes.
- No niqqud introduces ambiguity or non-determinism.

### 1.3 Universality

- All 22 Hebrew letter-registers (א–ת) are fully functional.
- No register is “passive memory.”
- Niqqud provide full addressing, repetition, purity, and global interaction.

---

## 2. Machine Model (Recap)

IvritCode operates on:

- **23 registers**:
  - `R[0..21]` → א..ת
  - `R[22]` → `A` (Aleph-Olam, global register)

- **Abstract roles** used by base opcodes:
  - `α` — primary source
  - `β` — secondary source
  - `γ` — primary result
  - `δ` — secondary result

Base opcodes are defined in terms of these roles, not fixed registers.

### 2.1 Default role binding

Unless modified:

- `α → א`
- `β → ב`
- `γ → ג`
- `δ → ד`

Niqqud may override this binding **per instruction**.

---

## 3. Semantic Axes

Each niqqud mark may affect one or more of the following axes:

| Axis | Name | Description |
|-----|------|-------------|
| A | Addressing | How roles α,β,γ,δ bind to registers |
| I | Immediate | Numeric literals (e.g. +1, 2, 3) |
| S | Scope | Repetition, iteration, or spread |
| G | Global / A-Mode | Interaction with Aleph-Olam (A) |
| P | Purity | Whether register writes occur |

### 3.1 Composition order

When multiple niqqud are present, modifiers are applied in this conceptual order:

1. **Addressing**
2. **Immediate / Scope**
3. **Purity / A-mode**

This order is fixed and deterministic.

---

## 4. Master Niqqud Table

### Axes Legend
- **A** = Addressing  
- **I** = Immediate  
- **S** = Scope  
- **G** = Global / A  
- **P** = Purity  

---

### 4.1 Sheva & Hataf Family

| Mark | Name | Axes | Semantics |
|----|----|----|----|
| ְ | Sheva | A | **Ground state.** Forces canonical role binding (α→א, β→ב, γ→ג, δ→ד) for this instruction. Overrides other addressing marks unless they explicitly bind a specific role. |
| ֲ | Hataf Pataḥ | A | **Self-acting.** For letter X: α→X and γ→X. β,δ unchanged. |
| ֱ | Hataf Segol | A,I | **Self-acting triad.** α→X, γ→X, and β→next(X) cyclically if not otherwise bound. |
| ֳ | Hataf Qamatz | A,S | **Self-acting with closure.** α→X, γ→X, and for iterable ops, apply repeatedly until stable (or max-iteration cap). |

---

### 4.2 A-Vowels

| Mark | Name | Axes | Semantics |
|----|----|----|----|
| ַ | Pataḥ | I | **Immediate +1.** Introduces literal `+1`. For arithmetic ops: add 1. |
| ָ | Qamatz | S | **Fullness / closure.** Repeat opcode until state stabilizes or max iteration is reached. |

---

### 4.3 E-Vowels

| Mark | Name | Axes | Semantics |
|----|----|----|----|
| ֶ | Segol | I,S | **Triad / triple.** Immediate `k=3`. Repeat-aware ops execute three times; triadic arithmetic may combine α,β,γ. |
| ֵ | Tsere | I,A,S | **Duality.** Immediate `k=2`. Emphasizes pair-mode (α,β) and/or two executions. |

---

### 4.4 I-Vowel

| Mark | Name | Axes | Semantics |
|----|----|----|----|
| ִ | Ḥiriq | P,G | **Pure observation.** Opcode runs internally but commits no register writes except to A, which receives the primary result. |

---

### 4.5 O-Vowel

| Mark | Name | Axes | Semantics |
|----|----|----|----|
| ֹ | Ḥolam | G | **A-fusion.** A acts as operand and accumulator. After execution, A′ = A + main result. |

---

### 4.6 U-Vowels

| Mark | Name | Axes | Semantics |
|----|----|----|----|
| ֻ | Qubutz | S,I | **Fixed flow.** Repeat opcode 3 times sequentially. |
| וּ | Shuruk | S,G | **A-driven flow.** Repeat opcode |A| times (or via defined A-based rule). |

---

### 4.7 Strength Marks

| Mark | Name | Axes | Semantics |
|----|----|----|----|
| ּ | Dagesh | S,A | **Strength / spread.** Expands opcode scope from local roles to a register window or full alphabet. Global ops select a stronger variant. |
| מַפִּיק | Mappiq | A | **Forced participation.** Ensures the marked letter’s register is bound to a role (preferably γ). |

---

## 5. Addressing Reference (Roles)

### 5.1 Default

| Condition | Binding |
|---------|--------|
| No addressing marks | α→א, β→ב, γ→ג, δ→ד |
| Sheva present | Force canonical binding |

---

### 5.2 Self-acting Hataf

For letter **X**:

| Mark | Role Binding |
|----|----|
| ֲ | α→X, γ→X |
| ֱ | α→X, γ→X, β→next(X) |
| ֳ | α→X, γ→X + iterative closure |

---

### 5.3 Mappiq

- Forces letter X to be bound to a result role (γ preferred).
- If γ is occupied, binds X to next available role by priority.

---

### 5.4 Dagesh

- Does **not** rebind roles.
- Expands **where** the opcode applies (windowed or global).

---

## 6. Determinism

All niqqud semantics are deterministic:

- Same program text
- Same initial state  
⇒ same execution trace and final state.

No niqqud introduces randomness or ambiguity.

---

## 7. Relationship to Other Specs

- `SPEC.md` — Base letter semantics (v0.0)
- `SPEC_NIQQUD.md` — This document (v0.1)
- `SPEC_TROP.md` — Cantillation & control flow (future)

When all layers are complete, these may be unified into:

> **IvritCode v1.0 — Full Language Specification**

---

_End of SPEC_NIQQUD.md_
