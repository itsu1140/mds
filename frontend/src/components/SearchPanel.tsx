import { useState, useEffect, useRef, useCallback } from 'react'

interface Match { start: number; end: number }

function findMatches(content: string, term: string, useRegex: boolean, caseSensitive: boolean): Match[] {
    if (!term) return []
    try {
        const flags = caseSensitive ? 'g' : 'gi'
        const pattern = useRegex ? term : term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        const re = new RegExp(pattern, flags)
        const result: Match[] = []
        let m
        while ((m = re.exec(content)) !== null) {
            result.push({ start: m.index, end: m.index + m[0].length })
            if (m[0].length === 0) { if (++re.lastIndex > content.length) break }
        }
        return result
    } catch {
        return []
    }
}

function isValidRegex(term: string): boolean {
    try { new RegExp(term); return true } catch { return false }
}

interface Props {
    content: string
    onChange: (val: string) => void
    editorRef: React.RefObject<HTMLDivElement>
    showReplace: boolean
    onClose: () => void
}

export default function SearchPanel({ content, onChange, editorRef, showReplace: initReplace, onClose }: Props) {
    const [term, setTerm] = useState('')
    const [replacement, setReplacement] = useState('')
    const [useRegex, setUseRegex] = useState(false)
    const [caseSensitive, setCaseSensitive] = useState(false)
    const [matchIndex, setMatchIndex] = useState(0)
    const [showReplace, setShowReplace] = useState(initReplace)
    const inputRef = useRef<HTMLInputElement>(null)

    const matches = findMatches(content, term, useRegex, caseSensitive)
    const count = matches.length
    const safeIndex = count > 0 ? Math.min(matchIndex, count - 1) : 0
    const invalidRegex = useRegex && !!term && !isValidRegex(term)

    useEffect(() => { inputRef.current?.focus() }, [])
    useEffect(() => { setMatchIndex(0) }, [term, useRegex, caseSensitive])

    const scrollToMatch = useCallback((idx: number, ms: Match[]) => {
        if (!ms.length) return
        const textarea = editorRef.current?.querySelector('textarea')
        if (!textarea) return
        const linesBefore = content.slice(0, ms[idx].start).split('\n').length - 1
        const totalLines = Math.max(1, content.split('\n').length)
        textarea.scrollTop = (linesBefore / totalLines) * textarea.scrollHeight
    }, [content, editorRef])

    const goNext = () => {
        const next = count > 0 ? (safeIndex + 1) % count : 0
        setMatchIndex(next)
        scrollToMatch(next, matches)
    }

    const goPrev = () => {
        const prev = count > 0 ? (safeIndex - 1 + count) % count : 0
        setMatchIndex(prev)
        scrollToMatch(prev, matches)
    }

    const replaceOne = () => {
        if (!count) return
        const m = matches[safeIndex]
        let replaced: string
        if (useRegex) {
            try {
                replaced = content.slice(m.start, m.end).replace(
                    new RegExp(term, caseSensitive ? '' : 'i'),
                    replacement
                )
            } catch { return }
        } else {
            replaced = replacement
        }
        onChange(content.slice(0, m.start) + replaced + content.slice(m.end))
    }

    const replaceAllMatches = () => {
        if (!term || invalidRegex) return
        try {
            const flags = caseSensitive ? 'g' : 'gi'
            const pattern = useRegex ? term : term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
            onChange(content.replace(new RegExp(pattern, flags), replacement))
            setMatchIndex(0)
        } catch { /* invalid regex */ }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') { onClose(); return }
        if (e.key === 'Enter') { e.preventDefault(); e.shiftKey ? goPrev() : goNext() }
    }

    const countLabel = term && !invalidRegex ? `${count > 0 ? safeIndex + 1 : 0} / ${count}` : ''

    return (
        <div className="search-panel">
            <div className="search-row">
                <button
                    className={`search-expand${showReplace ? ' active' : ''}`}
                    onClick={() => setShowReplace(v => !v)}
                    title="置換を表示/非表示"
                >{showReplace ? '▾' : '▸'}</button>
                <input
                    ref={inputRef}
                    className={`search-input${invalidRegex ? ' invalid' : ''}`}
                    placeholder="検索"
                    value={term}
                    onChange={e => setTerm(e.target.value)}
                    onKeyDown={handleKeyDown}
                />
                <button className={`search-toggle${useRegex ? ' active' : ''}`} onClick={() => setUseRegex(v => !v)} title="正規表現">.*</button>
                <button className={`search-toggle${caseSensitive ? ' active' : ''}`} onClick={() => setCaseSensitive(v => !v)} title="大文字/小文字を区別">Aa</button>
                <span className="search-count">{countLabel}</span>
                <button className="search-nav" onClick={goPrev} title="前へ (Shift+Enter)">↑</button>
                <button className="search-nav" onClick={goNext} title="次へ (Enter)">↓</button>
                <button className="search-close" onClick={onClose}>×</button>
            </div>
            {showReplace && (
                <div className="search-row">
                    <span className="search-expand-spacer" />
                    <input
                        className="search-input"
                        placeholder="置換後"
                        value={replacement}
                        onChange={e => setReplacement(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Escape') onClose() }}
                    />
                    <button className="search-btn" onClick={replaceOne} disabled={!count}>置換</button>
                    <button className="search-btn" onClick={replaceAllMatches} disabled={!term || invalidRegex}>すべて置換</button>
                </div>
            )}
        </div>
    )
}
