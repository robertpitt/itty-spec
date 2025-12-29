// https://vitepress.dev/guide/custom-theme
import type { Theme } from 'vitepress';
import DefaultTheme from 'vitepress/theme';
import './style.scss';

export default {
  extends: DefaultTheme,
} satisfies Theme;
