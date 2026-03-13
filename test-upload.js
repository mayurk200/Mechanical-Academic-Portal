const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));

  console.log("Navigating to login...");
  await page.goto('http://127.0.0.1:8080/app/login.html');
  await page.fill('#email', 'mayurkudale2006@gmail.com');
  await page.fill('#password', 'mayur200');
  await page.click('button[type="submit"]');

  console.log("Waiting for dashboard...");
  await page.waitForTimeout(3000);

  console.log("Navigating to students...");
  await page.goto('http://127.0.0.1:8080/app/students.html');
  await page.waitForTimeout(2000);

  console.log("Injecting mock upload payload...");
  await page.evaluate(async () => {
    try {
      // Mock the UI state
      document.getElementById('bulk-course-select').innerHTML = '<option value="some-course-id">Mock Course</option>';
      document.getElementById('bulk-course-select').value = 'some-course-id';
      
      // Mock the parsed data
      window.parsedBulkData = [{
        _isValid: true,
        _parsedObj: {
          urn: '99999999',
          name: 'Playwright Test',
          rollNo: 'PT-01',
          department: 'CSE (IOT)',
          email: 'playwright@test.com'
        }
      }];

      // Mock validate check skip
      document.getElementById('bulk-validate-btn').classList.add('d-none');
      document.getElementById('bulk-upload-btn').classList.remove('d-none');
      
      console.log("Clicking bulk upload");
      document.getElementById('bulk-upload-btn').click();
    } catch (e) {
      console.error(e);
    }
  });

  await page.waitForTimeout(5000);
  await browser.close();
})();
