'use client';

import { Loader2, X } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, useTransition } from 'react';

import { suggestLearnersAction, type LearnerSuggestion } from '@/app/actions/learner-search';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { learnersListHref, sanitiseLearnerSearchQuery } from '@/lib/school/learner-search';

const DEBOUNCE_MS = 200;
const SUGGEST_DEBOUNCE_MS = 150;

export function LearnersSearchField({ query }: { query: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(query);
  const [committedQuery, setCommittedQuery] = useState(query);
  const [isPending, startTransition] = useTransition();
  const [suggestions, setSuggestions] = useState<LearnerSuggestion[]>([]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suggestRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suggestRequestId = useRef(0);
  const [focused, setFocused] = useState(false);

  if (query !== committedQuery) {
    setCommittedQuery(query);
    if (!focused) {
      setValue(query);
    }
  }

  const navigateToQuery = useCallback(
    (raw: string) => {
      const next = sanitiseLearnerSearchQuery(raw);
      const current = sanitiseLearnerSearchQuery(searchParams.get('q') ?? '');
      const pageParam = searchParams.get('page');
      if (next === current && (!pageParam || pageParam === '1')) {
        return;
      }
      startTransition(() => {
        router.replace(learnersListHref(1, next), { scroll: false });
      });
    },
    [router, searchParams, startTransition],
  );

  const scheduleNavigate = useCallback(
    (raw: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => navigateToQuery(raw), DEBOUNCE_MS);
    },
    [navigateToQuery],
  );

  const loadSuggestions = useCallback((raw: string) => {
    if (suggestRef.current) clearTimeout(suggestRef.current);
    const trimmed = raw.trim();
    if (trimmed.length < 1) {
      setSuggestions([]);
      setSuggestionsOpen(false);
      return;
    }
    suggestRef.current = setTimeout(() => {
      const requestId = ++suggestRequestId.current;
      void suggestLearnersAction(trimmed).then((items) => {
        if (requestId !== suggestRequestId.current) return;
        setSuggestions(items);
        setSuggestionsOpen(items.length > 0);
      });
    }, SUGGEST_DEBOUNCE_MS);
  }, []);

  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (suggestRef.current) clearTimeout(suggestRef.current);
    },
    [],
  );

  const pickSuggestion = (item: LearnerSuggestion) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (suggestRef.current) clearTimeout(suggestRef.current);
    setValue(item.searchText);
    setSuggestionsOpen(false);
    navigateToQuery(item.searchText);
  };

  const onClear = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (suggestRef.current) clearTimeout(suggestRef.current);
    setValue('');
    setSuggestions([]);
    setSuggestionsOpen(false);
    const current = sanitiseLearnerSearchQuery(searchParams.get('q') ?? '');
    if (current) {
      startTransition(() => {
        router.replace('/school/learners', { scroll: false });
      });
    }
  };

  return (
    <div className="relative max-w-md flex-1">
      <Input
        type="search"
        value={value}
        onFocus={() => {
          setFocused(true);
          if (suggestions.length > 0) setSuggestionsOpen(true);
        }}
        onBlur={() => {
          setFocused(false);
          window.setTimeout(() => setSuggestionsOpen(false), 150);
        }}
        onChange={(e) => {
          const next = e.target.value;
          setValue(next);
          scheduleNavigate(next);
          loadSuggestions(next);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            if (debounceRef.current) clearTimeout(debounceRef.current);
            navigateToQuery(value);
            setSuggestionsOpen(false);
          }
          if (e.key === 'Escape') {
            setSuggestionsOpen(false);
          }
        }}
        placeholder="Search by name or grade…"
        aria-label="Search learners"
        aria-busy={isPending}
        aria-autocomplete="list"
        aria-expanded={suggestionsOpen}
        autoComplete="off"
        className={value || isPending ? 'pr-16' : undefined}
      />
      <div className="absolute inset-y-0 right-1 flex items-center gap-0.5">
        {isPending ? (
          <Loader2
            className="size-4 shrink-0 animate-spin text-muted-foreground"
            aria-label="Updating results"
          />
        ) : null}
        {value ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={onClear}
            aria-label="Clear search"
          >
            <X className="size-4" />
          </Button>
        ) : null}
      </div>
      {suggestionsOpen && suggestions.length > 0 ? (
        <ul
          className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-md border border-border bg-popover py-1 text-sm shadow-md"
          role="listbox"
        >
          {suggestions.map((item) => (
            <li key={item.id} role="option" aria-selected="false">
              <button
                type="button"
                className="w-full px-3 py-2 text-left hover:bg-muted"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pickSuggestion(item)}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
