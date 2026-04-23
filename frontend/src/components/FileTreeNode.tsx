import { useState, useRef, useEffect } from 'react'
import { TreeNode, InlineEdit } from '../types'

interface Props {
    node: TreeNode
    depth: number
    currentFile: string | null
    selectedPath: string | null
    onSelect: (path: string) => void
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
            {error && errPos && (
                <div className="tree-input-error" style={{ position: 'fixed', top: errPos.top, left: errPos.left, zIndex: 9999 }}>
                    {error}
                </div>
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
            <span className="tree-file-icon">{type === 'newFile' ? '📄' : ''}</span>
            <EditInput onConfirm={onConfirm} onCancel={onCancel} />
        </div>
    )
}

export default function FileTreeNode({ node, depth, currentFile, selectedPath, onSelect, onOpenFile, onContextMenu, onDropMove, inlineEdit, onInlineConfirm, onInlineCancel }: Props) {
    const [expanded, setExpanded] = useState(true)
    const [dragOver, setDragOver] = useState(false)
    const indent = depth * 16 + 8
    const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
    const wasLongPress = useRef(false)
    const touchCoords = useRef<{ x: number; y: number } | null>(null)

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

    const handleTouchStart = (e: React.TouchEvent) => {
        const touch = e.touches[0]
        touchCoords.current = { x: touch.clientX, y: touch.clientY }
        wasLongPress.current = false
        longPressTimer.current = setTimeout(() => {
            wasLongPress.current = true
            if (touchCoords.current) {
                const { x, y } = touchCoords.current
                onContextMenu({ clientX: x, clientY: y, preventDefault: () => { }, stopPropagation: () => { } } as unknown as React.MouseEvent, node)
            }
        }, 500)
    }

    const cancelLongPress = () => {
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current)
            longPressTimer.current = null
        }
    }

    const handleMenuBtn = (e: React.MouseEvent) => {
        e.stopPropagation()
        e.preventDefault()
        onContextMenu(e, node)
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
                    className={`tree-item tree-dir${dragOver ? ' drag-over' : ''}${selectedPath === node.path ? ' selected' : ''}`}
                    style={{ paddingLeft: indent }}
                    draggable
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => {
                        if (wasLongPress.current) { wasLongPress.current = false; return }
                        if (!isRenaming) { onSelect(node.path); setExpanded(v => !v) }
                    }}
                    onContextMenu={e => { e.stopPropagation(); onContextMenu(e, node) }}
                    onTouchStart={handleTouchStart}
                    onTouchEnd={cancelLongPress}
                    onTouchMove={cancelLongPress}
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
                        <>
                            <span className="tree-item-name">{node.name}</span>
                            <button
                                className="tree-item-menu-btn"
                                onClick={handleMenuBtn}
                                onTouchStart={e => e.stopPropagation()}
                            >⋮</button>
                        </>
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
                                selectedPath={selectedPath}
                                onSelect={onSelect}
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
            onClick={() => {
                if (wasLongPress.current) { wasLongPress.current = false; return }
                if (!isRenaming) { onSelect(node.path); onOpenFile(node.path) }
            }}
            onContextMenu={e => { e.stopPropagation(); onContextMenu(e, node) }}
            onTouchStart={handleTouchStart}
            onTouchEnd={cancelLongPress}
            onTouchMove={cancelLongPress}
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
                <>
                    <span className="tree-item-name">{node.name}</span>
                    <button
                        className="tree-item-menu-btn"
                        onClick={handleMenuBtn}
                        onTouchStart={e => e.stopPropagation()}
                    >⋮</button>
                </>
            )}
        </div>
    )
}
