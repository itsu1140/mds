import { useState, useEffect, useRef } from 'react'
import MDEditor from '@uiw/react-md-editor'
import SearchPanel from './SearchPanel'

interface Props {
    currentFile: string | null
    content: string
    saved: boolean
    onChange: (val: string) => void
    onSave: () => void
    sidebarOpen: boolean
    onOpenSidebar: () => void
}

export default function Editor({ currentFile, content, onChange, onSave, sidebarOpen, onOpenSidebar }: Props) {
    const wrapRef = useRef<HTMLDivElement>(null)
    const [searchOpen, setSearchOpen] = useState(false)
    const [showReplace, setShowReplace] = useState(false)
    const isComposingRef = useRef(false)

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault()
                onSave()
                return
            }
            if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
                e.preventDefault()
                setShowReplace(false)
                setSearchOpen(true)
                return
            }
            if ((e.ctrlKey || e.metaKey) && e.key === 'h') {
                e.preventDefault()
                setShowReplace(true)
                setSearchOpen(true)
                return
            }
        }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [onSave])

    // Close search when file changes
    useEffect(() => { setSearchOpen(false) }, [currentFile])

    // IME 変換中の Tab でタブ文字が挿入されないよう抑制 / インデント付き箇条書きの Enter 継続
    useEffect(() => {
        if (!currentFile) return
        const textarea = wrapRef.current?.querySelector('textarea')
        if (!textarea) return
        const onStart = () => { isComposingRef.current = true }
        const onEnd = () => { setTimeout(() => { isComposingRef.current = false }, 0) }
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Tab' && isComposingRef.current) {
                e.preventDefault()
                return
            }
            if (e.key === 'Enter' && !isComposingRef.current) {
                const ta = e.target as HTMLTextAreaElement
                const start = ta.selectionStart
                if (start !== ta.selectionEnd) return
                const lineStart = ta.value.lastIndexOf('\n', start - 1) + 1
                const currentLine = ta.value.slice(lineStart, start)
                const match = currentLine.match(/^(\s+)- /)
                if (!match) return
                e.preventDefault()
                const insertion = '\n' + match[1] + '- '
                const newPos = start + insertion.length
                document.execCommand('insertText', false, insertion)
                requestAnimationFrame(() => ta.setSelectionRange(newPos, newPos))
            }
        }
        textarea.addEventListener('compositionstart', onStart)
        textarea.addEventListener('compositionend', onEnd)
        textarea.addEventListener('keydown', onKeyDown, true)
        return () => {
            textarea.removeEventListener('compositionstart', onStart)
            textarea.removeEventListener('compositionend', onEnd)
            textarea.removeEventListener('keydown', onKeyDown, true)
        }
    }, [currentFile])

    const fileName = currentFile?.split('/').pop()?.replace(/\.md$/, '') ?? ''

    return (
        <div className="editor">
            {(currentFile || !sidebarOpen) && (
                <div className="editor-header">
                    {!sidebarOpen && (
                        <button className="menu-btn" onClick={onOpenSidebar} title="メニューを開く">☰</button>
                    )}
                    {currentFile && <span className="editor-filename">{fileName}</span>}
                </div>
            )}
            {currentFile ? (
                <div
                    ref={wrapRef}
                    className="editor-content"
                    data-color-mode="dark"
                    onClick={e => {
                        if ((e.target as Element).closest('.search-panel')) return
                        wrapRef.current?.querySelector('textarea')?.focus()
                    }}
                >
                    {searchOpen && (
                        <SearchPanel
                            content={content}
                            onChange={onChange}
                            editorRef={wrapRef}
                            showReplace={showReplace}
                            onClose={() => setSearchOpen(false)}
                        />
                    )}
                    <MDEditor
                        value={content}
                        onChange={val => onChange(val ?? '')}
                        height="100%"
                        preview="live"
                        visibleDragbar={false}
                        previewOptions={{
                            components: {
                                a: ({ children, href }) => (
                                    <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>
                                )
                            }
                        }}
                    />
                </div>
            ) : null}
        </div>
    )
}
