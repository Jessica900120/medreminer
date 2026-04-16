import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/medreminer/', // 必须加上这一行，名字要和仓库名一致
})
