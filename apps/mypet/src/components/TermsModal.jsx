import { useState } from 'react';

export default function TermsModal({ open, onAccept, onDecline }) {
  const [tos, setTos] = useState(false);
  const [privacy, setPrivacy] = useState(false);

  if (!open) return null;

  const canAccept = tos && privacy;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Terms & Privacy</h2>
        <div className="space-y-4 text-sm text-gray-600 mb-6">
          <p>
            By using MyPet you agree to our Terms of Service and Privacy Policy. We process your data in line with applicable laws (including GDPR where relevant).
          </p>
          <p>
            We use your email and profile data to provide booking and provider services. You can request deletion of your data at any time.
          </p>
        </div>
        <label className="flex items-start gap-3 mb-3 cursor-pointer">
          <input type="checkbox" checked={tos} onChange={(e) => setTos(e.target.checked)} className="mt-1 rounded" />
          <span>I accept the <strong>Terms of Service</strong></span>
        </label>
        <label className="flex items-start gap-3 mb-6 cursor-pointer">
          <input type="checkbox" checked={privacy} onChange={(e) => setPrivacy(e.target.checked)} className="mt-1 rounded" />
          <span>I accept the <strong>Privacy Policy</strong></span>
        </label>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onDecline}
            className="flex-1 py-2.5 px-4 rounded-xl border border-gray-300 text-gray-700 font-medium"
          >
            Decline
          </button>
          <button
            type="button"
            onClick={onAccept}
            disabled={!canAccept}
            className="flex-1 py-2.5 px-4 rounded-xl bg-mypet-green text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
