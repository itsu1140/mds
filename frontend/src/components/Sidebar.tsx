import { useState } from 'react'
import FileTreeNode, { NewItemRow } from './FileTreeNode'
import ContextMenu from './ContextMenu'
import { TreeNode, InlineEdit } from '../types'
import * as api from '../api'

interface Props {
    tree: TreeNode[]
    currentFile: string | null
    onOpenFile: (path: string) => void
    onRefresh: () => void
    onFileDeleted: (path: string) => void
    sidebarOpen: boolean
    onClose: () => void
}

interface MenuState {
    x: number
    y: number
    node: TreeNode | null
}

function findNode(nodes: TreeNode[], targetPath: string): TreeNode | null {
    for (const node of nodes) {
        if (node.path === targetPath) return node
        if (node.type === 'dir' && node.children) {
            const found = findNode(node.children, targetPath)
            if (found) return found
        }
    }
    return null
}

function getSiblings(tree: TreeNode[], dirPath?: string): TreeNode[] {
    if (!dirPath) return tree
    return findNode(tree, dirPath)?.children ?? []
}

function parseName(name: string, dirPath?: string): { leaf: string; parentPath: string | undefined } | null {
    const parts = name.split('/').filter(Boolean)
    if (parts.length === 0) return null
    const leaf = parts[parts.length - 1]
    const intermediate = parts.slice(0, -1).join('/')
    const parentPath = dirPath
        ? (intermediate ? `${dirPath}/${intermediate}` : dirPath)
        : (intermediate || undefined)
    return { leaf, parentPath }
}

export default function Sidebar({ tree, currentFile, onOpenFile, onRefresh, onFileDeleted, sidebarOpen, onClose }: Props) {
    const [menu, setMenu] = useState<MenuState | null>(null)
    const [rootDragOver, setRootDragOver] = useState(false)
    const [inlineEdit, setInlineEdit] = useState<InlineEdit>(null)

    const handleDropMove = async (fromPath: string, toDirPath: string | undefined) => {
        const basename = fromPath.split('/').pop()!
        const newPath = toDirPath ? `${toDirPath}/${basename}` : basename
        if (newPath === fromPath) return
        await api.moveItem(fromPath, newPath)
        await onRefresh()
        if (currentFile === fromPath) {
            onOpenFile(newPath)
        } else if (currentFile && currentFile.startsWith(fromPath + '/')) {
            onOpenFile(newPath + currentFile.substring(fromPath.length))
        }
    }

    const openMenu = (e: React.MouseEvent, node: TreeNode | null) => {
        e.preventDefault()
        e.stopPropagation()
        setMenu({ x: e.clientX, y: e.clientY, node })
    }

    const handleNewFile = (dirPath?: string) => {
        setMenu(null)
        setInlineEdit({ type: 'newFile', dirPath })
    }

    const handleNewDir = (dirPath?: string) => {
        setMenu(null)
        setInlineEdit({ type: 'newDir', dirPath })
    }

    const handleRename = (node: TreeNode) => {
        setMenu(null)
        setInlineEdit({ type: 'rename', node })
    }

    const handleInlineConfirm = async (value: string): Promise<true | string> => {
        if (!inlineEdit) return true

        if (inlineEdit.type === 'newFile') {
            const parsed = parseName(value, inlineEdit.dirPath)
            if (!parsed) return '無効な名前です'
            const { leaf, parentPath } = parsed
            const siblings = getSiblings(tree, parentPath)
            if (siblings.some(n => n.name === leaf)) return `"${leaf}" はすでに存在します`
            const p = inlineEdit.dirPath ? `${inlineEdit.dirPath}/${value}.md` : `${value}.md`
            try {
                await api.saveFile(p, '')
                setInlineEdit(null)
                await onRefresh()
                onOpenFile(p)
                return true
            } catch (e) {
                return String(e)
            }
        }

        if (inlineEdit.type === 'newDir') {
            const parsed = parseName(value, inlineEdit.dirPath)
            if (!parsed) return '無効な名前です'
            const { leaf, parentPath } = parsed
            const siblings = getSiblings(tree, parentPath)
            if (siblings.some(n => n.name === leaf)) return `"${leaf}" はすでに存在します`
            const p = inlineEdit.dirPath ? `${inlineEdit.dirPath}/${value}` : value
            try {
                await api.createDir(p)
                setInlineEdit(null)
                await onRefresh()
                return true
            } catch (e) {
                return String(e)
            }
        }

        if (inlineEdit.type === 'rename') {
            const node = inlineEdit.node
            const parentPath = node.path.includes('/')
                ? node.path.substring(0, node.path.lastIndexOf('/'))
                : undefined
            const siblings = getSiblings(tree, parentPath)
            if (siblings.some(n => n.path !== node.path && n.name === value)) {
                return `"${value}" はすでに存在します`
            }
            const ext = node.type === 'file' ? '.md' : ''
            const newPath = parentPath ? `${parentPath}/${value}${ext}` : `${value}${ext}`
            try {
                await api.moveItem(node.path, newPath)
                setInlineEdit(null)
                if (node.type === 'file') {
                    onFileDeleted(node.path)
                    if (currentFile === node.path) onOpenFile(newPath)
                }
                await onRefresh()
                return true
            } catch (e) {
                return String(e)
            }
        }

        return true
    }

    const handleInlineCancel = () => setInlineEdit(null)

    const handleMove = async (node: TreeNode) => {
        const dest = prompt('移動先パス:', node.path)
        if (!dest || dest === node.path) return
        await api.moveItem(node.path, dest)
        if (node.type === 'file') onFileDeleted(node.path)
        onRefresh()
    }

    const handleDelete = async (node: TreeNode) => {
        if (!confirm(`"${node.name}" を削除しますか？`)) return
        await api.deleteItem(node.path)
        if (node.type === 'file') onFileDeleted(node.path)
        onRefresh()
    }

    const isRootNewItem = inlineEdit !== null && inlineEdit.type !== 'rename' && inlineEdit.dirPath === undefined

    return (
        <div className={`sidebar${sidebarOpen ? '' : ' closed'}`} onClick={() => setMenu(null)}>
            <div className="sidebar-header">
                <span className="sidebar-title">MDS</span>
                <div className="sidebar-actions">
                    <button onClick={() => handleNewFile()} title="新規ファイル">＋</button>
                    <button onClick={() => handleNewDir()} title="新規フォルダ">🗂</button>
                    <button onClick={onClose} title="閉じる" className="sidebar-close-btn">‹</button>
                </div>
            </div>
            <div
                className={`file-tree${rootDragOver ? ' drag-over' : ''}`}
                onContextMenu={e => openMenu(e, null)}
                onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setRootDragOver(true) }}
                onDragLeave={() => setRootDragOver(false)}
                onDrop={e => {
                    e.preventDefault()
                    setRootDragOver(false)
                    const from = e.dataTransfer.getData('text/plain')
                    if (from) handleDropMove(from, undefined)
                }}
            >
                {tree.length === 0 && !isRootNewItem && (
                    <div className="tree-empty">右クリックでファイルを作成</div>
                )}
                {tree.map(node => (
                    <FileTreeNode
                        key={node.path}
                        node={node}
                        depth={0}
                        currentFile={currentFile}
                        onOpenFile={onOpenFile}
                        onContextMenu={openMenu}
                        onDropMove={handleDropMove}
                        inlineEdit={inlineEdit}
                        onInlineConfirm={handleInlineConfirm}
                        onInlineCancel={handleInlineCancel}
                    />
                ))}
                {isRootNewItem && (
                    <NewItemRow
                        type={(inlineEdit as { type: 'newFile' | 'newDir' }).type}
                        depth={0}
                        onConfirm={handleInlineConfirm}
                        onCancel={handleInlineCancel}
                    />
                )}
            </div>
            {menu && (
                <ContextMenu
                    x={menu.x}
                    y={menu.y}
                    node={menu.node}
                    onClose={() => setMenu(null)}
                    onNewFile={handleNewFile}
                    onNewDir={handleNewDir}
                    onRename={handleRename}
                    onMove={handleMove}
                    onDelete={handleDelete}
                />
            )}
        </div>
    )
}
