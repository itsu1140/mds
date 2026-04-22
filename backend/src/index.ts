import express from 'express'
import cors from 'cors'
import fs from 'fs/promises'
import fsSync from 'fs'
import path from 'path'

const app = express()
const PORT = 3001
const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(process.cwd(), 'data'))

app.use(cors())
app.use(express.json())

fsSync.mkdirSync(DATA_DIR, { recursive: true })

function safePath(p: string): string {
    const full = path.resolve(DATA_DIR, path.normalize(p).replace(/^(\.\.(\/|\\|$))+/, ''))
    if (full !== DATA_DIR && !full.startsWith(DATA_DIR + path.sep)) {
        throw new Error('Invalid path')
    }
    return full
}

interface TreeNode {
    name: string
    path: string
    type: 'file' | 'dir'
    children?: TreeNode[]
}

async function buildTree(dir: string): Promise<TreeNode[]> {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    const nodes: TreeNode[] = []

    const sorted = entries.sort((a, b) => {
        if (a.isDirectory() !== b.isDirectory()) return a.isDirectory() ? -1 : 1
        return a.name.localeCompare(b.name)
    })

    for (const entry of sorted) {
        const fullPath = path.join(dir, entry.name)
        const relPath = path.relative(DATA_DIR, fullPath)

        if (entry.isDirectory()) {
            nodes.push({
                name: entry.name,
                path: relPath,
                type: 'dir',
                children: await buildTree(fullPath),
            })
        } else if (entry.name.endsWith('.md')) {
            nodes.push({
                name: entry.name.replace(/\.md$/, ''),
                path: relPath,
                type: 'file',
            })
        }
    }

    return nodes
}

app.get('/api/tree', async (_req, res) => {
    try {
        res.json(await buildTree(DATA_DIR))
    } catch (e) {
        res.status(500).json({ error: String(e) })
    }
})

app.get('/api/file', async (req, res) => {
    try {
        const p = req.query.path as string
        if (!p) return res.status(400).json({ error: 'path required' })
        const content = await fs.readFile(safePath(p), 'utf-8')
        res.json({ content })
    } catch (e) {
        res.status(500).json({ error: String(e) })
    }
})

app.put('/api/file', async (req, res) => {
    try {
        const { path: p, content } = req.body
        if (!p) return res.status(400).json({ error: 'path required' })
        const full = safePath(p)
        await fs.mkdir(path.dirname(full), { recursive: true })
        await fs.writeFile(full, content ?? '')
        res.json({ ok: true })
    } catch (e) {
        res.status(500).json({ error: String(e) })
    }
})

app.delete('/api/item', async (req, res) => {
    try {
        const p = req.query.path as string
        if (!p) return res.status(400).json({ error: 'path required' })
        const full = safePath(p)
        const stat = await fs.stat(full)
        if (stat.isDirectory()) {
            await fs.rm(full, { recursive: true })
        } else {
            await fs.unlink(full)
        }
        res.json({ ok: true })
    } catch (e) {
        res.status(500).json({ error: String(e) })
    }
})

app.post('/api/dir', async (req, res) => {
    try {
        const { path: p } = req.body
        if (!p) return res.status(400).json({ error: 'path required' })
        await fs.mkdir(safePath(p), { recursive: true })
        res.json({ ok: true })
    } catch (e) {
        res.status(500).json({ error: String(e) })
    }
})

app.post('/api/move', async (req, res) => {
    try {
        const { from, to } = req.body
        if (!from || !to) return res.status(400).json({ error: 'from and to required' })
        const fullTo = safePath(to)
        await fs.mkdir(path.dirname(fullTo), { recursive: true })
        await fs.rename(safePath(from), fullTo)
        res.json({ ok: true })
    } catch (e) {
        res.status(500).json({ error: String(e) })
    }
})

app.listen(PORT, () => console.log(`Backend running on :${PORT}, data: ${DATA_DIR}`))
