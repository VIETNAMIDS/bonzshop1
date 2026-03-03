// Danh sách domain email ảo / tạm thời (disposable/temporary email providers)
// Cập nhật: 2026-03-03

const DISPOSABLE_EMAIL_DOMAINS: Set<string> = new Set([
  // Popular disposable email services
  'tempmail.com', 'temp-mail.org', 'temp-mail.io', 'tempail.com',
  'guerrillamail.com', 'guerrillamail.net', 'guerrillamail.org', 'guerrillamail.de',
  'guerrillamailblock.com', 'grr.la', 'sharklasers.com', 'guerrilla.ml',
  'mailinator.com', 'mailinator.net', 'mailinator2.com', 'maildrop.cc',
  'yopmail.com', 'yopmail.fr', 'yopmail.net', 'yopmail.gq',
  'throwaway.email', 'throwaway.cc',
  'dispostable.com', 'disposableemailaddresses.emailmiser.com',
  'mailnesia.com', 'mailnator.com',
  'trashmail.com', 'trashmail.me', 'trashmail.net', 'trashmail.org', 'trashmail.at',
  'trashemail.de', 'trashymail.com', 'trashymail.net',
  '10minutemail.com', '10minutemail.net', '10minutemail.org',
  '10minutemail.co.za', '10minutemail.de',
  'minutemail.com', 'minuteinbox.com',
  'fakeinbox.com', 'fakemail.fr', 'fakemail.net',
  'mohmal.com', 'mohmal.in', 'mohmal.im',
  'getnada.com', 'nada.email', 'nada.ltd',
  'emailondeck.com',
  'crazymailing.com',
  'tempinbox.com', 'tempinbox.co.uk',
  'mailtemp.info', 'mailtemp.net',
  'harakirimail.com',
  'mailcatch.com',
  'tempr.email', 'tempomail.fr',
  'discard.email', 'discardmail.com', 'discardmail.de',
  'spamgourmet.com', 'spamgourmet.net', 'spamgourmet.org',
  'mytemp.email', 'mytempemail.com',
  'binkmail.com', 'bobmail.info',
  'chammy.info', 'devnullmail.com',
  'letthemeatspam.com',
  'mailexpire.com', 'mailforspam.com', 'mailhazard.com', 'mailhazard.us',
  'mailmoat.com', 'mailnull.com', 'mailscrap.com', 'mailshell.com',
  'mailsiphon.com', 'mailslite.com', 'mailzilla.com', 'mailzilla.org',
  'nomail.xl.cx', 'nospam.ze.tc', 'nospamfor.us',
  'objectmail.com', 'obobbo.com',
  'onewaymail.com', 'owlpic.com',
  'proxymail.eu', 'punkass.com',
  'reallymymail.com', 'recode.me',
  'regbypass.com', 'regbypass.comsafe-mail.net',
  'safetymail.info', 'sandelf.de',
  'sharklasers.com', 'shieldedmail.com', 'shitmail.me',
  'skeefmail.com', 'slaskpost.se', 'slipry.net',
  'sogetthis.com', 'soodonims.com', 'spam4.me',
  'spamavert.com', 'spambob.com', 'spambob.net', 'spambob.org',
  'spambog.com', 'spambog.de', 'spambog.ru',
  'spambox.us', 'spamcannon.com', 'spamcannon.net',
  'spamcero.com', 'spamcon.org', 'spamcorptastic.com',
  'spamcowboy.com', 'spamcowboy.net', 'spamcowboy.org',
  'spamday.com', 'spamex.com', 'spamfighter.cf',
  'spamfree24.com', 'spamfree24.de', 'spamfree24.eu',
  'spamfree24.info', 'spamfree24.net', 'spamfree24.org',
  'spamhole.com', 'spaml.com', 'spaml.de',
  'spammotel.com', 'spamobox.com',
  'spamoff.de', 'spamslicer.com', 'spamspot.com',
  'spamstack.net', 'spamthis.co.uk', 'spamtrap.ro',
  'spamtrail.com', 'spamwc.de',
  'superrito.com', 'suremail.info',
  'teleworm.com', 'teleworm.us',
  'thankyou2010.com', 'thankyou2016.com',
  'thisisnotmyrealemail.com',
  'throwawayemailaddress.com',
  'tmail.ws', 'tmailinator.com',
  'toiea.com', 'toomail.biz',
  'tradermail.info', 'turual.com',
  'uggsrock.com', 'upliftnow.com', 'uplipht.com',
  'venompen.com', 'veryreallylongdomainnameforemailservice.com',
  'viditag.com', 'viewcastmedia.com', 'viewcastmedia.net',
  'viewcastmedia.org',
  'vomoto.com', 'vpn.st',
  'wasteland.rfc822.org', 'webemail.me', 'weg-werf-email.de',
  'wegwerfadresse.de', 'wegwerfemail.com', 'wegwerfemail.de',
  'wegwerfmail.de', 'wegwerfmail.info', 'wegwerfmail.net',
  'wegwerfmail.org',
  'wh4f.org', 'whatiaas.com', 'whatpaas.com',
  'wilemail.com', 'willhackforfood.biz', 'willselfdestruct.com',
  'winemaven.info', 'wronghead.com',
  'wuzup.net', 'wuzupmail.net',
  'wwwnew.eu', 'xagloo.com', 'xemaps.com',
  'xents.com', 'xmaily.com',
  'xoxy.net', 'yapped.net',
  'yet.net', 'yogamaven.com',
  'yuurok.com',
  'zehnminutenmail.de', 'zippymail.info',
  'zoaxe.com', 'zoemail.org',
  
  // Vietnamese disposable services
  'emailgia.com', 'emailao.com', 'emailtam.com',
  
  // More common ones
  'mailsac.com', 'inboxkitten.com', 'mailgw.com',
  'tmpmail.net', 'tmpmail.org', 'tmp-mail.com',
  'burnermail.io', 'burpcollaborator.net',
  'getairmail.com', 'mailpoof.com',
  'emailfake.com', 'email-fake.com', 'fakemailgenerator.com',
  'generator.email', 'emkei.cz',
  'anonaddy.com', 'anonaddy.me',
  'duck.com', // DuckDuckGo email relay - optional
  'simplelogin.io', 'simplelogin.com', 'simplelogin.co',
  'relay.firefox.com', 'mozmail.com',
  'protonmail.com', // uncomment if you want to block
  
  // Catch-all patterns
  'mailhero.io', 'inboxes.com',
  'meltmail.com', 'mvrht.net',
  'nwldx.com', 'privymail.de',
  'quickinbox.com',
  'receiveee.com',
  'powered.name',
  'rootfest.net',
  'royal.net',
  'ruffrey.com',
  'shopunt.com',
  'sinnlos-mail.de',
  'siteposter.net',
  'smoothmail.com',
  'sneakemail.com',
  'sofimail.com',
  'speed.1s.fr',
  'supergreatmail.com',
  'swiftdesk.com',
  'tafmail.com',
  'tempsky.com',
  'testmail.app',
  
  // Additional well-known disposable domains
  'mailbox52.ga', 'cuvox.de', 'dayrep.com', 'einrot.com',
  'fleckens.hu', 'gustr.com', 'jourrapide.com', 'rhyta.com',
  'superrito.com', 'teleworm.us', 'armyspy.com',
  
  // More 2024-2026 additions
  'tmail.gg', 'internxt.com',
  'tempmailers.com', 'emailnator.com',
  'luxusmail.org', 'tmailor.com',
  'tempemails.io',
]);

// Các pattern đáng nghi (regex)
const SUSPICIOUS_PATTERNS: RegExp[] = [
  /^test[0-9]*@/i,
  /^fake[0-9]*@/i,
  /^spam[0-9]*@/i,
  /^trash[0-9]*@/i,
  /^temp[0-9]*@/i,
  /^dummy[0-9]*@/i,
  /^throwaway/i,
  /^disposable/i,
  /^noreply/i,
  /^no-reply/i,
  /^donotreply/i,
  /^asdf+@/i,
  /^qwer+@/i,
  /^[a-z]{1,2}[0-9]{5,}@/i, // single letter + many numbers like a12345@
  /^[0-9]{8,}@/i, // only numbers 8+ digits
];

// Các TLD đáng nghi thường dùng cho email ảo
const SUSPICIOUS_TLDS = new Set([
  '.tk', '.ml', '.ga', '.cf', '.gq', // Free TLDs often used for spam
  '.top', '.xyz', '.click', '.link', '.buzz',
  '.icu', '.monster', '.rest', '.surf',
]);

export interface EmailValidationResult {
  isValid: boolean;
  reason?: string;
}

/**
 * Kiểm tra email có phải email ảo/tạm thời không
 */
export function validateEmailNotDisposable(email: string): EmailValidationResult {
  if (!email || !email.includes('@')) {
    return { isValid: false, reason: 'Email không hợp lệ' };
  }

  const lowerEmail = email.toLowerCase().trim();
  const parts = lowerEmail.split('@');
  if (parts.length !== 2) {
    return { isValid: false, reason: 'Email không hợp lệ' };
  }

  const [localPart, domain] = parts;

  // 1. Check disposable domain
  if (DISPOSABLE_EMAIL_DOMAINS.has(domain)) {
    return { isValid: false, reason: 'Email tạm thời không được phép sử dụng. Vui lòng dùng email thật (Gmail, Outlook, Yahoo,...)' };
  }

  // 2. Check subdomain variations (e.g. abc.tempmail.com)
  const domainParts = domain.split('.');
  if (domainParts.length > 2) {
    const baseDomain = domainParts.slice(-2).join('.');
    if (DISPOSABLE_EMAIL_DOMAINS.has(baseDomain)) {
      return { isValid: false, reason: 'Email tạm thời không được phép sử dụng. Vui lòng dùng email thật.' };
    }
  }

  // 3. Check suspicious patterns in local part
  for (const pattern of SUSPICIOUS_PATTERNS) {
    if (pattern.test(lowerEmail)) {
      return { isValid: false, reason: 'Email có dấu hiệu không hợp lệ. Vui lòng sử dụng email cá nhân thật.' };
    }
  }

  // 4. Check suspicious TLDs
  for (const tld of SUSPICIOUS_TLDS) {
    if (domain.endsWith(tld)) {
      return { isValid: false, reason: 'Tên miền email không được chấp nhận. Vui lòng dùng email từ nhà cung cấp uy tín.' };
    }
  }

  // 5. Check if domain has + trick abuse (many + signs)
  if ((localPart.match(/\+/g) || []).length > 1) {
    return { isValid: false, reason: 'Email không hợp lệ. Vui lòng sử dụng email chính thức.' };
  }

  // 6. Check extremely long local parts (often generated)
  if (localPart.length > 40) {
    return { isValid: false, reason: 'Địa chỉ email quá dài. Vui lòng sử dụng email ngắn gọn hơn.' };
  }

  // 7. Check if local part is mostly random characters
  const consonantRatio = (localPart.replace(/[aeiou0-9._+-]/gi, '').length) / localPart.length;
  if (localPart.length > 10 && consonantRatio > 0.8) {
    return { isValid: false, reason: 'Email có vẻ được tạo tự động. Vui lòng sử dụng email cá nhân thật.' };
  }

  return { isValid: true };
}

/**
 * Danh sách email providers uy tín (whitelist - optional strict mode)
 */
export const TRUSTED_EMAIL_PROVIDERS = new Set([
  'gmail.com', 'googlemail.com',
  'outlook.com', 'hotmail.com', 'live.com', 'msn.com',
  'yahoo.com', 'yahoo.co.uk', 'yahoo.com.vn',
  'icloud.com', 'me.com', 'mac.com',
  'aol.com',
  'zoho.com', 'zohomail.com',
  'mail.com',
  'gmx.com', 'gmx.de', 'gmx.net',
  'yandex.com', 'yandex.ru',
  'proton.me', 'protonmail.com', 'pm.me',
  // Vietnamese providers
  'fpt.com.vn', 'vnn.vn',
]);
