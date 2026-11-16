import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useTranslation } from 'react-i18next';

export function RoomQr({ code }: { code: string }) {
  const { t } = useTranslation();
  const [notice, setNotice] = useState('');
  const url = `${window.location.origin}/join?code=${encodeURIComponent(code)}`;
  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setNotice(t('features.copied'));
    } catch {
      setNotice(t('features.copyFailed'));
    }
  }
  return (
    <div className="room-qr">
      <QRCodeSVG
        value={url}
        size={256}
        level="M"
        marginSize={4}
        bgColor="#ffffff"
        fgColor="#000000"
        role="img"
        aria-label={t('features.qrAlt', { code })}
        data-testid="room-qr"
      />
      <p>{t('features.scan')}</p>
      <a href={url} data-testid="room-join-link">
        {t('features.joinLink')}
      </a>
      <button
        type="button"
        className="btn btn--secondary"
        data-testid="btn-copy-room-link"
        onClick={copy}
      >
        {t('features.copyLink')}
      </button>
      <p role="status" className="room-qr__notice">{notice}</p>
    </div>
  );
}
