import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { XIcon } from 'lucide-react'
import type { GeocodeCandidate } from './types'
import { SEARCH_DEBOUNCE_MS, SEARCH_MIN_QUERY_LENGTH } from './constants'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

type SearchStatus = 'idle' | 'loading' | 'results' | 'no-results' | 'error'

interface LocationSearchProps {
  /** Search-box text to start with, seeded from the URL's `q` when a valid search is restored. */
  initialQuery: string
  /** Commit a chosen candidate as the active search (writes the URL). */
  onSelect: (candidate: GeocodeCandidate) => void
  /** Clear the active search and strip its URL params. */
  onClear: () => void
}

export function LocationSearch({ initialQuery, onSelect, onClear }: LocationSearchProps) {
  const [query, setQuery] = useState(initialQuery)
  const [candidates, setCandidates] = useState<GeocodeCandidate[]>([])
  const [status, setStatus] = useState<SearchStatus>('idle')
  const [activeIndex, setActiveIndex] = useState(-1)
  const [isOpen, setIsOpen] = useState(false)
  const skipNextSearchRef = useRef(false)

  useEffect(() => {
    if (skipNextSearchRef.current) {
      skipNextSearchRef.current = false
      return
    }

    const trimmed = query.trim()
    if (trimmed.length < SEARCH_MIN_QUERY_LENGTH) {
      setCandidates([])
      setStatus('idle')
      setIsOpen(false)
      return
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => {
      setStatus('loading')
      fetch(`/api/geocode?q=${encodeURIComponent(trimmed)}`, { signal: controller.signal })
        .then((res) => {
          if (!res.ok) throw new Error(`Geocode request failed: ${res.status}`)
          return res.json() as Promise<GeocodeCandidate[]>
        })
        .then((results) => {
          setCandidates(results)
          setActiveIndex(-1)
          setStatus(results.length === 0 ? 'no-results' : 'results')
          setIsOpen(true)
        })
        .catch((err) => {
          if (err instanceof DOMException && err.name === 'AbortError') return
          console.error('Geocode search failed', err)
          setCandidates([])
          setStatus('error')
          setIsOpen(true)
        })
    }, SEARCH_DEBOUNCE_MS)

    return () => {
      clearTimeout(timeoutId)
      controller.abort()
    }
  }, [query])

  function selectCandidate(candidate: GeocodeCandidate) {
    skipNextSearchRef.current = true
    onSelect(candidate)
    setQuery(candidate.label)
    setCandidates([])
    setStatus('idle')
    setIsOpen(false)
  }

  function clearSearch() {
    skipNextSearchRef.current = true
    setQuery('')
    setCandidates([])
    setStatus('idle')
    setActiveIndex(-1)
    setIsOpen(false)
    onClear()
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (!isOpen || candidates.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => (i + 1) % candidates.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => (i <= 0 ? candidates.length - 1 : i - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (activeIndex >= 0) selectCandidate(candidates[activeIndex])
    } else if (e.key === 'Escape') {
      setIsOpen(false)
    }
  }

  return (
    <div className="absolute top-[70px] left-2.5 z-[1000] w-[260px] font-sans">
      <div className="relative">
        <Input
          type="text"
          className="bg-background pr-8 shadow-md"
          placeholder="Search address or postal code"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => candidates.length > 0 && setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 100)}
        />
        {query !== '' && (
          <button
            type="button"
            aria-label="Clear search"
            className="text-muted-foreground hover:text-foreground absolute top-1/2 right-1.5 -translate-y-1/2 rounded-sm p-0.5"
            onMouseDown={(e) => e.preventDefault()}
            onClick={clearSearch}
          >
            <XIcon className="size-4" />
          </button>
        )}
      </div>
      {isOpen && status === 'results' && (
        <ul
          role="listbox"
          className="bg-popover text-popover-foreground mt-1 max-h-[220px] list-none overflow-y-auto rounded-lg border border-border p-0 py-1 shadow-md"
        >
          {candidates.map((candidate, index) => (
            <li
              key={`${candidate.latitude}-${candidate.longitude}-${index}`}
              role="option"
              aria-selected={index === activeIndex}
              className={cn(
                'cursor-pointer px-2.5 py-1.5 text-sm',
                index === activeIndex && 'bg-accent text-accent-foreground'
              )}
              onMouseDown={() => selectCandidate(candidate)}
              onMouseEnter={() => setActiveIndex(index)}
            >
              {candidate.label}
            </li>
          ))}
        </ul>
      )}
      {isOpen && status === 'no-results' && (
        <div className="bg-popover text-muted-foreground mt-1 rounded-lg border border-border px-2.5 py-1.5 text-sm shadow-md">
          No results found
        </div>
      )}
      {isOpen && status === 'error' && (
        <div className="bg-popover text-destructive mt-1 rounded-lg border border-border px-2.5 py-1.5 text-sm shadow-md">
          Search failed. Please try again.
        </div>
      )}
    </div>
  )
}
