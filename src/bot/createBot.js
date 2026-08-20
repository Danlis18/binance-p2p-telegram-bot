import { Telegraf, session } from 'telegraf';
import { AmountParseError, parseAmountInput } from '../parser/amountParser.js';
import { fiatInfo } from '../domain/currencies.js';
import { createInitialSession } from './session.js';
import { fiatKeyboard, mainKeyboard, paymentKeyboard, rateKeyboard, resultKeyboard } from './keyboards.js';
import { helpText, resultText, settingsText, welcomeText } from './messages.js';

function canUseBot(ctx, allowedUserIds) {
  if (allowedUserIds.size === 0) return true;
  return allowedUserIds.has(String(ctx.from?.id ?? ''));
}

function createLimiter({ limit = 8, windowMs = 10_000 } = {}) {
  const users = new Map();
  return (userId) => {
    const now = Date.now();
    const recent = (users.get(userId) ?? []).filter((ts) => now - ts < windowMs);
    if (recent.length >= limit) return false;
    recent.push(now);
    users.set(userId, recent);
    return true;
  };
}

async function safeEdit(ctx, text, keyboard) {
  try {
    await ctx.editMessageText(text, { parse_mode: 'HTML', ...keyboard });
  } catch (error) {
    if (!String(error?.description ?? error?.message).includes('message is not modified')) throw error;
  }
}

export function createBot({ config, rateService, logger }) {
  const bot = new Telegraf(config.botToken);
  const allowRequest = createLimiter();

  bot.use(session({ defaultSession: () => createInitialSession(config) }));

  bot.use(async (ctx, next) => {
    if (canUseBot(ctx, config.allowedUserIds)) return next();
    logger.warn({ userId: ctx.from?.id }, 'Blocked unauthorized Telegram user');
    if (ctx.callbackQuery) await ctx.answerCbQuery('Немає доступу.', { show_alert: true }).catch(() => {});
  });

  bot.start(async (ctx) => {
    await ctx.reply(welcomeText(ctx.session), { parse_mode: 'HTML', ...mainKeyboard(ctx.session) });
  });

  bot.command('help', async (ctx) => {
    await ctx.reply(helpText, { parse_mode: 'HTML', ...mainKeyboard(ctx.session) });
  });

  bot.command('settings', async (ctx) => {
    await ctx.reply(settingsText(ctx.session), { parse_mode: 'HTML', ...mainKeyboard(ctx.session) });
  });

  bot.action('noop', async (ctx) => ctx.answerCbQuery());

  bot.action('menu:main', async (ctx) => {
    await ctx.answerCbQuery();
    await safeEdit(ctx, settingsText(ctx.session), mainKeyboard(ctx.session));
  });

  bot.action('menu:fiat', async (ctx) => {
    await ctx.answerCbQuery();
    await safeEdit(ctx, '💱 <b>Оберіть фіатну валюту</b>', fiatKeyboard(ctx.session.fiat));
  });

  bot.action('menu:rate', async (ctx) => {
    await ctx.answerCbQuery();
    await safeEdit(
      ctx,
      '📊 <b>Як рахувати P2P-курс?</b>\n\n<b>Середній 6–25</b> — пропускаємо перші 5 оголошень Binance P2P і рахуємо середнє по наступних 20.',
      rateKeyboard(ctx.session.strategy)
    );
  });

  bot.action('menu:payment', async (ctx) => {
    await ctx.answerCbQuery('Завантажую методи оплати…');
    try {
      ctx.session.paymentOptions = await rateService.getTradeMethods(ctx.session.fiat);
      ctx.session.paymentPage = 0;
      const title = ctx.session.paymentOptions.length
        ? `🏦 <b>Метод оплати · ${ctx.session.fiat}</b>`
        : `🏦 Для ${ctx.session.fiat} Binance не повернув список методів. Можна залишити «Усі».`;
      await safeEdit(ctx, title, paymentKeyboard(ctx.session, 0));
    } catch (error) {
      logger.warn({ err: error?.message }, 'Unable to load payment methods');
      await safeEdit(ctx, '⚠️ Не вдалося завантажити методи оплати. Спробуй ще раз.', mainKeyboard(ctx.session));
    }
  });

  bot.action(/^paypage:(\d+)$/, async (ctx) => {
    const page = Number(ctx.match[1]);
    ctx.session.paymentPage = page;
    await ctx.answerCbQuery();
    await safeEdit(ctx, `🏦 <b>Метод оплати · ${ctx.session.fiat}</b>`, paymentKeyboard(ctx.session, page));
  });

  bot.action('pay:all', async (ctx) => {
    ctx.session.paymentMethod = null;
    ctx.session.paymentMethodName = null;
    await ctx.answerCbQuery('Усі методи оплати');
    await safeEdit(ctx, settingsText(ctx.session), mainKeyboard(ctx.session));
  });

  bot.action(/^payidx:(\d+)$/, async (ctx) => {
    const index = Number(ctx.match[1]);
    const item = ctx.session.paymentOptions?.[index];
    if (!item) return ctx.answerCbQuery('Метод уже неактуальний. Відкрий список ще раз.', { show_alert: true });
    ctx.session.paymentMethod = item.identifier;
    ctx.session.paymentMethodName = item.name;
    await ctx.answerCbQuery(item.name);
    await safeEdit(ctx, settingsText(ctx.session), mainKeyboard(ctx.session));
  });

  bot.action(/^fiat:([A-Z]{3})$/, async (ctx) => {
    const fiat = ctx.match[1];
    ctx.session.fiat = fiat;
    ctx.session.paymentMethod = null;
    ctx.session.paymentMethodName = null;
    await ctx.answerCbQuery(`${fiatInfo(fiat).flag} ${fiat}`);
    await safeEdit(ctx, settingsText(ctx.session), mainKeyboard(ctx.session));
  });

  bot.action(/^rate:(BEST|TOP3|TOP5)$/, async (ctx) => {
    ctx.session.strategy = ctx.match[1];
    await ctx.answerCbQuery('Збережено');
    await safeEdit(ctx, settingsText(ctx.session), mainKeyboard(ctx.session));
  });

  bot.action(/^mode:(BUY|SELL)$/, async (ctx) => {
    ctx.session.mode = ctx.match[1];
    await ctx.answerCbQuery(ctx.session.mode === 'BUY' ? 'Режим: купівля USDT' : 'Режим: продаж USDT');

    if (ctx.session.lastQuery) {
      try {
        const quote = await rateService.getMarketRate({
          fiat: ctx.session.fiat,
          tradeType: ctx.session.mode,
          paymentMethod: ctx.session.paymentMethod,
          strategy: ctx.session.strategy,
          amount: ctx.session.lastQuery.amount,
          inputKind: ctx.session.lastQuery.kind
        });
        await safeEdit(ctx, resultText({ session: ctx.session, parsed: ctx.session.lastQuery, quote }), resultKeyboard(ctx.session));
        return;
      } catch (error) {
        logger.warn({ err: error?.message }, 'Mode switch refresh failed');
      }
    }
    await safeEdit(ctx, settingsText(ctx.session), mainKeyboard(ctx.session));
  });

  bot.action('action:refresh', async (ctx) => {
    if (!ctx.session.lastQuery) return ctx.answerCbQuery('Спочатку надішли суму.', { show_alert: true });
    if (!allowRequest(String(ctx.from?.id ?? ''))) return ctx.answerCbQuery('Занадто часто. Спробуй за кілька секунд.', { show_alert: true });

    await ctx.answerCbQuery('Оновлюю курс…');
    try {
      const quote = await rateService.getMarketRate({
        fiat: ctx.session.fiat,
        tradeType: ctx.session.mode,
        paymentMethod: ctx.session.paymentMethod,
        strategy: ctx.session.strategy,
        amount: ctx.session.lastQuery.amount,
        inputKind: ctx.session.lastQuery.kind
      });
      await safeEdit(ctx, resultText({ session: ctx.session, parsed: ctx.session.lastQuery, quote }), resultKeyboard(ctx.session));
    } catch (error) {
      logger.error({ err: error?.message }, 'Refresh failed');
      await ctx.answerCbQuery('Binance тимчасово не відповідає.', { show_alert: true }).catch(() => {});
    }
  });

  bot.on('text', async (ctx) => {
    if (ctx.message.text.startsWith('/')) return;
    const userId = String(ctx.from?.id ?? 'unknown');
    if (!allowRequest(userId)) {
      await ctx.reply('⏳ Забагато запитів. Спробуй ще раз за кілька секунд.');
      return;
    }

    try {
      const parsed = parseAmountInput(ctx.message.text, {
        selectedFiat: ctx.session.fiat,
        lastInputKind: ctx.session.lastInputKind
      });

      if (parsed.kind === 'fiat' && parsed.currency !== ctx.session.fiat) {
        ctx.session.fiat = parsed.currency;
        ctx.session.paymentMethod = null;
        ctx.session.paymentMethodName = null;
      }

      ctx.session.lastInputKind = parsed.kind;
      ctx.session.lastQuery = parsed;

      const quote = await rateService.getMarketRate({
        fiat: ctx.session.fiat,
        tradeType: ctx.session.mode,
        paymentMethod: ctx.session.paymentMethod,
        strategy: ctx.session.strategy,
        amount: parsed.amount,
        inputKind: parsed.kind
      });

      await ctx.reply(resultText({ session: ctx.session, parsed, quote }), {
        parse_mode: 'HTML',
        ...resultKeyboard(ctx.session)
      });
    } catch (error) {
      if (error instanceof AmountParseError) {
        await ctx.reply(`🤔 ${error.message}\n\nПриклад: <code>1000 грн</code> або <code>100 USDT</code>.`, { parse_mode: 'HTML' });
        return;
      }
      logger.error({ err: error?.message, userId }, 'Quote request failed');
      await ctx.reply('⚠️ Не вдалося отримати актуальний Binance P2P-курс. Спробуй ще раз трохи пізніше.');
    }
  });

  bot.catch((error, ctx) => {
    logger.error({ err: error?.message, updateId: ctx.update?.update_id }, 'Unhandled Telegram bot error');
  });

  return bot;
}
