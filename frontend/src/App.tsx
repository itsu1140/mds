import { useState, useEffect, useCallback, useRef } from 'react'
import Sidebar from './components/Sidebar'
import Editor from './components/Editor'
import { TreeNode } from './types'
import * as api from './api'

export default function App() {
    const [tree, setTree] = useState<TreeNode[]>([])
    const [currentFile, setCurrentFile] = useState<string | null>(null)
    const [content, setContent] = useState('')
    const [saved, setSaved] = useState(true)
    const [sidebarOpen, setSidebarOpen] = useState(true)
    const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    const refreshTree = useCallback(async () => {
        try {
            setTree(await api.getTree())
        } catch (e) {
            console.error(e)
        }
    }, [])

    useEffect(() => {
        refreshTree()
    }, [refreshTree])

    const openFile = async (path: string) => {
        if (saveTimerRef.current) {
            clearTimeout(saveTimerRef.current)
            saveTimerRef.current = null
        }
        try {
            const data = await api.getFile(path)
            setCurrentFile(path)
            setContent(data.content)
            setSaved(true)
            if (window.innerWidth < 768) setSidebarOpen(false)
        } catch (e) {
            console.error(e)
        }
    }

    const handleContentChange = (val: string) => {
        setContent(val)
        setSaved(false)
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
        const file = currentFile
        if (!file) return
        saveTimerRef.current = setTimeout(async () => {
            try {
                await api.saveFile(file, val)
                setSaved(true)
            } catch (e) {
                console.error(e)
            }
        }, 0)
    }

    const handleSave = useCallback(async () => {
        if (!currentFile) return
        if (saveTimerRef.current) {
            clearTimeout(saveTimerRef.current)
            saveTimerRef.current = null
        }
        try {
            await api.saveFile(currentFile, content)
            setSaved(true)
        } catch (e) {
            console.error(e)
        }
    }, [currentFile, content])

    const handleFileDeleted = (path: string) => {
        if (currentFile === path) {
            setCurrentFile(null)
            setContent('')
            setSaved(true)
        }
    }

    return (
        <div className="app">
            <div
                className={`sidebar-backdrop${sidebarOpen ? ' open' : ''}`}
                onClick={() => setSidebarOpen(false)}
            />
            <Sidebar
                tree={tree}
                currentFile={currentFile}
                onOpenFile={openFile}
                onRefresh={refreshTree}
                onFileDeleted={handleFileDeleted}
                sidebarOpen={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
            />
            <Editor
                currentFile={currentFile}
                content={content}
                saved={saved}
                onChange={handleContentChange}
                onSave={handleSave}
                sidebarOpen={sidebarOpen}
                onOpenSidebar={() => setSidebarOpen(true)}
            />
        </div>
    )
}
