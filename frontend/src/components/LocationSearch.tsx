import { useEffect, useState, type KeyboardEvent } from 'react'
import type { GeocodeCandidate } from '../types'
import { SEARCH_DEBOUNCE_MS, SEARCH_MIN_QUERY_LENGTH } from '../constants'

type SearchStatus = 'idle' | 'loading' | 'results' | 'no-results' | 'error'

export function LocationSearch({ onSelect }: { onSelect: (candidate: GeocodeCandidate) => void }) {
  const [query, setQuery] = useState('')
  const [candidates, setCandidates] = useState<GeocodeCandidate[]>([])
  const [status, setStatus] = useState<SearchStatus>('idle')
  const [activeIndex, setActiveIndex] = useState(-1)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
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
    onSelect(candidate)
    setQuery(candidate.label)
    setCandidates([])
    setStatus('idle')
    setIsOpen(false)
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
    <div className="location-search">
      <input
        type="text"
        className="location-search-input"
        placeholder="Search address or postal code"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => candidates.length > 0 && setIsOpen(true)}
        onBlur={() => setTimeout(() => setIsOpen(false), 100)}
      />
      {isOpen && status === 'results' && (
        <ul className="location-search-results" role="listbox">
          {candidates.map((candidate, index) => (
            <li
              key={`${candidate.latitude}-${candidate.longitude}-${index}`}
              role="option"
              aria-selected={index === activeIndex}
              className={index === activeIndex ? 'active' : ''}
              onMouseDown={() => selectCandidate(candidate)}
              onMouseEnter={() => setActiveIndex(index)}
            >
              {candidate.label}
            </li>
          ))}
        </ul>
      )}
      {isOpen && status === 'no-results' && <div className="location-search-message">No results found</div>}
      {isOpen && status === 'error' && (
        <div className="location-search-message location-search-error">Search failed. Please try again.</div>
      )}
    </div>
  )
}
