import { Browser, BrowserContext, firefox, Page } from "playwright-core";

const URL = 'https://cas.u-bordeaux.fr/cas/login';

export default class UBCalCookieDumper {

    readonly #browser: Browser;
    readonly #page: Page;
    readonly #context: BrowserContext;
    
    /**
     * Creates a new instance of UBCalCookieDumper
     * @param browser The browser instance to use
     * @param context The browser context instance to use
     * @param page The page instance to use
     */
    private constructor(browser: Browser, context: BrowserContext, page: Page) {
        this.#browser = browser;
        this.#page = page;
        this.#context = context;
    }

    /**
     * Save the current browser context to the given path
     * @param path The path of the browser context to save
     */
    async saveBrowserContext(path: string) {
        await this.#context.storageState({path});
    }

    /**
     * Wait for the sucess message appears
     */
    async waitForSuccessMessage() {
        try {
            await this.#page.waitForSelector("//div[contains(@class,'success')]");
        } catch {
            await this.waitForSuccessMessage();
        }
    }

    /**
     * Close the page, browser and the browser context
     */
    async close() {
        await this.#page.close();
        await this.#context.close();
        await this.#browser.close();
    }

    /**
     * Initialises a new UBCalCookieDumper instance
     * @returns A promise which contains a new instance of UBCalCookieDumper
     */
    static async init(): Promise<UBCalCookieDumper> {
        const browser = await firefox.launch({headless: false});
        const context = await browser.newContext();
        const page = await context.newPage();
        await page.goto(URL);
        return new UBCalCookieDumper(browser, context, page);
    }
    
}
