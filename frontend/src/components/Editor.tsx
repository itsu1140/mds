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
                    />
                </div>
            ) : null}
        </div>
    )
}
