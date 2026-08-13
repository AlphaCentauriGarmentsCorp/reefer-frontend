// Port of public/admin-users.html — the admin-only approvals screen.
//
// Same three endpoints-per-load, same tab counts, same action buttons, same
// edit modal and the same messages. What changed is only the mechanism:
//
//   * requireAdmin() is gone — <ProtectedRoute requireAdmin> in App.jsx does it.
//   * The sidebar block is gone — AppLayout owns it.
//   * innerHTML string-building and the delegated click listener on #users-body
//     became JSX with onClick handlers, so escapeHtml() and the data-action /
//     data-username round trip have no port (JSX escapes text by itself, and a
//     handler already closes over the row's user).
//   * The hidden #edit-original-username input became state — it only ever
//     existed to stash the pre-rename username between opening and saving.
//
// The element ids are kept as they were. #status is load-bearing (theme.css
// styles it), the rest are inert but make this file diff cleanly against the
// original.

import { useCallback, useEffect, useMemo, useState } from 'react';

import client from '../api/client';
import './AdminUsers.css';

const TAB_KEYS = ['pending', 'approved', 'rejected'];
const TAB_LABELS = { pending: 'Pending', approved: 'Approved', rejected: 'Rejected' };

const EMPTY_EDIT_FORM = {
  username: '',
  firstName: '',
  lastName: '',
  role: '',
  status: 'active',
};

// The original read `data.error || "Request failed."` off the parsed body of a
// non-ok response, and let a thrown fetch (no response at all) surface its own
// message. The api client hands both cases over as one normalised object, so
// this splits them apart again the same way.
function actionErrorMessage(err) {
  if (err && err.isNetworkError) return err.message;
  if (err && err.data && err.data.error) return err.data.error;
  return 'Request failed.';
}

export default function AdminUsers() {
  const [allUsers, setAllUsers] = useState({ pending: [], approved: [], rejected: [] });
  const [activeTab, setActiveTab] = useState('pending');

  // renderTabs() and renderTable() only ran inside loadUsers()'s try block, so
  // before the first successful load the page showed just "Loading..." with an
  // empty tab strip and an empty tbody — not the "No pending accounts." row.
  const [loaded, setLoaded] = useState(false);

  const [status, setStatus] = useState({ text: 'Loading...', className: '' });

  const [editOpen, setEditOpen] = useState(false);
  const [editOriginalUsername, setEditOriginalUsername] = useState('');
  const [editForm, setEditForm] = useState(EMPTY_EDIT_FORM);
  const [editMsg, setEditMsg] = useState('');

  const loadUsers = useCallback(async () => {
    try {
      const [pendingRes, approvedRes, rejectedRes] = await Promise.all([
        client.get('/auth/users', { params: { status: 'pending' } }),
        client.get('/auth/users', { params: { status: 'approved' } }),
        client.get('/auth/users', { params: { status: 'rejected' } }),
      ]);

      const next = {
        pending: pendingRes.data,
        approved: approvedRes.data,
        rejected: rejectedRes.data,
      };

      // A body that isn't an array used to blow up in renderTable()'s .forEach
      // and land in this same catch — the visible symptom of a base URL that
      // answers 200 with something other than the user list. Keep that landing
      // spot instead of letting .map() take the whole app down.
      if (!TAB_KEYS.every((key) => Array.isArray(next[key]))) {
        throw new Error('Unexpected response from /auth/users.');
      }

      setAllUsers(next);
      setLoaded(true);
      setStatus({ text: 'Connected — live data from ash-erp-data.xlsx.', className: 'status-ok' });
    } catch (err) {
      setStatus({
        text: "Could not reach the backend. Is 'node server.js' running? (" + err.message + ")",
        className: 'status-error',
      });
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // approve / reject / deactivate / reactivate — all four are the same bare PUT.
  async function handleAction(action, username) {
    try {
      await client.put('/auth/users/' + encodeURIComponent(username) + '/' + action);
      await loadUsers();
    } catch (err) {
      setStatus({ text: 'Action failed: ' + actionErrorMessage(err), className: 'status-error' });
    }
  }

  // --- Edit Account modal ---------------------------------------------
  const roleOptions = useMemo(() => {
    const roles = allUsers.pending
      .concat(allUsers.approved, allUsers.rejected)
      .map((u) => u.role)
      .filter(Boolean);
    const unique = Array.from(new Set(roles));
    return unique.length ? unique : ['admin', 'staff'];
  }, [allUsers]);

  function openEditModal(user) {
    if (!user) return;

    setEditOriginalUsername(user.username);
    setEditForm({
      username: user.username || '',
      firstName: user.first_name || '',
      lastName: user.last_name || '',
      role: user.role || '',
      // "pending" isn't one of the three edit statuses; default it to
      // Inactive until the admin explicitly sets it, same spirit as the
      // Approve button but without silently approving them on open.
      status: user.display_status === 'pending' ? 'inactive' : user.display_status,
    });
    setEditMsg('');
    setEditOpen(true);
  }

  function closeEditModal() {
    setEditOpen(false);
  }

  function updateEditField(field, value) {
    setEditForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSaveEdit() {
    const payload = {
      username: editForm.username.trim(),
      first_name: editForm.firstName.trim(),
      last_name: editForm.lastName.trim(),
      role: editForm.role,
      status: editForm.status,
    };

    if (!payload.username || !payload.first_name || !payload.last_name) {
      setEditMsg('Username, first name, and last name are all required.');
      return;
    }

    try {
      await client.put(
        '/auth/users/' + encodeURIComponent(editOriginalUsername) + '/edit',
        payload,
      );
      closeEditModal();
      await loadUsers();
    } catch (err) {
      setEditMsg(actionErrorMessage(err));
    }
  }

  const rows = allUsers[activeTab];

  return (
    <>
      <h1>User Approvals</h1>
      <p className="sub">Review new registrations and manage account access.</p>

      <div id="status" className={status.className || undefined}>
        {status.text}
      </div>

      <div className="tabs" id="tabs">
        {loaded &&
          TAB_KEYS.map((key) => (
            <div
              key={key}
              className={'tab' + (key === activeTab ? ' active' : '')}
              onClick={() => setActiveTab(key)}
            >
              {TAB_LABELS[key]} <span className="count">{allUsers[key].length}</span>
            </div>
          ))}
      </div>

      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Username</th>
            <th>Registered</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody id="users-body">
          {loaded && rows.length === 0 && (
            <tr>
              <td colSpan={5} style={{ color: 'var(--muted)' }}>
                No {activeTab} accounts.
              </td>
            </tr>
          )}

          {loaded &&
            rows.map((user) => (
              <tr key={user.username}>
                <td>{user.full_name}</td>
                <td>{user.username}</td>
                <td>{user.created_date}</td>
                <td>
                  <span className={'status-pill status-' + user.status}>{user.status}</span>
                  {user.status === 'approved' && !user.active && (
                    <> <span className="status-pill status-inactive">inactive</span></>
                  )}
                </td>
                <td>
                  {user.status === 'pending' && (
                    <>
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => handleAction('approve', user.username)}
                      >
                        Approve
                      </button>{' '}
                      <button
                        type="button"
                        className="btn btn-outline-danger"
                        onClick={() => handleAction('reject', user.username)}
                      >
                        Reject
                      </button>
                    </>
                  )}
                  {user.status === 'approved' && (
                    <button
                      type="button"
                      className="btn btn-outline"
                      onClick={() =>
                        handleAction(user.active ? 'deactivate' : 'reactivate', user.username)
                      }
                    >
                      {user.active ? 'Deactivate' : 'Reactivate'}
                    </button>
                  )}{' '}
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => openEditModal(user)}
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
        </tbody>
      </table>

      {/* .modal-overlay in theme.css sets position/background/centring but no
          `display`, so the inline display is what hides it — same as the
          original's style="display:none". */}
      <div id="edit-overlay" className="modal-overlay" style={{ display: editOpen ? 'flex' : 'none' }}>
        <div className="modal-box">
          <div className="modal-title">Edit Account</div>
          <div className="modal-desc">
            Update this user&apos;s profile info. Password and account creation are managed
            elsewhere.
          </div>

          <div className="field-label">Username</div>
          <input
            id="edit-username"
            className="auth-input"
            type="text"
            placeholder="jdelacruz"
            value={editForm.username}
            onChange={(event) => updateEditField('username', event.target.value)}
          />

          <div className="field-label">First Name</div>
          <input
            id="edit-first-name"
            className="auth-input"
            type="text"
            placeholder="Juan"
            value={editForm.firstName}
            onChange={(event) => updateEditField('firstName', event.target.value)}
          />

          <div className="field-label">Last Name</div>
          <input
            id="edit-last-name"
            className="auth-input"
            type="text"
            placeholder="Dela Cruz"
            value={editForm.lastName}
            onChange={(event) => updateEditField('lastName', event.target.value)}
          />

          <div className="field-label">Role</div>
          <select
            id="edit-role"
            style={{ width: '100%' }}
            value={editForm.role}
            onChange={(event) => updateEditField('role', event.target.value)}
          >
            {roleOptions.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>

          <div className="field-label">Status</div>
          <select
            id="edit-status"
            style={{ width: '100%' }}
            value={editForm.status}
            onChange={(event) => updateEditField('status', event.target.value)}
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
          </select>

          <div
            id="edit-status-msg"
            style={{ fontSize: '12px', marginTop: '8px', color: editMsg ? 'var(--red-text)' : undefined }}
          >
            {editMsg}
          </div>

          <div className="modal-actions">
            <button
              id="save-edit-btn"
              type="button"
              className="btn btn-primary btn-flex"
              onClick={handleSaveEdit}
            >
              Save Changes
            </button>
            <button
              id="cancel-edit-btn"
              type="button"
              className="btn btn-outline btn-flex"
              onClick={closeEditModal}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
