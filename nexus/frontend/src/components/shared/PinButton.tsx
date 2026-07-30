/**
 * Deprecated shim. The canonical PinButton lives at `@/components/PinButton`
 * and is backed by the single localStorage key the AppLayout sidebar reads
 * (`nexus:pinned-projects`). Re-exported here so any stray import keeps working
 * without spinning up a second, conflicting pinned store.
 */
export { PinButton } from '@/components/PinButton';
