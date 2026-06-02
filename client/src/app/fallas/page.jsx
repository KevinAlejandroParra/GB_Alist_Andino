'use client';

import { Suspense } from 'react';
import FailureBookPage from '../../features/failure-book/FailureBookPage';

function FailureBookFallback() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="animate-spin rounded-full h-10 w-10 border-4 border-purple-500 border-t-transparent" />
    </div>
  );
}

export default function FallasPage() {
  return (
    <Suspense fallback={<FailureBookFallback />}>
      <FailureBookPage />
    </Suspense>
  );
}
