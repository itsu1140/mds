import { useEffect } from 'react'
import { TreeNode } from '../types'

interface Props {
    x: number
    y: number
    node: TreeNode | null
    onClose: () => void
    onNewFile: (dirPath?: string) => void
    onNewDir: (dirPath?: string) => void
    onRename: (node: TreeNode) => void
    onMove: (node: TreeNode) => void
    onDelete: (node: TreeNode) => void
}

export default function ContextMenu({ x, y, node, onClose, onNewFile, onNewDir, onRename, onMove, onDelete }: Props) {
    useEffect(() => {
        const handler = () => onClose()
        document.addEventListener('click', handler)
        document.addEventListener('contextmenu', handler)
        return () => {
            document.removeEventListener('click', handler)
            document.removeEventListener('contextmenu', handler)
        }
    }, [onClose])

    const items: { label: string; action: () => void; danger?: boolean }[] = []

    if (!node || node.type === 'dir') {
        const dir = node?.path
        items.push({ label: '新規ファイル', action: () => onNewFile(dir) })
        items.push({ label: '新規フォルダ', action: () => onNewDir(dir) })
    }

    if (node) {
        if (items.length > 0) items.push({ label: '---', action: () => {} })
        items.push({ label: '名前変更', action: () => onRename(node) })
        items.push({ label: '移動', action: () => onMove(node) })
        items.push({ label: '削除', action: () => onDelete(node), danger: true })
    }

    return (
        <div
            className="context-menu"
            style={{ left: x, top: y }}
            onClick={e => e.stopPropagation()}
            onContextMenu={e => e.stopPropagation()}
        >
            {items.map((item, i) =>
                item.label === '---' ? (
                    <div key={i} className="context-menu-sep" />
                ) : (
                    <div
                        key={i}
                        className={`context-menu-item${item.danger ? ' danger' : ''}`}
                        onClick={() => { item.action(); onClose() }}
                    >
                        {item.label}
                    </div>
                )
            )}
        </div>
    )
}
