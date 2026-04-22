export interface TreeNode {
    name: string
    path: string
    type: 'file' | 'dir'
    children?: TreeNode[]
}

export type InlineEdit =
    | { type: 'newFile' | 'newDir'; dirPath: string | undefined }
    | { type: 'rename'; node: TreeNode }
    | null
