import { PageSkeleton } from '@/components/Skeletons';

/**
 * Loading State for Home Page
 * 
 * Automatically displayed by Next.js while the async page.tsx is loading.
 * Uses the PageSkeleton component for a polished loading experience.
 */
export default function Loading() {
  return <PageSkeleton />;
}
