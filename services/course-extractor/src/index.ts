import { Browser, BrowserContext, ElementHandle, firefox, Page } from "playwright-core";

const URL = 'https://mondossierweb.u-bordeaux.fr/robots.txt';
const POPUP_SELECTOR = '//div[contains(@class,"v-window")]//div[contains(@class,"popupContent")]';

export default class UBCalCourseExtractor {

    readonly #browser: Browser;
    readonly #page: Page;
    readonly #browserContext: BrowserContext;

    /**
     * 
     * @param browser The browser instance to add
     * @param page The page instance to add
     * @param context The browser context instance
     */
    private constructor(browser: Browser, page: Page, context: BrowserContext) {
        this.#browser = browser;
        this.#page = page;
        this.#browserContext = context;
    }

    /**
     * Initialises a new instance of UBCalCourseExtractor
     * @param path The path of the browser context
     */
    static async init(path: string, debug: boolean = false): Promise<UBCalCourseExtractor> {
        const browser = await firefox.launch({headless: !debug});
        const browserContext = await browser.newContext({storageState: path}); 
        const page = await browserContext.newPage();
        return new UBCalCourseExtractor(browser, page, browserContext);
    }

    /**
     * Get details of student
     * @returns A record with the student details
     */
    async studentDetails(): Promise<StudentDetails> {
        await this.#page.goto(generateURL('personal'));
        const rowSelector = "//table[contains(@role,'presentation')]//tr";
        const captionSelector = '//td[contains(@class, "v-formlayout-captioncell")]';
        const valueSelector = "//td[contains(@class, 'v-formlayout-contentcell')]";
        await this.#waitForPopup();
        await this.#page.waitForTimeout(5000);
        const rowElements = await this.#page.$$(rowSelector);
        
    
        let fullName: string = '';
        let birthDate: string = '';
        let email: string = '';
        for (const rowElement of rowElements) {
            const captionElement = await rowElement.$(captionSelector);
            const valueElement = await rowElement.$(valueSelector);
            let captionText = await captionElement?.textContent();
            const valueText = await valueElement?.textContent();
            if (captionText && valueText) {
                captionText = captionText.toLowerCase().trim();
                if (captionText === 'prénom et nom') {
                    fullName = valueText.trim();
                    continue;
                }
                if (captionText === 'email') {
                    email = valueText.trim();
                    continue;
                }
                if (captionText === 'date de naissance') {
                    birthDate = valueText.trim();
                    continue;
                }
            }
            if (fullName.length > 0 && birthDate.length > 0 && email.length > 0) {
                break;
            }
        }
        return <StudentDetails>{fullName, birthDate, email};
    }

    /**
     * Get the list of courses
     * @returns Get the list of courses
     */
    async courseDetails(): Promise<Course[]> {
        await this.#page.goto(generateURL("courses"));
        this.#page.waitForTimeout(100000);
        await this.#waitForPopup();
        await this.#closePopup();
        const inscriptionRowSelector = "(//div[contains(@class,'v-table-body-noselection')]/table[contains(@class, 'v-table-table')])[1]//tr[contains(@class,'v-table-row')]";
        await this.#page.waitForSelector(inscriptionRowSelector, {timeout: 10000});
        const inscriptionRowElements = await this.#page.$$(inscriptionRowSelector);
        const tableCellSelector = '//td[contains(@class,"v-table-cell-content")]';
        const semester = semesterNumber();
        const currentYear = new Date().getFullYear();
        let courseRowElements: ElementHandle<SVGElement | HTMLElement>[] = [];
        for (const inscriptionRowElement of inscriptionRowElements) {
            const tableCells = await inscriptionRowElement.$$(tableCellSelector);
            const years = (await tableCells[0]!.textContent())!.split('/');
            const year = +(years[semester]!);
            if (year === currentYear) {
                const button = await tableCells[2]?.$('//div[contains(@role,"button")]');
                await button?.click();
                await this.#waitForPopup();
                await this.#page.waitForTimeout(5000);
                courseRowElements = await this.#page.$$(`${POPUP_SELECTOR}//tr[contains(@class,"v-table-row")]`);
                break;
            } 
        }
        const studentCourseList: Course[] = [];
        for (const courseRowElement of courseRowElements) {
            await courseRowElement.scrollIntoViewIfNeeded();
            const courseRowColumns = await courseRowElement.$$('//td');
            const courseCode = await courseRowColumns[0]!.textContent();
            if (courseCode && courseCode.trim().endsWith('U')) {
                // If it ends with U it's a real course code
                studentCourseList.push({
                    code: courseCode.trim(),
                    name: (await courseRowColumns[1]!.textContent())!.trim()
                });
            }
        }
        return studentCourseList;
    }

    /**
     * Wait for the popup
     */
    async #waitForPopup() {
        await this.#page.waitForSelector(POPUP_SELECTOR);
    }

    /**
     * Close popup
     */
    async #closePopup() {
        await this.#page.click(`${POPUP_SELECTOR}//div[contains(@class,"v-window-contents")]//div[contains(@role,"button")]`)
    }

    /**
     * Close page and the browser
     */
    async close() {
        await this.#page.close();
        await this.#browserContext.close();
        await this.#browser.close();
    }


}

/**
 * Get the URL for the given module
 * @param module The name of the module to generate the URL for
 * @returns The URL for the related module
 */
function generateURL(module: 'personal'|'courses') {
    let suffix: string;
    switch(module) {
        case 'personal': 
            suffix = 'etatCivilView';
            break;
        case 'courses': 
            suffix = 'inscriptionsView'
            break;
        default:
            throw new Error(`Given mode ${module} is not supported`);
    }
    return `${URL}#!${suffix}`;
}


/**
 * Get the semester number from the current date
 * @returns The number of the current semester 1 for second semester 0 for the first semester 
 */
function semesterNumber(): 0|1 {
    const month  = new Date().getMonth();
    return month < 7 ? 1 : 0;
}

interface Course {
    code: string;
    name: string;
}

interface StudentDetails {
    fullName: string;
    email: string;
    birthDate: string;
}

