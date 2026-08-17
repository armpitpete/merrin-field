# Merrin Field publishing boundary

M0.4 makes `public`, `private`, and `draft` operational states rather than labels.

## Storage boundary

- `private`: browser-local IndexedDB only.
- `draft`: browser-local IndexedDB only.
- `public`: published through `/api/field` to the Vercel Blob store, then also retained in the owner's browser-local IndexedDB copy.

A failed public write fails closed: the capture drawer does not report the record as saved publicly when the server refuses or cannot persist it.

Changing an existing public record to `private` or `draft` removes the shared copy before saving the new browser-local state. Deleting a public record removes the shared copy and its public media before removing the browser-local copy.

## Public projection

The server never receives the complete browser-local record.

The public payload contains only:

- record id;
- happened-at date/time;
- public text;
- public place text;
- emotional colour tags;
- derived field position;
- public media ids, MIME types, generic accessible names, and Blob URLs;
- optional update timestamp.

The following remain browser-only even when a record is public:

- `whyNow` composition notes;
- relationship names;
- importance value;
- pinning state;
- creation metadata;
- original upload filenames.

## Publisher authority

Public reads are open. Public writes and deletes require the owner publisher key.

The browser asks for the key when a public mutation is attempted and keeps it in `sessionStorage` for that browser session only. The plaintext key is deliberately not committed to this repository. The server contains only its SHA-256 digest.

To rotate the key, generate a new high-entropy key, replace `PUBLISHER_KEY_SHA256` in `api/field.ts` with the SHA-256 digest of that key, and deploy. Existing public records are unaffected.

## Vercel requirement

Connect a Vercel Blob store to the Merrin Field project. `@vercel/blob` then uses the deployment's Blob credentials/OIDC context for server-side reads and writes.

If Blob storage is missing or unavailable, `/api/field` returns a service-unavailable response. Browser-local private/draft work remains usable.

## Current media limit

M0.4 sends public media through the server function and therefore caps public media at 4 MB total per record. Larger files must remain private/draft for now.

The next media-specific persistence gate is direct browser-to-Blob upload with an owner-authorised upload token so large audio/video does not pass through the function body.
