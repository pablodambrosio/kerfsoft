export interface OPFSProjectMeta {
  name: string;
  updatedAt: string;
  sizeBytes: number;
}

/**
 * Accesses the root directory handle of the Origin Private File System (OPFS)
 */
async function getOPFSRoot(): Promise<FileSystemDirectoryHandle | null> {
  if (typeof navigator === 'undefined' || !navigator.storage || !navigator.storage.getDirectory) {
    console.warn('OPFS API not supported in this environment.');
    return null;
  }
  try {
    return await navigator.storage.getDirectory();
  } catch (err) {
    console.error('Failed to open OPFS root:', err);
    return null;
  }
}

/**
 * Saves project JSON content directly to OPFS
 */
export async function saveProjectToOPFS(filename: string, jsonContent: string): Promise<boolean> {
  const root = await getOPFSRoot();
  if (!root) return false;

  try {
    const safeName = filename.endsWith('.kerf') ? filename : `${filename}.kerf`;
    const fileHandle = await root.getFileHandle(safeName, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(jsonContent);
    await writable.close();
    return true;
  } catch (err) {
    console.error(`Failed to save project '${filename}' to OPFS:`, err);
    return false;
  }
}

/**
 * Loads project JSON content from OPFS
 */
export async function loadProjectFromOPFS(filename: string): Promise<string | null> {
  const root = await getOPFSRoot();
  if (!root) return null;

  try {
    const safeName = filename.endsWith('.kerf') ? filename : `${filename}.kerf`;
    const fileHandle = await root.getFileHandle(safeName);
    const file = await fileHandle.getFile();
    return await file.text();
  } catch (err) {
    console.error(`Failed to load project '${filename}' from OPFS:`, err);
    return null;
  }
}

/**
 * Lists all saved project files stored in OPFS
 */
export async function listOPFSProjects(): Promise<OPFSProjectMeta[]> {
  const root = await getOPFSRoot();
  if (!root) return [];

  const projects: OPFSProjectMeta[] = [];

  try {
    // Iterate over directory entries in OPFS
    // @ts-ignore
    for await (const [name, handle] of root.entries()) {
      if (handle.kind === 'file' && name.endsWith('.kerf')) {
        const file = await handle.getFile();
        projects.push({
          name,
          updatedAt: new Date(file.lastModified).toISOString(),
          sizeBytes: file.size,
        });
      }
    }
  } catch (err) {
    console.error('Failed to list OPFS projects:', err);
  }

  return projects;
}

/**
 * Deletes a project file from OPFS
 */
export async function deleteOPFSProject(filename: string): Promise<boolean> {
  const root = await getOPFSRoot();
  if (!root) return false;

  try {
    const safeName = filename.endsWith('.kerf') ? filename : `${filename}.kerf`;
    await root.removeEntry(safeName);
    return true;
  } catch (err) {
    console.error(`Failed to delete project '${filename}' from OPFS:`, err);
    return false;
  }
}
