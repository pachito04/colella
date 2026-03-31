import React from 'react';
import Link from 'next/link';
import { Clock } from 'lucide-react';

export default function BookingPendingPage() {
  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center p-4">
      <div className="bg-white p-8 rounded-xl shadow-sm max-w-md w-full text-center border border-neutral-100">
        <div className="flex justify-center mb-6">
          <div className="bg-yellow-100 p-3 rounded-full">
            <Clock className="w-8 h-8 text-yellow-600" />
          </div>
        </div>
        
        <h1 className="text-2xl font-bold text-neutral-900 mb-2">Payment Pending</h1>
        <p className="text-neutral-600 mb-8">
          We are processing your payment. You will receive a confirmation email once it is approved.
        </p>
        
        <Link 
          href="/dashboard" 
          className="block w-full bg-neutral-900 text-white font-medium py-3 px-4 rounded-lg hover:bg-neutral-800 transition-colors"
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
