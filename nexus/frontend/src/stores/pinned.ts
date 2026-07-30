/**
 * Deprecated shim. The canonical pinned-projects system lives in
 * `@/components/PinButton` (localStorage key `nexus:pinned-projects`), which is
 * what the AppLayout sidebar reads. This file previously defined a second,
 * conflicting zustand store (`nexus.pinned.v1`); it is kept only as a thin
 * re-export so any stray import stays coherent with the single source of truth.
 */
export {
  getPinnedProjects,
  setPinnedProjects,
  togglePinnedProject,
} from '@/components/PinButton';
