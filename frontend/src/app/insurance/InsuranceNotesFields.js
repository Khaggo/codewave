'use client'

export default function InsuranceNotesFields({
  reviewNotes,
  customerMessage,
  onChange,
}) {
  return (
    <>
      <label className="label md:col-span-2">
        Review Notes
        <textarea
          value={reviewNotes}
          onChange={(event) => onChange('reviewNotes', event.target.value)}
          rows={4}
          className="input min-h-[120px] resize-y"
          placeholder="Add staff notes."
        />
      </label>

      <label className="label md:col-span-2">
        Customer Update
        <textarea
          value={customerMessage}
          onChange={(event) => onChange('customerMessage', event.target.value)}
          rows={3}
          className="input min-h-[96px] resize-y"
          placeholder="Write the update the customer may see in the mobile app."
        />
      </label>
    </>
  )
}
