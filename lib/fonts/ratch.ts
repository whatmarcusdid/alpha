import localFont from 'next/font/local';

export const ratch = localFont({
  src: [
    {
      path: '../../public/fonts/Ratch-Regular.otf',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../../public/fonts/Ratch-Bold.otf',
      weight: '700',
      style: 'normal',
    },
  ],
  variable: '--font-ratch',
  display: 'swap',
});
