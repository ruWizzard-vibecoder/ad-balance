export async function sendSlackAlert(opts: {
  webhookUrl: string;
  platformName: string;
  level: string;
  balance: number;
  currency: string;
  dailySpend: number;
  daysRemaining: number;
}): Promise<{ ok: boolean; error?: string }> {
  const emoji =
    opts.level === "critical" ? "\u{1F534}" :
    opts.level === "warning" ? "\u{1F7E0}" : "\u{1F7E1}";

  const currencySymbol = opts.currency === "RUB" ? "\u20BD" : "$";

  const text = [
    `${emoji} *${opts.platformName}*: баланс на ${opts.daysRemaining} дн.`,
    `\u{1F4B0} Остаток: ${opts.balance.toFixed(2)} ${currencySymbol}`,
    `\u{1F4C9} Средний расход: ${opts.dailySpend.toFixed(2)} ${currencySymbol}/день`,
  ].join("\n");

  try {
    const res = await fetch(opts.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });

    if (!res.ok) {
      return { ok: false, error: `Slack returned ${res.status}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}
