/**
 * صفحه‌ی تنظیمات (مالک: AI-05 طبق قرارداد §6): تم، کوررنگی، صدا/موسیقی/هپتیک
 * (AudioApi)، یادآور روزانه (به‌عهده‌ی meta-retention از طریق Storage مشترک)،
 * زبان (فعلاً fa)، درباره و حریم خصوصی. همه‌ی متن‌ها از locales/fa.json.
 */
import type { JSX } from 'preact';
import { toPersianDigits } from '@dordaneh/contracts';
import { t } from '../core/i18n';
import { useShell } from './context';
import type { ThemePreference } from '../core/theme';

const APP_VERSION = '0.1.0';

function Row(props: { label: string; desc?: string; children: JSX.Element }): JSX.Element {
  return (
    <div class="dor-settings-row">
      <div class="dor-settings-label">
        <span>{props.label}</span>
        {props.desc ? <small>{props.desc}</small> : null}
      </div>
      {props.children}
    </div>
  );
}

function Toggle(props: { id: string; checked: boolean; onChange: (v: boolean) => void }): JSX.Element {
  return (
    <input
      type="checkbox"
      role="switch"
      id={props.id}
      checked={props.checked}
      onChange={(e) => props.onChange((e.target as HTMLInputElement).checked)}
    />
  );
}

export function SettingsScreen(): JSX.Element {
  const { settings, updateSettings, theme, services } = useShell();

  const themeOptions: Array<{ value: ThemePreference; label: string }> = [
    { value: 'light', label: t('appShell.settings.theme.light') },
    { value: 'dark', label: t('appShell.settings.theme.dark') },
    { value: 'auto', label: t('appShell.settings.theme.auto') },
  ];

  return (
    <section id="settings-screen" class="dor-screen">
      <h2>{t('appShell.settings.title')}</h2>

      <Row label={t('appShell.settings.theme')}>
        <div class="dor-segmented" role="radiogroup" id="theme-picker">
          {themeOptions.map((opt) => (
            <button
              key={opt.value}
              role="radio"
              aria-checked={settings.theme === opt.value}
              data-value={opt.value}
              onClick={() => {
                theme.setTheme(opt.value);
                updateSettings({ theme: opt.value });
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </Row>

      <Row label={t('appShell.settings.colorblind')} desc={t('appShell.settings.colorblind.desc')}>
        <Toggle
          id="toggle-colorblind"
          checked={settings.colorblind}
          onChange={(v) => {
            theme.setColorblind(v);
            updateSettings({ colorblind: v });
          }}
        />
      </Row>

      <Row label={t('appShell.settings.sound')}>
        <Toggle
          id="toggle-sfx"
          checked={settings.sfx}
          onChange={(v) => {
            services.audio.setSfxEnabled(v);
            updateSettings({ sfx: v });
          }}
        />
      </Row>

      <Row label={t('appShell.settings.music')}>
        <Toggle
          id="toggle-music"
          checked={settings.music}
          onChange={(v) => {
            services.audio.setMusicEnabled(v);
            updateSettings({ music: v });
          }}
        />
      </Row>

      <Row label={t('appShell.settings.haptics')}>
        <Toggle
          id="toggle-haptics"
          checked={settings.haptics}
          onChange={(v) => updateSettings({ haptics: v })}
        />
      </Row>

      <Row label={t('appShell.settings.reminder')} desc={t('appShell.settings.reminder.desc')}>
        <Toggle
          id="toggle-reminder"
          checked={settings.dailyReminder}
          onChange={(v) => updateSettings({ dailyReminder: v })}
        />
      </Row>

      <Row label={t('appShell.settings.language')}>
        <select id="locale-picker" value={settings.locale} disabled>
          <option value="fa">{t('appShell.settings.language.fa')}</option>
        </select>
      </Row>

      <details class="dor-about" id="about-section">
        <summary>{t('appShell.settings.about')}</summary>
        <p>{t('appShell.settings.about.body')}</p>
        <p>{t('appShell.settings.version', { version: toPersianDigits(APP_VERSION) })}</p>
      </details>

      <details class="dor-privacy" id="privacy-section">
        <summary>{t('appShell.settings.privacy')}</summary>
        <p>{t('appShell.settings.privacy.body')}</p>
      </details>
    </section>
  );
}
