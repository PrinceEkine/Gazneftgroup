/**
 * Gmail-style folder model, shared by the sidebar (App) and the message list
 * (InboxView).
 *
 * A folder id is either a standard id ('inbox', 'outbox', 'sent', 'drafts',
 * 'snoozed', 'trash', 'spam') or a raw IMAP path from the account's own
 * folder list, prefixed with CUSTOM_FOLDER_PREFIX so it can never collide
 * with a standard id. Two folders are local-only and never touch IMAP:
 * 'outbox' (queued sends in Firestore) and 'snoozed' (local filter over INBOX).
 */
export const CUSTOM_FOLDER_PREFIX = 'imap:';
/** Top-level Gmail order; trash/spam live under "More" with loaded folders. */
export const MAIN_FOLDERS = ['inbox', 'outbox', 'sent', 'drafts', 'snoozed'];
export const MORE_STANDARD_FOLDERS = ['trash', 'spam'];
export function isCustomFolderId(folder) {
    return folder.startsWith(CUSTOM_FOLDER_PREFIX);
}
export function customFolderId(path) {
    return `${CUSTOM_FOLDER_PREFIX}${path}`;
}
export function customFolderPath(folder) {
    return folder.slice(CUSTOM_FOLDER_PREFIX.length);
}
/**
 * Single mapping from folder id to the IMAP path the proxy opens. Custom
 * folder ids pass through untouched — the path came from the server's own
 * LIST response, so no provider guessing is needed.
 */
export function resolveImapFolder(provider, folder) {
    if (isCustomFolderId(folder))
        return customFolderPath(folder);
    if (folder === 'snoozed')
        return 'INBOX';
    if (provider === 'gmail') {
        if (folder === 'sent')
            return '[Gmail]/Sent Mail';
        if (folder === 'drafts')
            return '[Gmail]/Drafts';
        if (folder === 'trash')
            return '[Gmail]/Trash';
        if (folder === 'spam')
            return '[Gmail]/Spam';
        return folder.toUpperCase();
    }
    if (provider === 'outlook') {
        if (folder === 'sent')
            return 'Sent';
        if (folder === 'drafts')
            return 'Drafts';
        if (folder === 'trash')
            return 'Deleted';
        if (folder === 'spam')
            return 'Junk';
        return folder.toUpperCase();
    }
    return folder.toUpperCase();
}
/**
 * Classify a LISTed mailbox: returns its standard id, or null when it is a
 * genuine custom folder. Special-use flags (RFC 6154) win; otherwise the
 * mailbox matches a standard folder when its path equals the path the app
 * would open for that folder on this provider.
 */
export function classifyListedFolder(provider, listed) {
    switch ((listed.specialUse ?? '').toLowerCase()) {
        case '\\sent': return 'sent';
        case '\\drafts': return 'drafts';
        case '\\trash': return 'trash';
        case '\\junk': return 'spam';
        case '\\inbox': return 'inbox';
        default: break;
    }
    if (listed.path.toUpperCase() === 'INBOX')
        return 'inbox';
    const ids = ['sent', 'drafts', 'trash', 'spam'];
    for (const id of ids) {
        if (resolveImapFolder(provider, id).toLowerCase() === listed.path.toLowerCase()) {
            return id;
        }
    }
    return null;
}
/** Human label for any folder id (custom ids show their last path segment). */
export function folderLabel(folder) {
    if (!isCustomFolderId(folder))
        return folder;
    const path = customFolderPath(folder);
    const segments = path.split(/[/.]/).filter((s) => s.length > 0);
    return segments.length > 0 ? segments[segments.length - 1] : path;
}
/** IMAP LIST for one account via the proxy. Throws on failure. */
export async function fetchAccountFolders(account) {
    const response = await fetch('/api/list-folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            imapConfig: {
                host: account.imapHost,
                port: account.imapPort,
                user: account.email,
                pass: account.password,
            },
            authType: account.authType,
            accessToken: account.accessToken,
            refreshToken: account.refreshToken,
        }),
    });
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Server returned HTML instead of JSON. Ensure the backend is running.');
    }
    const data = await response.json();
    if (!data.success) {
        throw new Error(data.error || 'Failed to list folders');
    }
    return (data.folders ?? []);
}
