import type {Metadata} from 'next';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: '智能图片数据提取与 Excel 导出系统',
  description: '通过 AI 视觉大模型识别多张图片中的结构化数据（微信聊天记录、表格、单据等），并分别写入同一个 Excel 文件的多个 Sheet 导出，支持剪贴板粘贴与批量管理。',
  openGraph: {
    title: '智能图片数据提取与 Excel 导出系统',
    description: '通过 AI 视觉大模型识别多张图片中的结构化数据并导出多 Sheet Excel 文件',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '智能图片数据提取与 Excel 导出系统',
    description: '通过 AI 视觉大模型识别多张图片中的结构化数据并导出多 Sheet Excel 文件',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
