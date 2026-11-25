import { test } from "node:test";
import assert from "node:assert/strict";
import { mailConfigured } from "./mail-status.ts";

test("mailConfigured is true only when both SMTP_URL and MAIL_FROM are set", () => {
  const smtp = process.env.SMTP_URL;
  const from = process.env.MAIL_FROM;
  try {
    delete process.env.SMTP_URL;
    delete process.env.MAIL_FROM;
    assert.equal(mailConfigured(), false);

    process.env.SMTP_URL = "smtps://user:pass@smtp.example.com:465";
    assert.equal(mailConfigured(), false, "SMTP alone isn't enough; a From address is needed too");

    process.env.MAIL_FROM = "Zinloop <alerts@zinloop.com>";
    assert.equal(mailConfigured(), true);

    delete process.env.SMTP_URL;
    assert.equal(mailConfigured(), false);
  } finally {
    if (smtp === undefined) delete process.env.SMTP_URL;
    else process.env.SMTP_URL = smtp;
    if (from === undefined) delete process.env.MAIL_FROM;
    else process.env.MAIL_FROM = from;
  }
});
