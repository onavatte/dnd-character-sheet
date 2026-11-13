import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';

function useCommittedDraft(
  value: string,
  onCommit: (nextValue: string) => void,
) {
  const [draft, setDraft] = useState(value);
  const draftRef = useRef(draft);
  const committedValueRef = useRef(value);
  const onCommitRef = useRef(onCommit);

  draftRef.current = draft;
  committedValueRef.current = value;
  onCommitRef.current = onCommit;

  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    return () => {
      if (draftRef.current !== committedValueRef.current) {
        onCommitRef.current(draftRef.current);
      }
    };
  }, []);

  const commitIfChanged = () => {
    if (draftRef.current !== committedValueRef.current) {
      onCommitRef.current(draftRef.current);
    }
  };

  return { draft, setDraft, commitIfChanged };
}

export interface CommittedTextInputProps {
  id: string;
  name: string;
  value: string;
  placeholder?: string;
  required?: boolean;
  maxLength?: number;
  ariaDescribedBy?: string;
  onCommit: (nextValue: string) => void;
}

/**
 * Champ texte avec état local pendant la frappe et validation atomique au blur,
 * à la touche Entrée (hors composition IME) ou au démontage pour ne pas saturer Undo/Redo.
 */
export function CommittedTextInput({
  id,
  name,
  value,
  placeholder,
  required,
  maxLength,
  ariaDescribedBy,
  onCommit,
}: CommittedTextInputProps) {
  const { draft, setDraft, commitIfChanged } = useCommittedDraft(value, onCommit);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
      e.preventDefault();
      commitIfChanged();
      e.currentTarget.blur();
    }
  };

  return (
    <input
      id={id}
      name={name}
      type="text"
      className="forge-input"
      value={draft}
      placeholder={placeholder}
      required={required}
      maxLength={maxLength}
      aria-describedby={ariaDescribedBy}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commitIfChanged}
      onKeyDown={handleKeyDown}
    />
  );
}

export interface CommittedTextAreaProps {
  id: string;
  name: string;
  value: string;
  rows?: number;
  maxLength?: number;
  placeholder?: string;
  onCommit: (nextValue: string) => void;
}

/**
 * Zone de saisie multiligne avec brouillon local et validation atomique au blur ou démontage.
 */
export function CommittedTextArea({
  id,
  name,
  value,
  rows = 5,
  maxLength,
  placeholder,
  onCommit,
}: CommittedTextAreaProps) {
  const { draft, setDraft, commitIfChanged } = useCommittedDraft(value, onCommit);

  return (
    <textarea
      id={id}
      name={name}
      className="grimoire-textarea"
      rows={rows}
      maxLength={maxLength}
      placeholder={placeholder}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commitIfChanged}
    />
  );
}

export interface NumberStepperProps {
  id: string;
  name: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  decrementLabel: string;
  incrementLabel: string;
  onChange: (nextValue: number) => void;
}

export function NumberStepper({
  id,
  name,
  value,
  min,
  max,
  step = 1,
  decrementLabel,
  incrementLabel,
  onChange,
}: NumberStepperProps) {
  const clamp = (raw: number) => Math.min(max, Math.max(min, raw));

  return (
    <div className="forge-number-stepper">
      <button
        type="button"
        className="stepper-btn tabular-nums"
        disabled={value <= min}
        aria-label={decrementLabel}
        onClick={() => onChange(clamp(Math.round((value - step) * 100) / 100))}
      >
        -
      </button>
      <input
        id={id}
        name={name}
        type="number"
        className="forge-input forge-number-input tabular-nums"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => {
          const parsed = Number(e.target.value);
          if (Number.isFinite(parsed)) {
            onChange(clamp(parsed));
          }
        }}
      />
      <button
        type="button"
        className="stepper-btn tabular-nums"
        disabled={value >= max}
        aria-label={incrementLabel}
        onClick={() => onChange(clamp(Math.round((value + step) * 100) / 100))}
      >
        +
      </button>
    </div>
  );
}
