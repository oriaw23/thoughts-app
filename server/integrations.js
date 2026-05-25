// ── OAuth config registry ─────────────────────────────────────────────────────
export const OAUTH = {
  google: {
    authUrl:      'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl:     'https://oauth2.googleapis.com/token',
    scope:        'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/documents https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/calendar',
    clientId:     () => process.env.GOOGLE_CLIENT_ID,
    clientSecret: () => process.env.GOOGLE_CLIENT_SECRET,
  },
  github: {
    authUrl:      'https://github.com/login/oauth/authorize',
    tokenUrl:     'https://github.com/login/oauth/access_token',
    scope:        'repo issues',
    clientId:     () => process.env.GITHUB_CLIENT_ID,
    clientSecret: () => process.env.GITHUB_CLIENT_SECRET,
  },
  notion: {
    authUrl:      'https://api.notion.com/v1/oauth/authorize',
    tokenUrl:     'https://api.notion.com/v1/oauth/token',
    scope:        '',
    clientId:     () => process.env.NOTION_CLIENT_ID,
    clientSecret: () => process.env.NOTION_CLIENT_SECRET,
  },
  slack: {
    authUrl:      'https://slack.com/oauth/v2/authorize',
    tokenUrl:     'https://slack.com/api/oauth.v2.access',
    scope:        'chat:write,channels:read',
    clientId:     () => process.env.SLACK_CLIENT_ID,
    clientSecret: () => process.env.SLACK_CLIENT_SECRET,
  },
  // Stub services — OAuth structure present but no action handlers
  airtable:    { authUrl: 'https://airtable.com/oauth2/v1/authorize',     tokenUrl: 'https://airtable.com/oauth2/v1/token',        scope: 'data.records:read data.records:write', clientId: () => process.env.AIRTABLE_CLIENT_ID,    clientSecret: () => process.env.AIRTABLE_CLIENT_SECRET    },
  linear:      { authUrl: 'https://linear.app/oauth/authorize',            tokenUrl: 'https://api.linear.app/oauth/token',           scope: 'issues:create issues:read',            clientId: () => process.env.LINEAR_CLIENT_ID,      clientSecret: () => process.env.LINEAR_CLIENT_SECRET      },
  discord:     { authUrl: 'https://discord.com/api/oauth2/authorize',      tokenUrl: 'https://discord.com/api/oauth2/token',         scope: 'bot',                                  clientId: () => process.env.DISCORD_CLIENT_ID,     clientSecret: () => process.env.DISCORD_CLIENT_SECRET     },
  trello:      { authUrl: 'https://trello.com/1/OAuthAuthorizeToken',      tokenUrl: 'https://trello.com/1/OAuthGetAccessToken',     scope: 'read,write',                           clientId: () => process.env.TRELLO_CLIENT_ID,      clientSecret: () => process.env.TRELLO_CLIENT_SECRET      },
  stripe:      { authUrl: 'https://connect.stripe.com/oauth/authorize',    tokenUrl: 'https://connect.stripe.com/oauth/token',       scope: 'read_write',                           clientId: () => process.env.STRIPE_CLIENT_ID,      clientSecret: () => process.env.STRIPE_CLIENT_SECRET      },
  hubspot:     { authUrl: 'https://app.hubspot.com/oauth/authorize',       tokenUrl: 'https://api.hubapi.com/oauth/v1/token',        scope: 'contacts',                             clientId: () => process.env.HUBSPOT_CLIENT_ID,     clientSecret: () => process.env.HUBSPOT_CLIENT_SECRET     },
  mailchimp:   { authUrl: 'https://login.mailchimp.com/oauth2/authorize',  tokenUrl: 'https://login.mailchimp.com/oauth2/token',     scope: '',                                     clientId: () => process.env.MAILCHIMP_CLIENT_ID,   clientSecret: () => process.env.MAILCHIMP_CLIENT_SECRET   },
  dropbox:     { authUrl: 'https://www.dropbox.com/oauth2/authorize',      tokenUrl: 'https://api.dropboxapi.com/oauth2/token',      scope: 'files.content.read files.content.write', clientId: () => process.env.DROPBOX_CLIENT_ID,   clientSecret: () => process.env.DROPBOX_CLIENT_SECRET     },
  twitter:     { authUrl: 'https://twitter.com/i/oauth2/authorize',        tokenUrl: 'https://api.twitter.com/2/oauth2/token',       scope: 'tweet.read tweet.write',               clientId: () => process.env.TWITTER_CLIENT_ID,     clientSecret: () => process.env.TWITTER_CLIENT_SECRET     },
  whatsapp:    { authUrl: 'https://www.facebook.com/dialog/oauth',         tokenUrl: 'https://graph.facebook.com/oauth/access_token', scope: 'whatsapp_business_messaging',         clientId: () => process.env.WHATSAPP_CLIENT_ID,    clientSecret: () => process.env.WHATSAPP_CLIENT_SECRET    },
  vercel:      { authUrl: 'https://vercel.com/oauth/authorize',             tokenUrl: 'https://api.vercel.com/v2/oauth/access_token', scope: '',                                    clientId: () => process.env.VERCEL_CLIENT_ID,      clientSecret: () => process.env.VERCEL_CLIENT_SECRET      },
  jira:        { authUrl: 'https://auth.atlassian.com/authorize',           tokenUrl: 'https://auth.atlassian.com/oauth/token',      scope: 'read:jira-work write:jira-work',       clientId: () => process.env.JIRA_CLIENT_ID,        clientSecret: () => process.env.JIRA_CLIENT_SECRET        },
  zapier:      { authUrl: 'https://zapier.com/oauth/authorize',             tokenUrl: 'https://zapier.com/oauth/token/',             scope: '',                                     clientId: () => process.env.ZAPIER_CLIENT_ID,      clientSecret: () => process.env.ZAPIER_CLIENT_SECRET      },
  shopify:     { authUrl: 'https://{shop}.myshopify.com/admin/oauth/authorize', tokenUrl: 'https://{shop}.myshopify.com/admin/oauth/access_token', scope: 'read_orders write_products', clientId: () => process.env.SHOPIFY_CLIENT_ID, clientSecret: () => process.env.SHOPIFY_CLIENT_SECRET },
  salesforce:  { authUrl: 'https://login.salesforce.com/services/oauth2/authorize', tokenUrl: 'https://login.salesforce.com/services/oauth2/token', scope: 'api',                  clientId: () => process.env.SALESFORCE_CLIENT_ID,  clientSecret: () => process.env.SALESFORCE_CLIENT_SECRET  },
  asana:       { authUrl: 'https://app.asana.com/-/oauth_authorize',        tokenUrl: 'https://app.asana.com/-/oauth_token',         scope: 'default',                              clientId: () => process.env.ASANA_CLIENT_ID,       clientSecret: () => process.env.ASANA_CLIENT_SECRET       },
  figma:       { authUrl: 'https://www.figma.com/oauth',                    tokenUrl: 'https://www.figma.com/api/oauth/token',       scope: 'files:read',                           clientId: () => process.env.FIGMA_CLIENT_ID,       clientSecret: () => process.env.FIGMA_CLIENT_SECRET       },
  zoom:        { authUrl: 'https://zoom.us/oauth/authorize',                tokenUrl: 'https://zoom.us/oauth/token',                 scope: 'meeting:write:admin',                  clientId: () => process.env.ZOOM_CLIENT_ID,        clientSecret: () => process.env.ZOOM_CLIENT_SECRET        },
  spotify:     { authUrl: 'https://accounts.spotify.com/authorize',         tokenUrl: 'https://accounts.spotify.com/api/token',     scope: 'playlist-modify-public playlist-modify-private user-read-private user-top-read', clientId: () => process.env.SPOTIFY_CLIENT_ID, clientSecret: () => process.env.SPOTIFY_CLIENT_SECRET },
};

// Check if credentials are configured for a service
export function isConfigured(service) {
  const cfg = OAUTH[service];
  if (!cfg) return false;
  return !!(cfg.clientId() && cfg.clientSecret());
}

// ── Action handlers (fully implemented for google, github, notion, slack) ─────
export const ACTIONS = {
  // ── Google ──────────────────────────────────────────────────────────────────
  google: {
    async write_sheets({ token, title = 'Export', data = [] }) {
      // Create new spreadsheet
      const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ properties: { title } }),
      });
      if (!createRes.ok) throw new Error(`Sheets create failed: ${createRes.status}`);
      const sheet = await createRes.json();
      const spreadsheetId = sheet.spreadsheetId;

      // Write data
      if (data.length) {
        await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A1:append?valueInputOption=RAW`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ values: data }),
        });
      }
      return { url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`, title };
    },

    async create_doc({ token, title = 'Document', content = '' }) {
      const res = await fetch('https://docs.googleapis.com/v1/documents', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      });
      if (!res.ok) throw new Error(`Docs create failed: ${res.status}`);
      const doc = await res.json();
      const documentId = doc.documentId;

      if (content) {
        await fetch(`https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            requests: [{ insertText: { location: { index: 1 }, text: content } }],
          }),
        });
      }
      return { url: `https://docs.google.com/document/d/${documentId}`, title };
    },

    async send_gmail({ token, to, subject, body }) {
      const email = [`To: ${to}`, `Subject: ${subject}`, 'Content-Type: text/plain; charset=utf-8', '', body].join('\r\n');
      const encoded = btoa(unescape(encodeURIComponent(email))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw: encoded }),
      });
      if (!res.ok) throw new Error(`Gmail send failed: ${res.status}`);
      return { sent: true, to, subject };
    },

    async create_event({ token, title, date, startTime = '09:00', endTime = '10:00', description = '' }) {
      const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          summary: title,
          description,
          start: { dateTime: `${date}T${startTime}:00`, timeZone: 'UTC' },
          end:   { dateTime: `${date}T${endTime}:00`,   timeZone: 'UTC' },
        }),
      });
      if (!res.ok) throw new Error(`Calendar create failed: ${res.status}`);
      const ev = await res.json();
      return { url: ev.htmlLink, title, date };
    },
  },

  // ── GitHub ───────────────────────────────────────────────────────────────────
  github: {
    async create_issue({ token, repo, title, body = '' }) {
      if (!repo) throw new Error('repo is required (owner/repo)');
      const res = await fetch(`https://api.github.com/repos/${repo}/issues`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/vnd.github+json' },
        body: JSON.stringify({ title, body }),
      });
      if (!res.ok) throw new Error(`GitHub issue failed: ${res.status}`);
      const issue = await res.json();
      return { url: issue.html_url, number: issue.number, title };
    },

    async create_pr({ token, repo, title, head, base = 'main', body = '' }) {
      if (!repo) throw new Error('repo is required (owner/repo)');
      const res = await fetch(`https://api.github.com/repos/${repo}/pulls`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/vnd.github+json' },
        body: JSON.stringify({ title, head, base, body }),
      });
      if (!res.ok) throw new Error(`GitHub PR failed: ${res.status}`);
      const pr = await res.json();
      return { url: pr.html_url, number: pr.number, title };
    },

    async list_repos({ token }) {
      const res = await fetch('https://api.github.com/user/repos?per_page=30&sort=updated', {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' },
      });
      if (!res.ok) throw new Error(`GitHub repos failed: ${res.status}`);
      const repos = await res.json();
      return { repos: repos.map(r => ({ name: r.full_name, url: r.html_url, private: r.private })) };
    },
  },

  // ── Notion ───────────────────────────────────────────────────────────────────
  notion: {
    async create_page({ token, title, content = '' }) {
      // Search for a parent page to use
      const searchRes = await fetch('https://api.notion.com/v1/search', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'Notion-Version': '2022-06-28' },
        body: JSON.stringify({ filter: { property: 'object', value: 'page' }, page_size: 1 }),
      });
      const searchData = await searchRes.json();
      const parentId = searchData.results?.[0]?.id;
      if (!parentId) throw new Error('No parent page found in Notion workspace');

      const res = await fetch('https://api.notion.com/v1/pages', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'Notion-Version': '2022-06-28' },
        body: JSON.stringify({
          parent: { page_id: parentId },
          properties: { title: { title: [{ text: { content: title } }] } },
          children: content ? [{ object: 'block', type: 'paragraph', paragraph: { rich_text: [{ text: { content } }] } }] : [],
        }),
      });
      if (!res.ok) throw new Error(`Notion create page failed: ${res.status}`);
      const page = await res.json();
      return { url: page.url, title };
    },

    async create_db_entry({ token, databaseId, properties = {} }) {
      if (!databaseId) throw new Error('databaseId is required');
      const res = await fetch('https://api.notion.com/v1/pages', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'Notion-Version': '2022-06-28' },
        body: JSON.stringify({ parent: { database_id: databaseId }, properties }),
      });
      if (!res.ok) throw new Error(`Notion create entry failed: ${res.status}`);
      const entry = await res.json();
      return { url: entry.url };
    },
  },

  // ── Spotify ─────────────────────────────────────────────────────────────────
  spotify: {
    async get_profile({ token }) {
      const res = await fetch('https://api.spotify.com/v1/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Spotify profile failed: ${res.status}`);
      const data = await res.json();
      return { name: data.display_name, id: data.id, url: data.external_urls?.spotify };
    },

    async search_track({ token, query, limit = 10 }) {
      const res = await fetch(
        `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=${limit}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!res.ok) throw new Error(`Spotify search failed: ${res.status}`);
      const data = await res.json();
      const tracks = (data.tracks?.items || []).map(t => ({
        id:       t.id,
        name:     t.name,
        artist:   t.artists?.[0]?.name,
        album:    t.album?.name,
        uri:      t.uri,
        url:      t.external_urls?.spotify,
        popularity: t.popularity,
        preview_url: t.preview_url,
      }));
      return { tracks };
    },

    async get_album_tracks({ token, albumId }) {
      if (!albumId) throw new Error('albumId is required');
      const res = await fetch(
        `https://api.spotify.com/v1/albums/${albumId}/tracks?limit=50`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!res.ok) throw new Error(`Spotify album failed: ${res.status}`);
      const data = await res.json();
      return {
        tracks: (data.items || []).map(t => ({
          id: t.id, name: t.name, uri: t.uri,
          artist: t.artists?.[0]?.name,
          duration_ms: t.duration_ms,
        })),
      };
    },

    async create_playlist({ token, name, description = '', trackUris = [] }) {
      // Get user id
      const me = await fetch('https://api.spotify.com/v1/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!me.ok) throw new Error(`Spotify me failed: ${me.status}`);
      const { id: userId } = await me.json();

      // Create playlist
      const create = await fetch(`https://api.spotify.com/v1/users/${userId}/playlists`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, public: false }),
      });
      if (!create.ok) throw new Error(`Spotify create playlist failed: ${create.status}`);
      const playlist = await create.json();

      // Add tracks in batches of 100
      if (trackUris.length) {
        for (let i = 0; i < trackUris.length; i += 100) {
          const batch = trackUris.slice(i, i + 100);
          await fetch(`https://api.spotify.com/v1/playlists/${playlist.id}/tracks`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ uris: batch }),
          });
        }
      }

      return {
        url: playlist.external_urls?.spotify,
        id:  playlist.id,
        name: playlist.name,
        trackCount: trackUris.length,
      };
    },

    async get_top_tracks({ token, limit = 20, timeRange = 'medium_term' }) {
      const res = await fetch(
        `https://api.spotify.com/v1/me/top/tracks?limit=${limit}&time_range=${timeRange}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!res.ok) throw new Error(`Spotify top tracks failed: ${res.status}`);
      const data = await res.json();
      return {
        tracks: (data.items || []).map(t => ({
          id: t.id, name: t.name, uri: t.uri,
          artist: t.artists?.[0]?.name, album: t.album?.name, popularity: t.popularity,
        })),
      };
    },
  },

  // ── Slack ────────────────────────────────────────────────────────────────────
  slack: {
    async send_message({ token, channel, text }) {
      const res = await fetch('https://slack.com/api/chat.postMessage', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel, text }),
      });
      if (!res.ok) throw new Error(`Slack send failed: ${res.status}`);
      const data = await res.json();
      if (!data.ok) throw new Error(`Slack error: ${data.error}`);
      return { sent: true, channel, ts: data.ts };
    },

    async list_channels({ token }) {
      const res = await fetch('https://slack.com/api/conversations.list?limit=50', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Slack list failed: ${res.status}`);
      const data = await res.json();
      if (!data.ok) throw new Error(`Slack error: ${data.error}`);
      return { channels: data.channels.map(c => ({ id: c.id, name: c.name, is_private: c.is_private })) };
    },
  },
};
