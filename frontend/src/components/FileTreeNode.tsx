import { useState, useRef, useEffect } from 'react'
import { TreeNode, InlineEdit } from '../types'

interface Props {
    node: TreeNode
    depth: number
    currentFile: string | null
    onOpenFile: (path: string) => void
    onContextMenu: (e: React.MouseEvent, node: TreeNode) => void
    onDropMove: (fromPath: string, toDirPath: string | undefined) => void
    inlineEdit: InlineEdit
    onInlineConfirm: (value: string) => Promise<true | string>
    onInlineCancel: () => void
}

function EditInput({ defaultValue = '', onConfirm, onCancel }: {
    defaultValue?: string
    onConfirm: (v: string) => Promise<true | string>
    onCancel: () => void
}) {
    const [value, setValue] = useState(defaultValue)
    const [error, setError] = useState<string | null>(null)
    const [errPos, setErrPos] = useState<{ top: number; left: number } | null>(null)
    const ref = useRef<HTMLInputElement>(null)
    const cancelled = useRef(false)

    useEffect(() => {
        ref.current?.focus()
        if (defaultValue) ref.current?.select()
        return () => { cancelled.current = true }
    }, [])

    const confirm = async () => {
        const t = value.trim()
        if (!t || t === defaultValue) { onCancel(); return }
        const result = await onConfirm(t)
        if (cancelled.current) return
        if (result !== true) {
            const rect = ref.current?.getBoundingClientRect()
            setErrPos({ top: (rect?.bottom ?? 0) + 4, left: rect?.left ?? 0 })
            setError(result)
        }
    }

    return (
        <div className="tree-input-wrap">
            <input
                ref={ref}
                className="tree-input"
                value={value}
                onChange={e => { setValue(e.target.value); setError(null); setErrPos(null) }}
                onKeyDown={e => {
                    if (e.key === 'Enter') { e.preventDefault(); confirm() }
                    if (e.key === 'Escape') { e.preventDefault(); onCancel() }
                }}
                onBlur={onCancel}
                onClick={e => e.stopPropagation()}
            />
            {error && errPos && createPortal(
                <div className="tree-input-error" style={{ position: 'fixed', top: errPos.top, left: errPos.left, zIndex: 9999 }}>
                    {error}
                </div>,
                document.body
            )}
        </div>
    )
}

export function NewItemRow({ type, depth, onConfirm, onCancel }: {
    type: 'newFile' | 'newDir'
    depth: number
    onConfirm: (v: string) => Promise<true | string>
    onCancel: () => void
}) {
    const indent = depth * 16 + 8
    return (
        <div className="tree-item" style={{ paddingLeft: indent }}>
            <span className={type === 'newDir' ? 'tree-toggle' : 'tree-icon'} />
            <span className="tree-file-icon">{type === 'newFile' ? '📄' : '📁'}</span>
            <EditInput onConfirm={onConfirm} onCancel={onCancel} />
        </div>
    )
}

export default function FileTreeNode({ node, depth, currentFile, onOpenFile, onContextMenu, onDropMove, inlineEdit, onInlineConfirm, onInlineCancel }: Props) {
    const [expanded, setExpanded] = useState(true)
    const [dragOver, setDragOver] = useState(false)
    const indent = depth * 16 + 8

    const isRenaming = inlineEdit?.type === 'rename' && inlineEdit.node.path === node.path
    const isPendingNewInDir = node.type === 'dir'
        && inlineEdit !== null
        && inlineEdit.type !== 'rename'
        && inlineEdit.dirPath === node.path

    useEffect(() => {
        if (isPendingNewInDir) setExpanded(true)
    }, [isPendingNewInDir])

    const handleDragStart = (e: React.DragEvent) => {
        e.stopPropagation()
        e.dataTransfer.setData('text/plain', node.path)
        e.dataTransfer.effectAllowed = 'move'
    }

    if (node.type === 'dir') {
        const handleDragOver = (e: React.DragEvent) => {
            e.preventDefault()
            e.stopPropagation()
            e.dataTransfer.dropEffect = 'move'
            setDragOver(true)
        }
        const handleDragLeave = (e: React.DragEvent) => {
            e.stopPropagation()
            setDragOver(false)
        }
        const handleDrop = (e: React.DragEvent) => {
            e.preventDefault()
            e.stopPropagation()
            setDragOver(false)
            const from = e.dataTransfer.getData('text/plain')
            if (!from || from === node.path || from.startsWith(node.path + '/')) return
            onDropMove(from, node.path)
        }

        return (
            <div>
                <div
                    className={`tree-item tree-dir${dragOver ? ' drag-over' : ''}`}
                    style={{ paddingLeft: indent }}
                    draggable
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => !isRenaming && setExpanded(v => !v)}
                    onContextMenu={e => { e.stopPropagation(); onContextMenu(e, node) }}
                >
                    <span className={`tree-toggle${expanded ? ' expanded' : ''}`} />
                    <span className="tree-dir-icon">📁</span>
                    {isRenaming ? (
                        <EditInput
                            defaultValue={node.name}
                            onConfirm={onInlineConfirm}
                            onCancel={onInlineCancel}
                        />
                    ) : (
                        <span>{node.name}</span>
                    )}
                </div>
                {expanded && (
                    <>
                        {node.children?.map(child => (
                            <FileTreeNode
                                key={child.path}
                                node={child}
                                depth={depth + 1}
                                currentFile={currentFile}
                                onOpenFile={onOpenFile}
                                onContextMenu={onContextMenu}
                                onDropMove={onDropMove}
                                inlineEdit={inlineEdit}
                                onInlineConfirm={onInlineConfirm}
                                onInlineCancel={onInlineCancel}
                            />
                        ))}
                        {isPendingNewInDir && (
                            <NewItemRow
                                type={(inlineEdit as { type: 'newFile' | 'newDir' }).type}
                                depth={depth + 1}
                                onConfirm={onInlineConfirm}
                                onCancel={onInlineCancel}
                            />
                        )}
                    </>
                )}
            </div>
        )
    }

    return (
        <div
            className={`tree-item tree-file${currentFile === node.path ? ' active' : ''}`}
            style={{ paddingLeft: indent }}
            draggable
            onDragStart={handleDragStart}
            onClick={() => !isRenaming && onOpenFile(node.path)}
            onContextMenu={e => { e.stopPropagation(); onContextMenu(e, node) }}
        >
            <span className="tree-icon" />
            <span className="tree-file-icon">📄</span>
            {isRenaming ? (
                <EditInput
                    defaultValue={node.name}
                    onConfirm={onInlineConfirm}
                    onCancel={onInlineCancel}
                />
            ) : (
                <span>{node.name}</span>
            )}
        </div>
    )
}
