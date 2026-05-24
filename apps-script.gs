/**
 * Amedeo — Form Handler (Google Apps Script)
 *
 * This script receives form submissions from the Amedeo website and forwards
 * them as emails to the right recipient based on the `form-name` field:
 *   - form-name = "alatura" → amedeo.oficial@gmail.com
 *   - form-name = "studio"  → rubenmocanstudio@gmail.com
 *
 * Honeypot field "bot-field" is checked — if filled, the submission is silently
 * dropped (likely a spam bot).
 *
 * Deploy as Web App:
 *   1. Save (Cmd+S), name the project "Amedeo Forms"
 *   2. Deploy → New deployment → gear icon → "Web app"
 *   3. Execute as: Me  ·  Who has access: Anyone
 *   4. Click Deploy → Authorize permissions
 *   5. Copy the Web app URL and paste it in index.html → APPS_SCRIPT_URL
 */

const RECIPIENTS = {
  alatura: { to: 'amedeo.oficial@gmail.com',  subject: 'Cerere alăturare Amedeo' },
  studio:  { to: 'rubenmocanstudio@gmail.com', subject: 'Studio Amedeo — cerere colaborare' }
};

const SKIP_FIELDS = ['form-name', 'bot-field', 'Limba site'];

function doPost(e) {
  try {
    const data = (e && e.parameter) ? e.parameter : {};
    const formName = data['form-name'] || '';

    // Honeypot — silently accept and drop
    if (data['bot-field']) {
      return jsonOut({ success: true, ignored: true });
    }

    const route = RECIPIENTS[formName];
    if (!route) {
      return jsonOut({ success: false, error: 'Unknown form: ' + formName });
    }

    // Subject suffix = submitter name/project
    const name = data['Nume complet'] || data['Nume / Proiect'] || 'utilizator';
    const subject = route.subject + ' — ' + name;

    // Build HTML email body
    const lang = data['Limba site'] || 'ro';
    let body = '<div style="font-family: -apple-system, Helvetica, Arial, sans-serif; max-width: 640px; background: #f8f6f1; padding: 32px; border-radius: 16px;">';
    body += '<div style="text-align:center; margin-bottom: 24px;">';
    body += '<div style="font-family: Georgia, serif; font-size: 28px; font-weight: 300; color: #0d1b2a; letter-spacing: 0.04em;">AMEDEO</div>';
    body += '<div style="font-size: 11px; letter-spacing: 0.35em; text-transform: uppercase; color: #2a9da8; margin-top: 4px;">LOVE OF GOD</div>';
    body += '</div>';
    body += '<h2 style="color: #0d1b2a; font-family: Georgia, serif; font-weight: 400; font-size: 22px; margin-bottom: 6px;">' + escapeHtml(route.subject) + '</h2>';
    body += '<div style="height: 2px; background: linear-gradient(90deg, #2a9da8, transparent); margin-bottom: 24px;"></div>';
    body += '<table style="border-collapse: collapse; width: 100%; background: white; border-radius: 12px; overflow: hidden;">';

    Object.keys(data).forEach(function(key) {
      if (SKIP_FIELDS.indexOf(key) >= 0) return;
      const value = String(data[key] || '').replace(/\r?\n/g, '<br>');
      body += '<tr>';
      body += '<td style="padding: 14px 18px; border-bottom: 1px solid #f0ece3; font-weight: 600; vertical-align: top; width: 38%; color: #4a4035; font-size: 13px; letter-spacing: 0.05em;">';
      body += escapeHtml(key);
      body += '</td>';
      body += '<td style="padding: 14px 18px; border-bottom: 1px solid #f0ece3; color: #1a1612; font-size: 14px;">';
      body += value;
      body += '</td>';
      body += '</tr>';
    });
    body += '</table>';
    body += '<p style="margin-top: 28px; font-size: 11px; color: #8a7d6e; text-align: center;">';
    body += 'Trimis de pe <strong>amedeo-oficial</strong> · ' + new Date().toLocaleString('ro-RO');
    body += '  ·  limba: ' + escapeHtml(lang);
    body += '</p>';
    body += '</div>';

    // Reply-to: if submitter left an email, set it so you can reply directly
    const options = { htmlBody: body, name: 'Amedeo Website' };
    if (data['Email'] && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data['Email'])) {
      options.replyTo = data['Email'];
    }

    MailApp.sendEmail(route.to, subject, body.replace(/<[^>]+>/g, ' '), options);

    return jsonOut({ success: true });
  } catch (err) {
    return jsonOut({ success: false, error: err.message || String(err) });
  }
}

// Useful for sanity checks: visit the deployed URL in a browser and you'll see this
function doGet() {
  return jsonOut({ success: true, message: 'Amedeo form handler is alive. POST form data here.' });
}

function jsonOut(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
