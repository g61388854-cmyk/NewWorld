import { describe, expect, it } from "vitest";
import { base32Decode, base32Encode, hotp, verifyTotp, totp } from "@/lib/totp";

// Тестовый вектор RFC 4226, приложение D: секрет "12345678901234567890".
const RFC_SECRET = base32Encode(Buffer.from("12345678901234567890"));

describe("TOTP", () => {
  it("HOTP совпадает с тестовыми векторами RFC 4226", () => {
    expect(hotp(RFC_SECRET, 0)).toBe("755224");
    expect(hotp(RFC_SECRET, 1)).toBe("287082");
    expect(hotp(RFC_SECRET, 9)).toBe("520489");
  });

  it("base32 обратимо", () => {
    const buf = Buffer.from("произвольные данные");
    expect(base32Decode(base32Encode(buf)).equals(buf)).toBe(true);
  });

  it("код принимается с допуском в один шаг и отклоняется за его пределами", () => {
    const now = 1_800_000_000_000;
    expect(verifyTotp(RFC_SECRET, totp(RFC_SECRET, now), now)).toBe(true);
    expect(verifyTotp(RFC_SECRET, totp(RFC_SECRET, now - 30_000), now)).toBe(true);
    expect(verifyTotp(RFC_SECRET, totp(RFC_SECRET, now - 90_000), now)).toBe(false);
    expect(verifyTotp(RFC_SECRET, "abc", now)).toBe(false);
  });
});
