import { useEffect, useRef } from 'react'
import MDEditor from '@uiw/react-md-editor'

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

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault()
                onSave()
            }
        }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [onSave])

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
            <div ref={wrapRef} className="editor-content" data-color-mode="dark">
                <MDEditor
                    value={content}
                    onChange={val => onChange(val ?? '')}
                    height="100%"
                    preview="live"
                    visibleDragbar={false}
                />
            </div>
        </div>
    )
}
