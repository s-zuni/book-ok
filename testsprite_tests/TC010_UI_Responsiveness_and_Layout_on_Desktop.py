import asyncio
from playwright import async_api
from playwright.async_api import expect

async def run_test():
    pw = None
    browser = None
    context = None
    
    try:
        # Start a Playwright session in asynchronous mode
        pw = await async_api.async_playwright().start()
        
        # Launch a Chromium browser in headless mode with custom arguments
        browser = await pw.chromium.launch(
            headless=True,
            args=[
                "--window-size=1280,720",         # Set the browser window size
                "--disable-dev-shm-usage",        # Avoid using /dev/shm which can cause issues in containers
                "--ipc=host",                     # Use host-level IPC for better stability
                "--single-process"                # Run the browser in a single process mode
            ],
        )
        
        # Create a new browser context (like an incognito window)
        context = await browser.new_context()
        context.set_default_timeout(5000)
        
        # Open a new page in the browser context
        page = await context.new_page()
        
        # Navigate to your target URL and wait until the network request is committed
        await page.goto("http://localhost:3000/mypage", wait_until="commit", timeout=10000)
        
        # Wait for the main page to reach DOMContentLoaded state (optional for stability)
        try:
            await page.wait_for_load_state("domcontentloaded", timeout=3000)
        except async_api.Error:
            pass
        
        # Iterate through all iframes and wait for them to load as well
        for frame in page.frames:
            try:
                await frame.wait_for_load_state("domcontentloaded", timeout=3000)
            except async_api.Error:
                pass
        
        # Interact with the page elements to simulate user flow
        # -> Resize viewport to next desktop resolution and verify layout and interactive elements.
        await page.goto('http://localhost:3000/mypage', timeout=10000)
        await asyncio.sleep(3)
        

        # -> Resize viewport to next desktop resolution (e.g., 1366x768) and verify layout and interactive elements.
        await page.goto('http://localhost:3000/mypage', timeout=10000)
        await asyncio.sleep(3)
        

        # -> Resize viewport to 1366x768 resolution and verify layout and interactive elements.
        await page.goto('http://localhost:3000/mypage', timeout=10000)
        await asyncio.sleep(3)
        

        # -> Resize viewport to 1366x768 resolution and verify layout and interactive elements.
        await page.goto('http://localhost:3000/mypage', timeout=10000)
        await asyncio.sleep(3)
        

        # -> Resize viewport to the last desktop resolution (e.g., 1440x900) and verify layout and interactive elements.
        await page.goto('http://localhost:3000/mypage', timeout=10000)
        await asyncio.sleep(3)
        

        # -> Resize viewport to 1440x900 resolution and verify layout and interactive elements.
        await page.goto('http://localhost:3000/mypage', timeout=10000)
        await asyncio.sleep(3)
        

        # --> Assertions to verify final state
        frame = context.pages[-1]
        await expect(frame.locator('text=로그인/가입').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=북콕 소개').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=도서 추천').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=AI 독서 솔루션').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=커뮤니티').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=아이 프로필').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=+ 아이 프로필 추가하기').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=읽은 책 기록').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=아이를 선택해주세요').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=스크랩한 책').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=나중에 읽으려고 저장한 책').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=독서 성향 분석').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=AI가 분석한 우리 아이 맞춤 리포트').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=로그아웃').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=AI 책 추천').first).to_be_visible(timeout=30000)
        await asyncio.sleep(5)
    
    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()
            
asyncio.run(run_test())
    