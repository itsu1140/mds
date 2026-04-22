import { TreeNode } from './types'

const BASE = `${import.meta.env.BASE_URL}api`

async function req<T>(url: string, init?: RequestInit): Promise<T> {
    const res = await fetch(url, init)
    if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `HTTP ${res.status}`)
    }
    return res.json()
}

export const getTree = (): Promise<TreeNode[]> =>
    req(`${BASE}/tree`)

export const getFile = (path: string): Promise<{ content: string }> =>
    req(`${BASE}/file?path=${encodeURIComponent(path)}`)

export const saveFile = (path: string, content: string): Promise<void> =>
    req(`${BASE}/file`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path, content }),
    })

export const deleteItem = (path: string): Promise<void> =>
    req(`${BASE}/item?path=${encodeURIComponent(path)}`, { method: 'DELETE' })

export const createDir = (path: string): Promise<void> =>
    req(`${BASE}/dir`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path }),
    })

export const moveItem = (from: string, to: string): Promise<void> =>
    req(`${BASE}/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to }),
    })
