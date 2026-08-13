// The markup half of the sync indicator that js/sync-status.js used to write
// with innerHTML. Kept as one shared component so the four pages that show it
// can't drift apart.
//
// id="status" is load-bearing: theme.css carries `#status.sync-line { padding:
// 0; margin-bottom: 14px; background: none; }` to undo the legacy banner
// padding. Pass a different id only if a page shows two of these.

// The hook that feeds it lives in src/utils/syncStatus.js — import it from
// there, not from here, so this file only exports a component.

export default function SyncLine({ sync, id = 'status' }) {
  return (
    <div id={id} className={'sync-line' + (sync.isError ? ' err' : '')}>
      <span className={'sync-dot' + (sync.isError ? ' err' : '')} />
      <span className="sync-text">{sync.text}</span>
    </div>
  );
}
