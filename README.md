# Merrin Field

A continually changing typographic artwork made from words, imagery, sound, space, and time.

The work is an effectively infinite field rather than a conventional website. The first milestone is simple to state and difficult to fake:

> Open it and feel that you have entered someone's personal space, not opened a website.

See [`VISION.md`](./VISION.md) for the artistic premise and boundaries.

## Development

```bash
npm install
npm run dev
```

Quality checks:

```bash
npm run typecheck
npm test
npm run format
npm run build
```

## Current milestone

**M0.4 — A Real Publication Boundary**

Captured records now have two different authorities instead of three descriptive labels pretending to be permissions:

- `private` and `draft` records stay in browser-local IndexedDB;
- `public` records must be accepted by the server-owned shared field before the local save is treated as successful;
- changing a public record to private/draft removes the shared copy first;
- deleting a public record removes both its shared and browser-local copies;
- visitors can load shared public records but cannot edit them without the publisher key.

The public representation is deliberately smaller than the local record. `whyNow`, relationship names, importance, pinning state, original upload filenames, and creation metadata do not leave the browser. Public position is calculated before publication so those private composition inputs do not need to be exposed.

Shared records and their public media are stored through `/api/field` in Vercel Blob. A Blob store must be connected to the deployed Vercel project before public writes can succeed. Public media is currently limited to 4 MB per record while uploads travel through the server function; larger direct-to-Blob uploads are a later media gate.

See [`PUBLISHING.md`](./PUBLISHING.md) for the deployment and security boundary.

M0 is still not artistically complete. The shared field now has a real publication mechanism, but the authored first composition still has to be judged against the artistic gate rather than declared complete by infrastructure alone.
