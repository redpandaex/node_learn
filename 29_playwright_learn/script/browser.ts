//! 显示操作浏览器界面
import { chromium, Browser, Page } from 'playwright';

(async () => {
  const browser: Browser = await chromium.launch({
    headless: false,
    executablePath: '/mnt/c/Program Files/Google/Chrome/Application/chrome.exe',
  });
  const page: Page = await browser.newPage();

  // 导航到登录页
  await page.goto('https://baidu.com/');

  // 输入凭据并提交
  await page.fill('#username', 'student');
  await page.fill('#password', 'Password123');
  await page.click('#submit');

  // 验证登录成功
  const successText = await page.textContent('.post-title');
  if (successText?.includes('Logged In Successfully')) {
    console.log('✅ 登录成功');
  } else {
    console.log('❌ 登录失败');
  }

  await browser.close();
})();
