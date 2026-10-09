import Swal from 'sweetalert2';

/**
 * Custom CoffeeBrew SweetAlert2 theme & helper utilities
 */
export const coffeeSwal = Swal.mixin({
  background: '#140c08',
  color: '#f4ebe2',
  backdrop: 'rgba(0, 0, 0, 0.85)',
  customClass: {
    popup: 'coffee-swal-popup',
    title: 'coffee-swal-title',
    htmlContainer: 'coffee-swal-html',
    confirmButton: 'coffee-swal-confirm',
    cancelButton: 'coffee-swal-cancel',
    denyButton: 'coffee-swal-deny',
    actions: 'coffee-swal-actions',
  },
  buttonsStyling: false,
});

export interface ConfirmOptions {
  title: string;
  text?: string;
  html?: string;
  confirmText?: string;
  cancelText?: string;
  icon?: 'warning' | 'question' | 'info' | 'error' | 'success';
  isDanger?: boolean;
}

export interface WinnerConfirmOptions {
  winnerName: string;
  corner: 'A' | 'B';
  matchLabel: string;
  affiliation?: string;
  photo?: string;
}

export const showAlert = {
  /**
   * Success notification
   */
  success: (title: string, text?: string, timer: number = 2500) => {
    return coffeeSwal.fire({
      icon: 'success',
      title,
      text,
      timer,
      timerProgressBar: true,
      showConfirmButton: false,
    });
  },

  /**
   * Error notification
   */
  error: (title: string, text?: string) => {
    return coffeeSwal.fire({
      icon: 'error',
      title,
      text,
      confirmButtonText: 'Tutup',
      customClass: {
        confirmButton: 'coffee-swal-danger-btn',
      },
    });
  },

  /**
   * Warning notification
   */
  warning: (title: string, text?: string) => {
    return coffeeSwal.fire({
      icon: 'warning',
      title,
      text,
      confirmButtonText: 'Mengerti',
    });
  },

  /**
   * Info notification
   */
  info: (title: string, text?: string) => {
    return coffeeSwal.fire({
      icon: 'info',
      title,
      text,
      confirmButtonText: 'OK',
    });
  },

  /**
   * Confirmation Dialog (Returns true if confirmed, false otherwise)
   */
  confirm: async ({
    title,
    text,
    html,
    confirmText = 'Ya, Lanjutkan',
    cancelText = 'Batal',
    icon = 'warning',
    isDanger = false,
  }: ConfirmOptions): Promise<boolean> => {
    const res = await coffeeSwal.fire({
      title,
      text,
      html,
      icon,
      showCancelButton: true,
      confirmButtonText: confirmText,
      cancelButtonText: cancelText,
      reverseButtons: true,
      focusCancel: isDanger,
      customClass: {
        confirmButton: isDanger ? 'coffee-swal-danger-btn' : 'coffee-swal-confirm',
        cancelButton: 'coffee-swal-cancel',
        actions: 'coffee-swal-actions',
      },
    });
    return res.isConfirmed;
  },

  /**
   * Specialized Confirmation for selecting Match Winner on TV / Stage
   */
  confirmWinner: async ({
    winnerName,
    corner,
    matchLabel,
    affiliation,
    photo,
  }: WinnerConfirmOptions): Promise<boolean> => {
    const isRed = corner === 'A';
    const cornerLabel = isRed ? 'SUDUT MERAH' : 'SUDUT BIRU';
    const cornerBadgeClass = isRed
      ? 'background: rgba(239, 68, 68, 0.2); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.5);'
      : 'background: rgba(59, 130, 246, 0.2); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.5);';

    const avatarHtml = photo
      ? `<img src="${photo}" alt="${winnerName}" style="width: 80px; height: 80px; border-radius: 9999px; object-fit: cover; border: 3px solid #eab308; margin: 0 auto 12px auto; box-shadow: 0 0 20px rgba(234, 179, 8, 0.4);" />`
      : `<div style="width: 80px; height: 80px; border-radius: 9999px; background: #22140d; border: 3px solid #eab308; display: flex; align-items: center; justify-content: center; font-size: 38px; margin: 0 auto 12px auto; box-shadow: 0 0 20px rgba(234, 179, 8, 0.4);">☕</div>`;

    const htmlContent = `
      <div style="text-align: center; padding: 4px 0;">
        ${avatarHtml}
        <div style="display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 11px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 8px; ${cornerBadgeClass}">
          ${cornerLabel}
        </div>
        <div style="font-size: 22px; font-weight: 900; color: #fff; margin-bottom: 4px;">
          ${winnerName}
        </div>
        ${affiliation ? `<div style="font-size: 13px; color: #c4a482; margin-bottom: 12px;">${affiliation}</div>` : ''}
        <div style="font-size: 13px; color: #e5cbb5; background: rgba(255,255,255,0.05); padding: 10px 14px; border-radius: 12px; border: 1px solid rgba(234,179,8,0.25);">
          Tetapkan sebagai pemenang <strong>${matchLabel}</strong> dan loloskan ke babak berikutnya?
        </div>
      </div>
    `;

    const res = await coffeeSwal.fire({
      title: 'Konfirmasi Pemenang',
      html: htmlContent,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: '🏆 Ya, Tetapkan Pemenang!',
      cancelButtonText: 'Batal',
      reverseButtons: true,
      customClass: {
        confirmButton: 'coffee-swal-confirm',
        cancelButton: 'coffee-swal-cancel',
        actions: 'coffee-swal-actions',
      },
    });

    return res.isConfirmed;
  },
};
